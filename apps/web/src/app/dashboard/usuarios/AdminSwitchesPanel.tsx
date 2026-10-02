"use client";

import { useEffect, useState } from "react";

type LoginMode = "legacy" | "hub";

async function read<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error ?? "No se pudo leer el interruptor");
  return body;
}

export default function AdminSwitchesPanel() {
  const [loginMode, setLoginMode] = useState<LoginMode>("legacy");
  const [hubConfigured, setHubConfigured] = useState(false);
  const [hubConfirmation, setHubConfirmation] = useState("");
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([read<{ mode: LoginMode; hubConfigured?: boolean }>("/api/admin/login-mode"), read<{ enabled: boolean }>("/api/admin/trial-rule")])
      .then(([login, trial]) => { setLoginMode(login.mode); setHubConfigured(login.hubConfigured === true); setTrialEnabled(trial.enabled); })
      .catch((error) => setMessage(error instanceof Error ? error.message : "No se pudieron leer los interruptores"));
  }, []);

  async function saveLogin(next: LoginMode) {
    if (next === "hub" && (!hubConfigured || hubConfirmation !== "SOLO HUB")) return;
    setBusy(true); setMessage(null);
    try { const response = await fetch("/api/admin/login-mode", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next === "hub" ? { mode: next, confirm: hubConfirmation } : { mode: next }) });
      const result = await response.json(); if (!response.ok) throw new Error(result?.error ?? "No se pudo guardar");
      setLoginMode(result.mode); setMessage("Guardado. El cambio puede tardar hasta 30 segundos.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar"); } finally { setBusy(false); }
  }

  async function saveTrial(enabled: boolean) {
    setBusy(true); setMessage(null);
    try { const response = await fetch("/api/admin/trial-rule", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
      const result = await response.json(); if (!response.ok) throw new Error(result?.error ?? "No se pudo guardar");
      setTrialEnabled(result.enabled); setMessage("Guardado. El cambio puede tardar hasta 30 segundos.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar"); } finally { setBusy(false); }
  }

  return <section style={{ margin: "24px 0", padding: 20, border: "1px solid #d2d2d7", borderRadius: 14, background: "#fff" }}>
    <p className="eyebrow" style={{ margin: 0 }}>Controles del sistema</p><h2 style={{ margin: "4px 0 8px", fontSize: 20 }}>Modo de entrada y prueba</h2>
    <p style={{ color: "#6e6e73", lineHeight: 1.5 }}>Estos cambios afectan cómo entran las cuentas y si se aplica el límite de 7 días. Pueden tardar hasta 30 segundos.</p>
    {!hubConfigured && <p role="alert" style={{ color: "#b42318" }}>El HUB aún no está conectado. No uses «Solo HUB» hasta conectarlo.</p>}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" disabled={busy} onClick={() => saveLogin("legacy")} style={{ minHeight: 44 }}>{loginMode === "legacy" ? "✓ " : ""}Entrada actual</button><button type="button" disabled={busy || !hubConfigured || hubConfirmation !== "SOLO HUB"} onClick={() => saveLogin("hub")} style={{ minHeight: 44 }}>{loginMode === "hub" ? "✓ " : ""}Solo HUB</button></div>
    {hubConfigured && <label style={{ display: "block", margin: "12px 0" }}>Para confirmar, escribe SOLO HUB<input value={hubConfirmation} onChange={(event) => setHubConfirmation(event.target.value)} style={{ display: "block", minHeight: 44, marginTop: 4, padding: 8 }} /></label>}
    <p style={{ color: "#6e6e73" }}>Entrada actual conserva el acceso existente. Solo HUB exige que el HUB controle la entrada; los administradores conservan su puerta directa.</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" disabled={busy} onClick={() => saveTrial(true)} style={{ minHeight: 44 }}>{trialEnabled ? "✓ " : ""}Aplicar prueba de 7 días</button><button type="button" disabled={busy} onClick={() => saveTrial(false)} style={{ minHeight: 44 }}>{!trialEnabled ? "✓ " : ""}No limitar por prueba</button></div>
    <p style={{ color: "#6e6e73" }}>Con la prueba activa se mantiene la regla actual. Al apagarla, nadie pierde acceso por haber superado 7 días.</p>
    {message && <p role="status" style={{ margin: "12px 0 0", color: "#6e6e73" }}>{message}</p>}
  </section>;
}
