// BORRADOR (Claude, 2026-10-21) — destino: apps/web/src/lib/blog-ia-wizard.ts
// Núcleo del wizard de BLOG IA. Sin imports de Prisma ni de Next: todo entra por
// dependencias inyectadas (store, sender, dns, tls) para probarlo sin red ni
// base de datos. Diseño: DISENO_WIZARD_BLOG_IA_FASE_2.md (.claude_shared).

export type BlogStatus = "draft_setup" | "pending_dns" | "pending_tls" | "active" | "suspended" | "deactivated" | "domain_error";

export interface WizardConfig {
  siteUrl?: string;
  name?: string;
  accentColor?: string;
  language?: string;
  whatsapp?: string; // solo dígitos con código de país
  tagline?: string;
  /** Logo del cliente (https). */
  logoUrl?: string;
  /** Menú del encabezado y enlaces del pie (enlaces https del cliente). */
  nav?: LinkItem[];
  footerLinks?: LinkItem[];
  confirmedAt?: string;
}

export interface LinkItem {
  label: string;
  href: string;
}

export interface BlogRecord {
  userId: string;
  tenantId: string;
  hostname: string | null;
  status: BlogStatus;
  config: WizardConfig | null;
  provisionedAt: Date | null;
  dnsVerified: boolean;
  tlsReady: boolean;
  activatedAt: Date | null;
  lastError: string | null;
}

export type BlogPatch = Partial<Omit<BlogRecord, "userId" | "tenantId">>;

export interface WizardStore {
  get(userId: string): Promise<BlogRecord | null>;
  /** Idempotente: si ya existe, devuelve el existente (carrera entre dos peticiones). */
  create(userId: string, tenantId: string): Promise<BlogRecord>;
  update(userId: string, patch: BlogPatch): Promise<BlogRecord>;
  /** userId del dueño actual del hostname, o null. */
  hostnameOwner(hostname: string): Promise<string | null>;
  /** Activación atómica: status active + User.publishMethod = BLOG. */
  activate(userId: string, at: Date): Promise<BlogRecord>;
}

export interface BlogIaEventOut {
  eventId: string;
  type: string;
  tenantId: string;
  data: Record<string, unknown>;
}

export class SendError extends Error {
  constructor(message: string, public readonly retryable: boolean, public readonly status = 0) {
    super(message);
  }
}

export interface WizardDeps {
  store: WizardStore;
  /** Envía un evento firmado al Worker. Lanza SendError. */
  send: (event: BlogIaEventOut) => Promise<void>;
  /** CNAME actual del hostname (lista, posiblemente vacía); lanza si la consulta falló. */
  resolveCname: (hostname: string) => Promise<string[]>;
  /** true si https://hostname responde con certificado válido. */
  probeTls: (hostname: string) => Promise<boolean>;
  /** Destino DNS esperado (BLOG_IA_CNAME_TARGET) o null si no está configurado. */
  cnameTarget: string | null;
  /** ¿Están BLOG_IA_API_URL y BLOG_IA_SECRET? */
  apiConfigured: boolean;
  now: () => Date;
  hash: (text: string) => string;
}

export interface Actor {
  userId: string | null;
  role?: string | null;
  /** disabledModules en bruto del usuario. */
  disabledModules?: string | null;
  /** ¿Tiene derecho vigente a ARTICULOS? */
  articulosAllowed: boolean;
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string; retryable?: boolean };

const fail = (status: number, error: string, retryable = false): { ok: false; status: number; error: string; retryable: boolean } => ({ ok: false, status, error, retryable });

/** Marca que recibe el blog a partir de lo que capturó el wizard. */
export function brandOf(c: WizardConfig) {
  return {
    name: c.name, logoUrl: c.logoUrl, accentColor: c.accentColor, whatsapp: c.whatsapp, tagline: c.tagline, mainSiteUrl: c.siteUrl,
    nav: c.nav ?? [],
    footer: c.footerLinks && c.footerLinks.length > 0 ? [{ title: c.name ?? "", links: c.footerLinks }] : [],
  };
}

