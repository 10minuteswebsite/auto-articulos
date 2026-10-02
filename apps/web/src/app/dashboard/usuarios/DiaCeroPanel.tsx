"use client";

import { useEffect, useState } from "react";

type DiaCeroState = { applied: boolean; simulation: { redesUsersToChange: number; trialIndicatorUsers: number }; flags: { diaCeroEnv: boolean } };
const HOSTS = ["https://seototal.lasolucionweb.com", "https://articulos.lasolucionweb.com", "https://redes.lasolucionweb.com"] as const;
const CHECK_TIMEOUT_MS = 8000;

export default function DiaCeroPanel() {
  const [state, setState] = useState<DiaCeroState | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [checks, setChecks] = useState<Array<boolean | null> | null>(null);
  async function load() { const response = await fetch("/api/admin/dia-cero", { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body?.error ?? "No se pudo leer el Día Cero"); setState(body); }
  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : "No se pudo leer el Día Cero")); }, []);
  useEffect(() => {
    if (!state?.applied || checks) return;
    let cancelled = false;
    setChecks([null, null, null]);
    void Promise.all(HOSTS.map(async (host) => { const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS); try { await fetch(`${host}/login`, { cache: "no-store", mode: "no-cors", signal: controller.signal }); return true; } catch { return false; } finally { window.clearTimeout(timeout); } }))
      .then((results) => { if (!cancelled) setChecks(results); });
    return () => { cancelled = true; };
  }, [state?.applied, checks]);
  async function action(actionName: "apply" | "revert") {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/admin/dia-cero", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(actionName === "apply" ? { action: actionName, confirm: confirmation } : { action: actionName }) });
      const body = await response.json(); if (!response.ok) throw new Error(body?.error ?? "No se pudo completar la acción");
      await load(); setConfirmation(""); setChecks(null); setMessage(actionName === "apply" ? "Día Cero activado." : "Día Cero revertido.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo completar la acción"); } finally { setBusy(false); }
  }
  async function copy(value: string) { await navigator.clipboard.writeText(value); setMessage(`Copiado: ${value}`); }
  if (!state) return <section style={{ margin: "24px 0", padding: 24, fontSize: 18, background: "#fff", borderRadius: 14 }}>Cargando Día Cero…</section>;
  const ready = state.flags.diaCeroEnv;
  const buttonStyle = { minHeight: 44, padding: "8px 14px", fontSize: 16 };
  return <section style={{ margin: "24px 0", padding: 24, fontSize: 18, background: "#fff", border: "1px solid #d2d2d7", borderRadius: 14 }}>
    <h2 style={{ margin: "0 0 20px", fontSize: 26 }}>Día Cero</h2>
    <div style={{ marginBottom: 20 }}><h3 style={{ margin: "0 0 8px", fontSize: 21 }}>Paso 1 — Poner la variable en Vercel {ready ? "✅" : "⏳"}</h3><p style={{ margin: "0 0 8px" }}>Vercel → tu proyecto → Settings → Environment Variables → Redeploy</p><button type="button" onClick={() => void copy("DIA_CERO")} style={buttonStyle}>Copiar nombre: DIA_CERO</button>{" "}<button type="button" onClick={() => void copy("on")} style={buttonStyle}>Copiar valor: on</button><p role="status" style={{ color: ready ? "#18794e" : "#666", margin: "8px 0 0" }}>{ready ? "Variable detectada" : "todavía no detectada"}</p><p style={{ margin: "6px 0 0" }}>Cuando termine el Redeploy, esta pantalla se pone verde sola; si no, espera un minuto y recarga.</p></div>
    <div style={{ marginBottom: 20 }}><h3 style={{ margin: "0 0 8px", fontSize: 21 }}>Paso 2 — Revisar los números ✅</h3><p style={{ margin: 0 }}>Se darán permisos de Redes a {state.simulation.redesUsersToChange} usuarios y se quitará la prueba de 7 días a {state.simulation.trialIndicatorUsers}.</p></div>
    <div style={{ marginBottom: 16 }}><h3 style={{ margin: "0 0 8px", fontSize: 21 }}>Paso 3 — Activar</h3><label style={{ display: "block", marginBottom: 8 }}>Escribe DIA CERO<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={!ready || state.applied || busy} style={{ display: "block", width: "100%", minHeight: 44, padding: 8, marginTop: 6, fontSize: 18, boxSizing: "border-box" }} /></label><button type="button" disabled={busy || state.applied || !ready || confirmation !== "DIA CERO"} onClick={() => void action("apply")} style={buttonStyle}>Activar Día Cero</button>{!ready && <p role="status" style={{ color: "#666", margin: "8px 0 0" }}>Falta el Paso 1.</p>}</div>
    {state.applied && <div style={{ marginBottom: 16 }}><h3 style={{ margin: "0 0 8px", fontSize: 21 }}>Comprobación</h3>{!checks || checks.some((check) => check === null) ? <p>Comprobando…</p> : <ul style={{ paddingLeft: 24, margin: 0 }}>{HOSTS.map((host, index) => <li key={host}>{checks[index] ? "✅" : "❌"} {host.replace("https://", "")} responde</li>)}</ul>}<p style={{ margin: "10px 0 0" }}>Falta una prueba que solo puedes hacer tú: conecta una red desde redes.lasolucionweb.com y comprueba que vuelve ahí.</p></div>}
    {state.applied && <button type="button" disabled={busy} onClick={() => void action("revert")} style={buttonStyle}>Revertir</button>}
    <p role="alert" style={{ color: "#b42318", marginBottom: 0 }}>Si algo sale mal: Revertir (enseguida) y borra la variable en Vercel.</p>{message && <p role="status">{message}</p>}
  </section>;
}
