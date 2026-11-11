import { manageBlogDestination, BlogDestinationError } from "./hub-blog-destination";
import { isPublishableBlogIa, type BlogIaReadiness } from "./publishing-readiness";
import { reasonText, type BlogHubState } from "./hub-blog-state";

/**
 * Switch «Dónde publica tu cuenta» (Configuración): pasar entre el sitio 10MWS y BLOG IA
 * solo cuando el dueño lo pulsa y confirma. Nada aquí corre solo.
 *
 * Los artículos pendientes (lotes en cola) se mueven con el destino porque el worker
 * resuelve el destino al publicar. Lo que sí hay que cuidar es la categoría (las de BLOG IA
 * son source="blog", las de 10MWS no) y la pausa cuando no hay destino. Sin cambio de esquema,
 * el estado «en espera» se marca así: Run.status="halted" + Title.errorMessage con una marca,
 * mientras los títulos siguen en "pending". Nada se borra.
 */
export const PAUSED_MARK = "PAUSADO_SIN_DESTINO";
export const NEEDS_CATEGORY_MARK = "NECESITA_CATEGORIA";
const MARKS = [PAUSED_MARK, NEEDS_CATEGORY_MARK];

export class SwitchError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) {
    super(message);
  }
}

export type Target = "website" | "blog" | "none";
type Tx = any; // transacción compatible con Prisma (inyectable en pruebas)

type RunRow = { id: string; status: string; category: { source: string } | null; titles: { id: string; errorMessage: string | null }[] };

async function loadCandidateRuns(tx: Tx, userId: string): Promise<RunRow[]> {
  return tx.run.findMany({
    where: { userId, status: { in: ["pending", "halted"] } },
    select: { id: true, status: true, category: { select: { source: true } }, titles: { where: { status: "pending" }, select: { id: true, errorMessage: true } } },
  });
}
const isMarkedHalt = (r: RunRow) => r.status === "halted" && r.titles.some((t) => t.errorMessage && MARKS.includes(t.errorMessage));
const categoryFits = (r: RunRow, target: "website" | "blog") => (r.category?.source === "blog") === (target === "blog");

/** Cuántos artículos se moverían (para avisar antes de confirmar). */
export async function previewPending(db: Tx, userId: string, target: "website" | "blog") {
  const runs = (await loadCandidateRuns(db, userId)).filter((r) => (r.status === "pending" || isMarkedHalt(r)) && r.titles.length > 0);
  const fit = runs.filter((r) => categoryFits(r, target));
  return {
    toMove: fit.reduce((n, r) => n + r.titles.length, 0),
    needCategory: runs.filter((r) => !categoryFits(r, target)).reduce((n, r) => n + r.titles.length, 0),
  };
}

/** Lotes que esperan: sin destino o sin categoría. */
export async function waitingRuns(db: Tx, userId: string) {
  const runs = (await loadCandidateRuns(db, userId)).filter(isMarkedHalt);
  return runs.map((r) => ({
    runId: r.id,
    titles: r.titles.length,
    reason: r.titles.some((t) => t.errorMessage === NEEDS_CATEGORY_MARK) ? ("needs_category" as const) : ("paused" as const),
  }));
}

async function setRun(tx: Tx, run: RunRow, status: "pending" | "halted", mark: string | null) {
  if (run.status !== status) await tx.run.update({ where: { id: run.id }, data: status === "pending" ? { status, finishedAt: null } : { status } });
  await tx.title.updateMany({ where: { runId: run.id, status: "pending" }, data: { errorMessage: mark } });
}

/** Reasigna los pendientes al destino nuevo. Idempotente: repetirlo no cambia nada más. */
export async function relocatePending(tx: Tx, userId: string, target: Target, opts: { onlyMarked?: boolean } = {}) {
  const out = { moved: 0, needsCategory: 0, paused: 0 };
  for (const run of await loadCandidateRuns(tx, userId)) {
    if (run.titles.length === 0) continue;
    const marked = isMarkedHalt(run);
    if (opts.onlyMarked && !marked) continue;
    if (run.status !== "pending" && !marked) continue; // fallos reales no se tocan
    if (target === "none") {
      if (run.status === "pending") { await setRun(tx, run, "halted", PAUSED_MARK); out.paused += run.titles.length; }
      else out.paused += run.titles.length;
    } else if (categoryFits(run, target)) {
      await setRun(tx, run, "pending", null);
      out.moved += run.titles.length;
    } else {
      await setRun(tx, run, "halted", NEEDS_CATEGORY_MARK);
      out.needsCategory += run.titles.length;
    }
  }
  return out;
}