// ---------------------------------------------------------------- permisos

export const BLOG_IA_MODULE_ID = "blog-ia";

function moduleEnabled(raw?: string | null): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return !!parsed && !Array.isArray(parsed) && typeof parsed === "object" && (parsed as Record<string, unknown>)[BLOG_IA_MODULE_ID] === "enabled";
  } catch {
    return false;
  }
}

/** Resuelve el userId de trabajo. Siempre la sesión; nunca ids del cuerpo. */
export function authorize(actor: Actor): Result<string> {
  if (!actor.userId) return fail(401, "No autorizado");
  const isAdmin = actor.role === "admin";
  if (!isAdmin && !moduleEnabled(actor.disabledModules)) return fail(403, "BLOG IA todavía no está habilitado para tu cuenta.");
  if (!isAdmin && !actor.articulosAllowed) return fail(403, "Tu cuenta no tiene acceso al producto ARTICULOS.");
  return { ok: true, value: actor.userId };
}

/** Lectura de otra cuenta: solo administradores. Escribir nunca. */
export function authorizeRead(actor: Actor, targetUserId?: string | null): Result<string> {
  const base = authorize(actor);
  if (!base.ok) return base;
  if (!targetUserId || targetUserId === base.value) return base;
  if (actor.role !== "admin") return fail(403, "No puedes ver el BLOG IA de otra cuenta.");
  return { ok: true, value: targetUserId };
}

// ------------------------------------------------------------- validaciones

