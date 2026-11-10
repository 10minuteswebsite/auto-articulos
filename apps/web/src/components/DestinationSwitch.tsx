"use client";

import { useCallback, useEffect, useState } from "react";

type Action = { kind: string; label: string; url?: string; disabled: boolean; reason?: string; confirm?: string };
type View = {
  enabled: boolean; current: { kind: string; label: string; suspended: boolean }; notice: string | null; pausedNotice: string | null;
  actions: Action[]; revision: string; isOwner: boolean;
  waiting: { runId: string; titles: number; reason: "needs_category" | "paused" }[]; categories: { id: string; name: string }[];
};
const ACTION_BODY: Record<string, string> = { switch_to_blog: "use_blog", switch_to_website: "use_website", disconnect: "disconnect" };

/** «Dónde publica tu cuenta»: solo cambia cuando la persona pulsa y confirma. Oculto mientras el interruptor del servidor esté apagado. */
export default function DestinationSwitch() {
  const [view, setView] = useState<View | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<Action | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/configuracion/destino", { cache: "no-store" });
      if (!r.ok) throw new Error();
      setView(await r.json()); setFailed(false);
    } catch { setFailed(true); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function post(payload: object) {
    setBusy(true); setMessage(null);
    try {
      const r = await fetch("/api/configuracion/destino", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, confirm: true }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setMessage(d.error ?? "No pudimos completar el cambio.");
      else setMessage("Listo. Tu destino de publicación se actualizó.");
    } catch { setMessage("No pudimos completar el cambio. No se modificó nada."); }
    setConfirming(null); setBusy(false); await load();
  }

  if (!view && !failed) return null;
  if (view && !view.enabled) return null;
  if (!view) return <section id="destination-switch" style={box}><p style={p}>No pudimos consultar tu destino ahora.</p><button style={btn} onClick={() => void load()}>Reintentar</button></section>;

  const click = (a: Action) => {
    if (a.disabled) return;
    if (a.kind === "retry") return void load();
    if (a.kind === "connect_website") { document.getElementById("credentials")?.scrollIntoView({ behavior: "smooth" }); return; }
    if (a.url) return void window.open(a.url, "_blank", "noopener,noreferrer");
    setConfirming(a);
  };

  return (
    <section id="destination-switch" style={box}>
      <h2 style={{ fontSize: 17, margin: 0 }}>Dónde publica tu cuenta</h2>
      <p style={{ ...p, color: "#1d1d1f", fontWeight: 600 }}>Tus artículos se publican en: {view.current.label}</p>
      {view.pausedNotice && <p style={p}>{view.pausedNotice}</p>}
      {view.notice && <p style={p}>{view.notice}</p>}
      {message && <p role="status" style={{ ...p, color: "#1d1d1f" }}>{message}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        {view.actions.map((a) => (
          <div key={a.kind}>
            <button style={{ ...btn, opacity: a.disabled ? 0.5 : 1 }} disabled={a.disabled || busy} onClick={() => click(a)}>{a.label}</button>
            {a.disabled && a.reason && <p style={{ ...p, marginTop: 4 }}>{a.reason}</p>}
          </div>
        ))}
      </div>
      {view.waiting.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {view.waiting.map((w) => w.reason === "paused"
            ? <p key={w.runId} style={p}>{w.titles} {w.titles === 1 ? "artículo espera" : "artículos esperan"} a que conectes un destino.</p>
            : <CategoryPicker key={w.runId} run={w} categories={view.categories} disabled={!view.isOwner || busy} onPick={(categoryId) => void post({ action: "choose_category", runId: w.runId, categoryId })} />)}
        </div>
      )}
      {confirming && (
        <div role="dialog" aria-modal="true" aria-label="Confirmar cambio" style={overlay}>
          <div style={dialog}>
            <h3 style={{ margin: 0, fontSize: 17 }}>{confirming.label}</h3>
            <p style={{ ...p, color: "#1d1d1f" }}>{confirming.confirm}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button style={btn} disabled={busy} onClick={() => void post({ action: ACTION_BODY[confirming.kind], revision: view.revision })}>{busy ? "Un momento…" : "Sí, confirmar"}</button>
              <button style={{ ...btn, background: "#e8e8ed", color: "#1d1d1f" }} disabled={busy} onClick={() => setConfirming(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CategoryPicker({ run, categories, disabled, onPick }: { run: { runId: string; titles: number }; categories: { id: string; name: string }[]; disabled: boolean; onPick: (id: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div style={{ marginTop: 8 }}>
      <p style={p}>{run.titles} {run.titles === 1 ? "artículo necesita" : "artículos necesitan"} una categoría de tu destino actual.</p>
      <select value={value} onChange={(e) => setValue(e.target.value)} disabled={disabled} style={{ ...btn, background: "#fff", color: "#1d1d1f", border: "1px solid #d2d2d7", width: "100%" }}>
        <option value="">Elige una categoría</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button style={{ ...btn, marginTop: 8, opacity: value && !disabled ? 1 : 0.5 }} disabled={!value || disabled} onClick={() => onPick(value)}>Usar esta categoría</button>
    </div>
  );
}

const box = { background: "#fff", border: "1px solid #e5e5ea", borderRadius: 14, padding: 16, marginBottom: 16 } as const;
const p = { fontSize: 13, color: "#6e6e73", margin: "8px 0 0" } as const;
const btn = { minHeight: 44, padding: "10px 16px", borderRadius: 10, border: "none", background: "#0071e3", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", maxWidth: "100%" } as const;
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 } as const;
const dialog = { background: "#fff", borderRadius: 14, padding: 20, maxWidth: 420, width: "100%" } as const;