async function websiteAvailable(tx: Tx, userId: string) {
  const [credential, mcp] = await Promise.all([
    tx.credential.findUnique({ where: { userId_platform: { userId, platform: "10minutesWebsite" } }, select: { userId: true } }),
    tx.mcpConnection.findFirst({ where: { userId, revokedAt: null }, select: { id: true } }),
  ]);
  return Boolean(credential || mcp);
}

type HistoryEntry = { at: string; actorUserId: string; from: string; to: string; moved: number; needsCategory: number; paused: number; requestId: string | null };
async function appendHistory(tx: Tx, userId: string, entry: HistoryEntry) {
  const key = `destination-history:${userId}`;
  const row = await tx.systemSetting.findUnique({ where: { key } });
  let list: HistoryEntry[] = [];
  try { list = row ? JSON.parse(row.encryptedValue) : []; } catch { list = []; }
  list = [...list, entry].slice(-100); // sin secretos: solo quién, cuándo y de dónde a dónde
  const value = JSON.stringify(list);
  await tx.systemSetting.upsert({ where: { key }, create: { key, encryptedValue: value }, update: { encryptedValue: value } });
}

async function ensureNoRunning(tx: Tx, userId: string) {
  if ((await tx.run.count({ where: { userId, status: "running" } })) > 0) {
    throw new SwitchError("runs_in_progress", 409, "Tienes publicaciones en curso. Espera a que terminen y vuelve a intentarlo.");
  }
}
const prevMethod = (blog: { config?: any } | null) => {
  const m = blog?.config?.hubLink?.previous_method;
  return m === "MCP" ? "MCP" : "BROWSER";
};
const TX_OPTS = { isolationLevel: "Serializable" } as const;

/** 10MWS (o ningún destino) → BLOG IA. Usa el contrato del Hub y expected_revision; mueve los pendientes en la misma transacción. */
export async function useBlog(db: Tx, p: { userId: string; state: BlogHubState; expectedRevision: string; requestId?: string }) {
  const { state } = p;
  if (state.state !== "blog_ready" || !state.destination) throw new SwitchError("blog_not_ready", 409, "Tu blog todavía no está listo para publicar.");
  return db.$transaction(async (tx: Tx) => {
    await ensureNoRunning(tx, p.userId);
    const user = await tx.user.findUnique({ where: { id: p.userId }, select: { hubUserId: true, publishMethod: true } });
    if (!user?.hubUserId) throw new SwitchError("native_account_required", 409, "Tu cuenta aún no está vinculada con el Hub.");
    const view = await manageBlogDestination({ $transaction: (fn: (t: Tx) => unknown) => fn(tx) }, {
      ...state.destination!, hub_user_id: user.hubUserId, operation: "select", expected_revision: p.expectedRevision, confirm: true,
    } as never);
    const moved = await relocatePending(tx, p.userId, "blog");
    if (user.publishMethod !== "BLOG") {
      await appendHistory(tx, p.userId, { at: new Date().toISOString(), actorUserId: p.userId, from: user.publishMethod, to: "BLOG", ...moved, requestId: p.requestId ?? null });
    }
    return { changed: user.publishMethod !== "BLOG", hostname: view.current_hostname as string | null, ...moved };
  }, TX_OPTS);
}

/** BLOG IA → destino anterior. No usa `suspend`; no toca el blog ni borra nada. */
export async function useWebsite(db: Tx, p: { userId: string; requestId?: string }) {
  return db.$transaction(async (tx: Tx) => {
    const user = await tx.user.findUnique({ where: { id: p.userId }, select: { publishMethod: true } });
    if (!user) throw new SwitchError("no_user", 404, "No encontramos tu cuenta.");
    if (user.publishMethod !== "BLOG") return { changed: false, method: user.publishMethod as string, moved: 0, needsCategory: 0, paused: 0 };
    await ensureNoRunning(tx, p.userId);
    if (!(await websiteAvailable(tx, p.userId))) throw new SwitchError("website_not_connected", 409, "Todavía no conectaste tu sitio 10MWS. Conéctalo primero y vuelve a intentarlo.");
    const blog = await tx.blogIaBlog.findUnique({ where: { userId: p.userId } });
    const method = prevMethod(blog);
    const res = await tx.user.updateMany({ where: { id: p.userId, publishMethod: "BLOG" }, data: { publishMethod: method } });
    if (res.count !== 1) throw new SwitchError("destination_changed", 409, "Algo cambió, vuelve a intentar.");
    const moved = await relocatePending(tx, p.userId, "website");
    await appendHistory(tx, p.userId, { at: new Date().toISOString(), actorUserId: p.userId, from: "BLOG", to: method, ...moved, requestId: p.requestId ?? null });
    return { changed: true, method, ...moved };
  }, TX_OPTS);
}

