"use client";

import { useEffect, useState } from "react";

type DiaCeroState = { applied: boolean; backup: { exists: boolean; savedAt: string | null }; simulation: { redesUsersToChange: number; redesModuleDisabledOnPurpose: number; trialIndicatorUsers: number; adminsExcluded: number }; flags: { trialRuleEnabled: boolean; accessRouterEnabled: boolean; diaCeroEnv: boolean } };

export default function DiaCeroPanel() {
  const [state, setState] = useState<DiaCeroState | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function load() { const response = await fetch("/api/admin/dia-cero", { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body?.error ?? "No se pudo leer el Día Cero"); setState(body); }
  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : "No se pudo leer el Día Cero")); }, []);
  async function action(action: "apply" | "revert") { setBusy(true); setMessage(null); try { const response = await fetch("/api/admin/dia-cero", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "apply" ? { action, confirm: confirmation } : { action }) }); const body = await response.json(); if (!response.ok) throw new Error(body?.error ?? "No se pudo completar la acción"); await load(); setConfirmation(""); setMessage(action === "apply" ? "Día Cero activado." : "Día Cero revertido."); } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo completar la acción"); } finally { setBusy(false); } }
  async function copy(value: string) { await navigator.clipboard.writeText(value); setMessage(`Copiado: ${value}`); }
  if (!state) return <section style={{ margin: "24px 0", padding: 20, border: "1px solid #d2d2d7", borderRadius: 14, background: "#fff" }}>Cargando Día Cero…</section>;
  return <section style={{ margin: "24px 0", padding: 20, border: "1px solid #d2d2d7", borderRadius: 14, background: "#fff" }}>
    <p className="eyebrow" style={{ margin: 0 }}>Separación de productos</p><h2 style={{ margin: "4px 0 8px", fontSize: 20 }}>Día Cero</h2>
    <p style={{ lineHeight: 1.5 }}>1. Da acceso a Redes a las cuentas actuales. 2. Mantiene el login de siempre. 3. Prepara Artículos y Redes para entrar por sus propias direcciones.</p>
    <p><strong>Simulación:</strong> {state.simulation.redesUsersToChange} usuarios recibirían permisos de Redes; {state.simulation.trialIndicatorUsers} tienen indicador de prueba; {state.simulation.adminsExcluded} administradores no se tocan; {state.simulation.redesModuleDisabledOnPurpose} tienen el módulo desactivado a propósito.</p>
    <label style={{ display: "block", margin: "12px 0" }}>Escribe DIA CERO para activar<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} style={{ display: "block", minHeight: 44, padding: 8, marginTop: 4, width: "100%" }} /></label>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" disabled={busy || state.applied || confirmation !== "DIA CERO"} onClick={() => void action("apply")} style={{ minHeight: 44 }}>Activar Día Cero</button>{state.applied && <button type="button" disabled={busy} onClick={() => void action("revert")} style={{ minHeight: 44 }}>Revertir</button>}</div>
    <div style={{ marginTop: 16, padding: 14, background: "#f5f5f7", borderRadius: 10 }}><strong>Paso en Vercel</strong><p>Entra a Vercel → proyecto de SEO Total → Settings → Environment Variables → crea DIA_CERO con valor on → Redeploy.</p><button type="button" onClick={() => void copy("DIA_CERO")} style={{ minHeight: 44 }}>Copiar nombre</button> <button type="button" onClick={() => void copy("on")} style={{ minHeight: 44 }}>Copiar valor</button><p role="status">Estado: {state.flags.diaCeroEnv ? "DIA_CERO está activa" : "DIA_CERO todavía no está activa"}.</p></div>
    <p role="alert" style={{ color: "#b42318" }}>Si algo sale mal: pulsa Revertir y borra la variable.</p>{message && <p role="status">{message}</p>}
  </section>;
}
