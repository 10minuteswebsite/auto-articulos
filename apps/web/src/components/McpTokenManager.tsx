"use client";

import { useCallback, useEffect, useState } from "react";

type CredentialState = { active: boolean; version: string | null; issuedAt?: string | null; lastUsedAt?: string | null };
const buttonStyle = { border: 0, borderRadius: 8, background: "#1d1d1f", color: "#fff", padding: "10px 16px", fontWeight: 600, cursor: "pointer" } as const;
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleString("es") : "No registrado";

export function McpTokenManager({ previewToken, onToken, assistant }: { previewToken: string | null; onToken: (token: string | null) => void; assistant: string }) {
  const [state, setState] = useState<CredentialState | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/configuracion/mcp-token", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo consultar el estado del token. Vuelve a intentarlo.");
      const data = await response.json() as CredentialState;
      if (typeof data.active !== "boolean" || (data.active && typeof data.version !== "string")) throw new Error("No se pudo comprobar el estado del token. Actualiza la página.");
      setState(data);
      setError(null);
    } catch (err) {
      setState(null);
      setError(err instanceof Error ? err.message : "No se pudo consultar el token.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function generate() {
    if (!state || loading || working) return;
    if (state.active && !window.confirm("Reemplazar el token desconectará los asistentes que usan el anterior en Artículos y Redes. Tendrás que actualizarlo en sus campos seguros. ¿Quieres reemplazarlo?")) return;
    setWorking(true);
    setError(null);
    try {
      const response = await fetch("/api/configuracion/mcp-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Asistente IA", replaceExisting: state.active, expectedVersion: state.version }),
      });
      const data = await response.json() as { token?: string; version?: string; issuedAt?: string; error?: string };
      if (!response.ok) {
        if (response.status === 409) { onToken(null); await refresh(); }
        throw new Error(data.error || "No se pudo generar el token.");
      }
      if (!data.token || !data.version) throw new Error("La respuesta no contiene un token válido.");
      onToken(data.token);
      setState({ active: true, version: data.version, issuedAt: data.issuedAt, lastUsedAt: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el token.");
    } finally {
      setWorking(false);
    }
  }
  async function revoke() {
    if (!state?.active || working || !window.confirm("Revocar el token desconectará los asistentes que lo usan en Artículos y Redes. ¿Quieres revocarlo?")) return;
    setWorking(true);
    setError(null);
    try {
      const response = await fetch("/api/configuracion/mcp-token", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: state.version }) });
      if (!response.ok) {
        if (response.status === 409) { onToken(null); await refresh(); }
        throw new Error(response.status === 409 ? "El token cambió. Consulta el estado antes de revocarlo." : "No se pudo revocar el token.");
      }
      onToken(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo revocar el token.");
    } finally {
      setWorking(false);
    }
  }
  return <section aria-label="Token personal del asistente" style={{ marginTop: 30, borderTop: "1px solid #d2d2d7", paddingTop: 24 }}>
    <h2 style={{ fontSize: 20, margin: "0 0 12px" }}>2. {state?.active ? "Tu token personal está activo" : "Genera tu token personal"}</h2>
    <p style={{ color: "#6e6e73", lineHeight: 1.5 }}>{state?.active
      ? "Este token es compartido por Artículos y Redes. Reemplazarlo desconecta los asistentes que utilizan el anterior."
      : "Guarda el token únicamente en el campo seguro de tu asistente. Su valor se muestra una sola vez."}</p>
    {loading && <p role="status">Consultando el estado del token…</p>}
    <button type="button" onClick={generate} disabled={working || loading || !state} style={buttonStyle}>{state?.active ? "Reemplazar token" : "Generar token"}</button>
    {state?.active && <button type="button" onClick={revoke} disabled={working || loading} style={{ ...buttonStyle, marginLeft: 10, background: "#e5e5ea", color: "#1d1d1f" }}>Revocar</button>}
    {error && <p role="alert" style={{ marginTop: 14, color: "#d70015" }}>{error}</p>}
    {!loading && !state && <button type="button" onClick={refresh} disabled={working} style={{ ...buttonStyle, marginTop: 10 }}>Volver a consultar</button>}
    {state?.active && <p style={{ color: "#6e6e73", lineHeight: 1.5 }}>Última emisión: {dateLabel(state.issuedAt)}. Último uso validado: {dateLabel(state.lastUsedAt)}.</p>}
    {previewToken && <p style={{ marginTop: 14 }}>Token generado: <strong style={{ overflowWrap: "anywhere" }}>{previewToken}</strong></p>}
    <p style={{ color: "#6e6e73", lineHeight: 1.5 }}>{assistant === "Claude" ? "El texto para copiar aparece en el paso 3." : "Guárdalo solo en el campo seguro de tu asistente."}</p>
  </section>;
}