/** Desconectar BLOG IA sin sitio 10MWS: la cuenta queda sin destino y los pendientes en pausa (no se borran). */
export async function disconnectBlog(db: Tx, p: { userId: string; requestId?: string }) {
  return db.$transaction(async (tx: Tx) => {
    const user = await tx.user.findUnique({ where: { id: p.userId }, select: { publishMethod: true } });
    if (!user) throw new SwitchError("no_user", 404, "No encontramos tu cuenta.");
    if (user.publishMethod !== "BLOG") return { changed: false, moved: 0, needsCategory: 0, paused: 0 };
    await ensureNoRunning(tx, p.userId);
    if (await websiteAvailable(tx, p.userId)) throw new SwitchError("use_website_instead", 409, "Tienes un sitio 10MWS conectado: usa «Volver a mi sitio 10MWS».");
    const res = await tx.user.updateMany({ where: { id: p.userId, publishMethod: "BLOG" }, data: { publishMethod: "BROWSER" } });
    if (res.count !== 1) throw new SwitchError("destination_changed", 409, "Algo cambió, vuelve a intentar.");
    const moved = await relocatePending(tx, p.userId, "none");
    await appendHistory(tx, p.userId, { at: new Date().toISOString(), actorUserId: p.userId, from: "BLOG", to: "NONE", ...moved, requestId: p.requestId ?? null });
    return { changed: true, ...moved };
  }, TX_OPTS);
}

/** Al conectar un destino los lotes en pausa se reanudan. Solo toca lotes marcados por este switch. */
export async function resumePausedRuns(db: Tx, userId: string) {
  return db.$transaction(async (tx: Tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { publishMethod: true } });
    if (!user) return { moved: 0, needsCategory: 0, paused: 0 };
    let target: Target = "none";
    if (user.publishMethod === "BLOG") {
      const blog = await tx.blogIaBlog.findUnique({ where: { userId } });
      target = isPublishableBlogIa(blog as BlogIaReadiness | null) ? "blog" : "none";
    } else if (await websiteAvailable(tx, userId)) target = "website";
    if (target === "none") return { moved: 0, needsCategory: 0, paused: 0 };
    return relocatePending(tx, userId, target, { onlyMarked: true });
  }, TX_OPTS);
}

/** La persona elige una categoría válida para un lote que quedó «necesita categoría». */
export async function chooseCategory(db: Tx, p: { userId: string; runId: string; categoryId: string }) {
  return db.$transaction(async (tx: Tx) => {
    const user = await tx.user.findUnique({ where: { id: p.userId }, select: { publishMethod: true } });
    const target: "blog" | "website" = user?.publishMethod === "BLOG" ? "blog" : "website";
    if (target === "website" && !(await websiteAvailable(tx, p.userId))) throw new SwitchError("no_destination", 409, "Primero conecta un destino de publicación.");
    const run = (await loadCandidateRuns(tx, p.userId)).find((r) => r.id === p.runId);
    if (!run || !isMarkedHalt(run)) throw new SwitchError("run_not_waiting", 404, "Ese lote ya no está esperando una categoría.");
    const category = await tx.category.findFirst({ where: { id: p.categoryId, userId: p.userId }, select: { id: true, source: true } });
    if (!category || (category.source === "blog") !== (target === "blog")) throw new SwitchError("invalid_category", 400, "Elige una categoría de tu destino actual.");
    await tx.run.update({ where: { id: run.id }, data: { categoryId: category.id } });
    await setRun(tx, run, "pending", null);
    return { ok: true };
  }, TX_OPTS);
}

export function friendlyError(e: unknown): { status: number; error: string; code: string } | null {
  if (e instanceof SwitchError) return { status: e.status, error: e.message, code: e.code };
  if (e instanceof BlogDestinationError) {
    if (e.code === "destination_changed" || e.code === "destination_conflict") return { status: 409, error: "Algo cambió, vuelve a intentar.", code: "destination_changed" };
    return { status: e.status, error: "No pudimos validar tu blog. Intenta de nuevo en un momento.", code: e.code };
  }
  if (e && typeof e === "object" && "code" in e && ["P2002", "P2034"].includes(String((e as { code: unknown }).code))) return { status: 409, error: "Algo cambió, vuelve a intentar.", code: "destination_changed" };
  return null;
}

/* ------------------------------ Vista de la pantalla ------------------------------ */