const PLATFORM_DOMAINS = ["lasolucionweb.com", "lasolucionweb.net", "10minuteswebsite.com", "10minuteswebsite.net", "10minuteswebsite.site", "tagcrush.com"];
const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export function validateHostname(raw: unknown): Result<string> {
  if (typeof raw !== "string" || !raw.trim()) return fail(400, "Escribe el subdominio de tu blog, por ejemplo blog.tuempresa.com.");
  const host = raw.trim().toLowerCase();
  if (/[/:?#@\s]/.test(host)) return fail(400, "Escribe solo el nombre del dominio, sin https://, rutas ni puerto.");
  if (host.length > 253) return fail(400, "El dominio es demasiado largo.");
  const labels = host.split(".");
  if (labels.some((l) => !LABEL.test(l))) return fail(400, "El dominio tiene caracteres no permitidos.");
  if (/^\d+(\.\d+){3}$/.test(host) || host === "localhost" || host.endsWith(".localhost")) return fail(400, "Usa un nombre de dominio, no una dirección IP.");
  if (labels.length < 3) return fail(400, "Usa un subdominio como blog.tuempresa.com; un dominio raíz no se puede conectar.");
  if (!/^[a-z]{2,}$/.test(labels[labels.length - 1])) return fail(400, "La terminación del dominio no es válida.");
  if (PLATFORM_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) return fail(400, "Ese dominio pertenece a la plataforma; usa uno propio.");
  return { ok: true, value: host };
}

export function validateConfig(input: unknown, previous: WizardConfig | null): Result<WizardConfig> {
  if (!input || typeof input !== "object") return fail(400, "Datos inválidos.");
  const i = input as Record<string, unknown>;
  const next: WizardConfig = { ...(previous ?? {}) };
  for (const [key, max, label] of [["name", 80, "El nombre comercial"], ["tagline", 160, "El eslogan"]] as const) {
    if (i[key] === undefined) continue;
    if (typeof i[key] !== "string" || (i[key] as string).trim().length > max) return fail(400, `${label} no es válido (máximo ${max} caracteres).`);
    next[key] = (i[key] as string).trim();
  }
  if (i.siteUrl !== undefined) {
    let url: URL;
    try { url = new URL(String(i.siteUrl).trim()); } catch { return fail(400, "La dirección del sitio no es válida."); }
    if (url.protocol !== "https:") return fail(400, "La dirección del sitio debe empezar con https://.");
    next.siteUrl = url.origin + (url.pathname === "/" ? "" : url.pathname);
  }
  if (i.logoUrl !== undefined) {
    if (i.logoUrl === "" || i.logoUrl === null) delete next.logoUrl;
    else {
      let logo: URL;
      try { logo = new URL(String(i.logoUrl).trim()); } catch { return fail(400, "La dirección del logo no es válida."); }
      if (logo.protocol !== "https:") return fail(400, "La dirección del logo debe empezar con https://.");
      next.logoUrl = logo.toString();
    }
  }
  if (i.accentColor !== undefined) {
    if (typeof i.accentColor !== "string" || !/^#[0-9a-fA-F]{6}$/.test(i.accentColor)) return fail(400, "El color debe tener el formato #RRGGBB.");
    next.accentColor = i.accentColor.toLowerCase();
  }
  if (i.language !== undefined) {
    if (typeof i.language !== "string" || !/^[a-z]{2}(-[A-Z]{2})?$/.test(i.language)) return fail(400, "El idioma no es válido.");
    next.language = i.language;
  }
  if (i.whatsapp !== undefined) {
    if (i.whatsapp === "" || i.whatsapp === null) delete next.whatsapp;
    else {
      const raw = String(i.whatsapp).trim();
      if (!raw.startsWith("+") && !raw.startsWith("00")) return fail(400, "El WhatsApp debe incluir el código de país, por ejemplo +57300…");
      const digits = raw.replace(/\D/g, "");
      const d = raw.startsWith("00") ? digits.slice(2) : digits;
      if (!/^[1-9][0-9]{7,14}$/.test(d)) return fail(400, "El número de WhatsApp no es válido.");
      next.whatsapp = d;
    }
  }
  for (const [key, max, label] of [["nav", 8, "El menú"], ["footerLinks", 10, "Los enlaces del pie"]] as const) {
    if (i[key] === undefined) continue;
    if (!Array.isArray(i[key]) || (i[key] as unknown[]).length > max) return fail(400, `${label} admite hasta ${max} enlaces.`);
    const items: LinkItem[] = [];
    for (const raw of i[key] as unknown[]) {
      const r = raw as { label?: unknown; href?: unknown };
      const text = typeof r?.label === "string" ? r.label.trim() : "";
      if (!text || text.length > 40) return fail(400, `${label}: cada enlace necesita un texto de hasta 40 caracteres.`);
      let url: URL;
      try { url = new URL(String(r?.href ?? "").trim()); } catch { return fail(400, `${label}: «${text}» no tiene una dirección válida.`); }
      if (url.protocol !== "https:") return fail(400, `${label}: «${text}» debe empezar con https://.`);
      items.push({ label: text, href: url.toString() });
    }
    next[key] = items;
  }
  if (i.confirm === true) {
    if (!next.name || !next.language) return fail(400, "Antes de confirmar falta el nombre comercial y el idioma.");
    next.confirmedAt = "pending"; // saveConfig lo sustituye por la hora real
  }
  return { ok: true, value: next };
}

// ------------------------------------------------------------------ vista

export type Stage = "not_started" | "brand" | "domain" | "dns" | "tls" | "ready_to_activate" | "active" | "suspended" | "deactivated" | "error";

export interface WizardView {
  exists: boolean;
  status: BlogStatus | "not_configured";
  stage: Stage;
  config: WizardConfig;
  hostname: string | null;
  dns: { type: "CNAME"; host: string; target: string } | null;
  publicUrl: string | null;
  message: string;
  lastError: string | null;
  available: boolean; // false si falta configuración del servidor
}

export function tenantIdFor(userId: string): string {
  return `t_${userId}`;
}

export function toView(rec: BlogRecord | null, deps: Pick<WizardDeps, "cnameTarget" | "apiConfigured">): WizardView {
  const available = deps.apiConfigured && !!deps.cnameTarget;
  if (!rec) return { exists: false, status: "not_configured", stage: "not_started", config: {}, hostname: null, dns: null, publicUrl: null, message: "Tu blog inteligente, sin cambiar tu página web.", lastError: null, available };
  const config = rec.config ?? {};
  const dns = rec.hostname && deps.cnameTarget ? { type: "CNAME" as const, host: rec.hostname, target: deps.cnameTarget } : null;
  let stage: Stage;
  let message: string;
  if (rec.status === "active") { stage = "active"; message = "Tu blog está activo."; }
  else if (rec.status === "deactivated") { stage = "deactivated"; message = "Desactivaste tu blog. Tu contenido se conserva y puedes reactivarlo cuando quieras."; }
  else if (rec.status === "suspended") { stage = "suspended"; message = "Tu blog está temporalmente fuera de servicio. Se reactiva al renovar tu acceso."; }
  else if (rec.status === "domain_error") { stage = "error"; message = "El registro DNS apunta a otro destino. Corrígelo y vuelve a verificar."; }
  else if (!config.confirmedAt) { stage = "brand"; message = "Completa y confirma los datos de tu marca."; }
  else if (!rec.hostname) { stage = "domain"; message = "Elige el subdominio de tu blog."; }
  else if (rec.dnsVerified && rec.tlsReady) { stage = "ready_to_activate"; message = "Todo listo. Activa tu blog."; }
  else if (rec.dnsVerified) { stage = "tls"; message = "El dominio apunta bien. El certificado HTTPS está en proceso."; }
  else { stage = "dns"; message = "El registro todavía no apunta al destino indicado. Los cambios de DNS pueden tardar en propagarse."; }
  return {
    exists: true, status: rec.status, stage, config, hostname: rec.hostname, dns,
    publicUrl: rec.hostname && rec.status === "active" ? `https://${rec.hostname}` : null,
    message, lastError: rec.lastError, available,
  };
}

// ------------------------------------------------------------- operaciones

async function trySend(deps: WizardDeps, userId: string, event: BlogIaEventOut): Promise<Result<null>> {
  try {
    await deps.send(event);
    return { ok: true, value: null };
  } catch (e) {
    const err = e instanceof SendError ? e : new SendError(e instanceof Error ? e.message : String(e), true);
    await deps.store.update(userId, { lastError: err.message });
    return err.retryable
      ? fail(502, "BLOG IA no respondió. Tus datos quedaron guardados; vuelve a intentarlo en un momento.", true)
      : fail(err.status === 409 ? 409 : 422, err.message);
  }
}

/** Crear o continuar. Idempotente. */
export async function ensureBlog(deps: WizardDeps, userId: string): Promise<BlogRecord> {
  return (await deps.store.get(userId)) ?? deps.store.create(userId, tenantIdFor(userId));
}

export async function getState(deps: WizardDeps, userId: string): Promise<WizardView> {
  return toView(await deps.store.get(userId), deps);
}

async function ensureProvisioned(deps: WizardDeps, rec: BlogRecord): Promise<Result<BlogRecord>> {
  if (rec.provisionedAt || !rec.hostname) return { ok: true, value: rec };
  if (!deps.apiConfigured) return fail(503, "La conexión con BLOG IA todavía no está disponible en el servidor.");
  const c = rec.config ?? {};
  const sent = await trySend(deps, rec.userId, {
    eventId: `provision:${rec.userId}`, type: "blog.provision", tenantId: rec.tenantId,
    data: {
      seo_total_account_id: rec.userId, hostname: rec.hostname, site_url: c.siteUrl, language: c.language ?? "es",
      brand: brandOf(c),
    },
  });
  if (!sent.ok) return sent;
  return { ok: true, value: await deps.store.update(rec.userId, { provisionedAt: deps.now(), lastError: null }) };
}

export async function saveConfig(deps: WizardDeps, userId: string, input: unknown): Promise<Result<WizardView>> {
  const rec = await ensureBlog(deps, userId);
  if (rec.status === "suspended") return fail(409, "Tu blog está suspendido; no se puede modificar ahora.");
  const v = validateConfig(input, rec.config);
  if (!v.ok) return v;
  const config = v.value;
  config.confirmedAt = config.confirmedAt === "pending" ? deps.now().toISOString() : rec.config?.confirmedAt;
  if (!config.confirmedAt) delete config.confirmedAt;
  let saved = await deps.store.update(userId, { config, lastError: null });
  if (saved.provisionedAt) {
    const sent = await trySend(deps, userId, {
      eventId: `settings:${userId}:${deps.hash(JSON.stringify(config))}`, type: "blog.settings.update", tenantId: saved.tenantId,
      data: { language: config.language, site_url: config.siteUrl, brand: brandOf(config) },
    });
    if (!sent.ok) return sent;
    saved = (await deps.store.get(userId)) ?? saved;
  }
  return { ok: true, value: toView(saved, deps) };
}

export async function saveDomain(deps: WizardDeps, userId: string, rawHostname: unknown): Promise<Result<WizardView>> {
  const rec = await ensureBlog(deps, userId);
  if (rec.status === "suspended" || rec.status === "deactivated") return fail(409, "Tu blog está fuera de servicio; reactívalo antes de cambiar el dominio.");
  if (!rec.config?.confirmedAt) return fail(409, "Primero completa y confirma los datos de tu marca.");
  const h = validateHostname(rawHostname);
  if (!h.ok) return h;
  const owner = await deps.store.hostnameOwner(h.value);
  if (owner && owner !== userId) return fail(409, "Ese dominio ya está en uso por otra cuenta.");
  const changed = rec.hostname !== h.value;
  let cur = await deps.store.update(userId, changed
    ? { hostname: h.value, dnsVerified: false, tlsReady: false, status: rec.status === "active" ? "active" : "pending_dns", lastError: null }
    : { lastError: null });
  if (!cur.provisionedAt) {
    const p = await ensureProvisioned(deps, cur);
    if (!p.ok) return p;
    cur = p.value;
  } else if (changed) {
    const sent = await trySend(deps, userId, {
      eventId: `domain:${userId}:${h.value}:pending:pending`, type: "blog.domain.change", tenantId: cur.tenantId,
      data: { hostname: h.value, verification_status: "pending", tls_status: "pending", make_primary: true },
    });
    if (!sent.ok) return sent;
  }
  return { ok: true, value: toView(cur, deps) };
}

export async function verifyDomain(deps: WizardDeps, userId: string): Promise<Result<WizardView>> {
  const rec = await deps.store.get(userId);
  if (!rec || !rec.hostname) return fail(409, "Primero elige el dominio de tu blog.");
  if (rec.status === "suspended") return fail(409, "Tu blog está suspendido.");
  if (!deps.cnameTarget) return fail(503, "La verificación de dominios todavía no está disponible en el servidor.");
  const prov = await ensureProvisioned(deps, rec);
  if (!prov.ok) return prov;

  let cnames: string[];
  try {
    cnames = (await deps.resolveCname(rec.hostname)).map((c) => c.toLowerCase().replace(/\.$/, ""));
  } catch {
    return fail(502, "No pudimos consultar el DNS en este momento. Inténtalo de nuevo en un minuto.", true);
  }
  const target = deps.cnameTarget.toLowerCase().replace(/\.$/, "");
  const wasActive = rec.status === "active";
  let dns = false, tls = false, status: BlogStatus = wasActive ? "active" : "pending_dns";
  let message: string | null = null;
  if (cnames.includes(target)) {
    dns = true;
    try { tls = await deps.probeTls(rec.hostname); } catch { tls = false; }
    if (!wasActive) status = "pending_tls";
  } else if (cnames.length > 0) {
    if (!wasActive) status = "domain_error";
    message = `El registro apunta a ${cnames[0]} y debe apuntar a ${deps.cnameTarget}.`;
  }
  const saved = await deps.store.update(userId, { dnsVerified: dns, tlsReady: dns && tls, status, lastError: message });
  const sent = await trySend(deps, userId, {
    eventId: `domain:${userId}:${rec.hostname}:${dns ? "verified" : "pending"}:${dns && tls ? "ready" : "pending"}`,
    type: "blog.domain.change", tenantId: saved.tenantId,
    data: { hostname: rec.hostname, verification_status: dns ? "verified" : "pending", tls_status: dns && tls ? "ready" : "pending", make_primary: true },
  });
  if (!sent.ok) return sent;
  return { ok: true, value: toView((await deps.store.get(userId)) ?? saved, deps) };
}

export async function activate(deps: WizardDeps, userId: string, articulosAllowed: boolean): Promise<Result<WizardView>> {
  const rec = await deps.store.get(userId);
  if (!rec) return fail(409, "Primero configura tu BLOG IA.");
  if (rec.status === "active") return { ok: true, value: toView(rec, deps) }; // idempotente
  if (rec.status === "suspended") return fail(409, "Tu blog está suspendido.");
  if (!articulosAllowed) return fail(403, "Tu cuenta no tiene acceso vigente para activar BLOG IA.");
  if (!rec.config?.confirmedAt) return fail(409, "Falta confirmar los datos de tu marca.");
  if (!rec.hostname || !rec.dnsVerified || !rec.tlsReady) return fail(409, "El dominio y el certificado HTTPS todavía no están listos.");
  if (!rec.provisionedAt) return fail(409, "BLOG IA aún no confirmó el alta del blog; verifica de nuevo.");
  return { ok: true, value: toView(await deps.store.activate(userId, deps.now()), deps) };
}

/**
 * Desactivar por decisión de la persona: el blog pasa a «fuera de servicio» (503),
 * el contenido se CONSERVA y las publicaciones se detienen hasta reactivar. NO se
 * toca el método de publicación de la cuenta (decisión de Milton, 2026-10-21).
 * Idempotente: repetir reenvía el mismo evento de suspensión.
 */
export async function deactivate(deps: WizardDeps, userId: string): Promise<Result<WizardView>> {
  const rec = await deps.store.get(userId);
  if (!rec || (rec.status !== "active" && rec.status !== "deactivated")) return fail(409, "Tu blog no está activo.");
  if (!deps.apiConfigured) return fail(503, "La conexión con BLOG IA todavía no está disponible en el servidor.");
  const cur = rec.status === "deactivated" ? rec : await deps.store.update(userId, { status: "deactivated", lastError: null });
  const sent = await trySend(deps, userId, {
    eventId: `deactivate:${userId}:${(rec.activatedAt ?? deps.now()).getTime()}`,
    type: "blog.subscription.suspend", tenantId: cur.tenantId,
    data: { source: "user_deactivation", user_id: userId },
  });
  if (!sent.ok) return sent;
  return { ok: true, value: toView((await deps.store.get(userId)) ?? cur, deps) };
}

/** Reactivar un blog desactivado: exige acceso vigente y dominio todavía verificado. */
export async function reactivate(deps: WizardDeps, userId: string, articulosAllowed: boolean): Promise<Result<WizardView>> {
  const rec = await deps.store.get(userId);
  if (!rec || rec.status !== "deactivated") return fail(409, "Tu blog no está desactivado.");
  if (!articulosAllowed) return fail(403, "Tu cuenta no tiene acceso vigente para reactivar BLOG IA.");
  if (!rec.hostname || !rec.dnsVerified || !rec.tlsReady) return fail(409, "El dominio ya no está verificado; vuelve a conectarlo.");
  if (!deps.apiConfigured) return fail(503, "La conexión con BLOG IA todavía no está disponible en el servidor.");
  const sent = await trySend(deps, userId, {
    eventId: `reactivate:${userId}:${deps.now().getTime()}`,
    type: "blog.subscription.resume", tenantId: rec.tenantId,
    data: { source: "user_reactivation", user_id: userId },
  });
  if (!sent.ok) return sent;
  const saved = await deps.store.update(userId, { status: "active", lastError: null });
  return { ok: true, value: toView(saved, deps) };
}