export type ActionKind = "switch_to_blog" | "open_launch" | "open_landing" | "switch_to_website" | "disconnect" | "connect_website" | "retry";
export type ViewAction = { kind: ActionKind; label: string; url?: string; disabled: boolean; reason?: string; confirm?: string };
export type DestinationViewInput = {
  publishMethod: string;
  hasWebsite: boolean;
  siteName: string | null;
  blog: (BlogIaReadiness & { config?: unknown }) | null;
  hub: { ok: true; state: BlogHubState } | { ok: false };
  isOwner: boolean;
  revision: string;
  pending: { toMove: number; needCategory: number };
};
export function deriveView(i: DestinationViewInput) {
  const suspended = i.publishMethod === "BLOG" && i.blog?.status === "suspended";
  const onBlog = i.publishMethod === "BLOG" && !suspended;
  const kind: "website" | "blog" | "none" = onBlog ? "blog" : i.publishMethod !== "BLOG" && i.hasWebsite ? "website" : "none";
  const label = kind === "blog" ? `BLOG IA: ${i.blog?.hostname ?? ""}`.trim() : kind === "website" ? `10MWS: ${i.siteName ?? "tu sitio"}` : "Ningún destino";
  const OWNER_ONLY = "Solo el dueño de la cuenta puede cambiar el destino.";
  const change = (a: Omit<ViewAction, "disabled">, off = false, why?: string): ViewAction => ({ ...a, disabled: !i.isOwner || off, reason: !i.isOwner ? OWNER_ONLY : off ? why : undefined });
  const actions: ViewAction[] = [];
  let caseId: string;
  let notice: string | null = null;
  const movingText = (n: number) => (n > 0 ? `Se moverán ${n} ${n === 1 ? "artículo programado" : "artículos programados"} a tu blog.` : "No hay artículos programados que mover.");

  const hubActions = (): void => {
    if (!i.hub.ok) {
      caseId = "G";
      notice = "No pudimos consultar BLOG IA ahora. Intenta de nuevo.";
      actions.push({ kind: "retry", label: "Reintentar", disabled: false });
      return;
    }
    const s = i.hub.state;
    if (s.state === "blog_ready") {
      caseId = kind === "none" ? "F" : "A";
      const host = s.hostname ?? "";
      actions.push(change({ kind: "switch_to_blog", label: `Pasar a mi blog de BLOG IA (${host})`, confirm: `${movingText(i.pending.toMove)}${i.pending.needCategory ? ` ${i.pending.needCategory} necesitarán que elijas una categoría.` : ""} Los artículos ya publicados no se tocan.` }));
    } else if (s.state === "no_blog") {
      caseId = kind === "none" ? "F" : "B";
      notice = "Ya tienes BLOG IA. Crea tu blog para poder publicar allí.";
      actions.push({ kind: "open_launch", label: "Crear mi blog en BLOG IA", url: s.launchUrl, disabled: false });
    } else if (s.state === "blog_pending") {
      caseId = kind === "none" ? "F" : "C";
      notice = `Tu blog está casi listo. ${reasonText(s.reason) ?? "Falta confirmar tu dominio en BLOG IA."}`;
      actions.push({ kind: "open_launch", label: "Abrir BLOG IA", url: s.launchUrl, disabled: false });
    } else {
      caseId = kind === "none" ? "F" : "D";
      notice = "BLOG IA te permite publicar en un blog propio con tu marca. Primero necesitas adquirirlo.";
      actions.push({ kind: "open_landing", label: "Conocer BLOG IA", url: s.landingUrl, disabled: false });
    }
  };

  caseId = "F";
  if (kind === "blog") {
    caseId = "E";
    notice = `Conectado con BLOG IA · ${i.blog?.hostname ?? ""}`.trim();
    if (i.hasWebsite) actions.push(change({ kind: "switch_to_website", label: "Volver a mi sitio 10MWS", confirm: `${i.pending.toMove ? `Se moverán ${i.pending.toMove} artículos programados a tu sitio 10MWS. ` : ""}Los artículos ya publicados no se tocan.` }));
    else actions.push(change({ kind: "disconnect", label: "Desconectar BLOG IA", confirm: "Tus artículos no se publicarán hasta que conectes un destino. Los programados quedan en pausa y no se borran." }));
  } else {
    hubActions();
    if (kind === "none") {
      if (suspended) {
        notice = "El acceso a tu BLOG IA está suspendido. " + (notice ?? "");
        if (i.hasWebsite) actions.push(change({ kind: "switch_to_website", label: "Volver a mi sitio 10MWS", confirm: "Se moverán tus artículos programados a tu sitio 10MWS." }));
      } else if (i.hasWebsite) {
        actions.push({ kind: "connect_website", label: "Conectar mi sitio 10MWS", disabled: false });
      }
    }
  }
  return { current: { kind, label, hostname: i.blog?.hostname ?? null, suspended }, caseId: caseId!, notice, actions, revision: i.revision, isOwner: i.isOwner, pausedNotice: kind === "none" ? "Tus artículos no se publicarán hasta que conectes un destino." : null };
}
