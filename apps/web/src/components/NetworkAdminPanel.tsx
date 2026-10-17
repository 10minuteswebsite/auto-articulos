"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { sectionStyle, h2Style, inputStyle, secondaryButtonStyle } from "@/components/dashboard-ui";

type Status = {
  configured: boolean;
  clientId?: string | null;
  source?: string;
  callbackUrlInUse?: string;
};

export type NetworkAdminConfig = {
  title: string;
  intro: string;
  /** Pasos para la consola del proveedor. */
  steps: ReactNode[];
  /** Ruta de la API de credenciales; null = esta conexión no usa credenciales propias de la plataforma. */
  settingsPath: string | null;
  idLabel?: string;
  secretLabel?: string;
  /** Ruta de retorno OAuth (para mostrar las direcciones .net por registrar). */
  callbackPath?: string;
  /** Aviso fijo (por ejemplo, quién maneja la conexión). */
  notice?: ReactNode;
};

const NET_HOSTS = ["https://articulos.lasolucionweb.net", "https://redes.lasolucionweb.net"];

export default function NetworkAdminPanel({ config }: { config: NetworkAdminConfig }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { settingsPath } = config;

  async function load() {
    if (!settingsPath) return;
    const response = await fetch(settingsPath, { cache: "no-store" });
    if (response.ok) setStatus(await response.json());
  }
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!settingsPath) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(settingsPath, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, clientSecret }) });
      const body = await response.json().catch(() => ({}));
      setMessage(response.ok ? "Credenciales guardadas de forma cifrada. Las nuevas conexiones ya las usan." : (body.error ?? "No se pudieron guardar las credenciales."));
      if (response.ok) { setClientId(""); setClientSecret(""); await load(); }
    } finally { setBusy(false); }
  }

  const idLabel = config.idLabel ?? "Client ID";
  const secretLabel = config.secretLabel ?? "Client Secret";

  return <section style={sectionStyle}>
    <h2 style={h2Style}>{config.title} · conexión principal</h2>
    <p>{config.intro}</p>
    {config.notice && <p style={{ fontSize: 14, fontWeight: 600 }}>{config.notice}</p>}

    <h3 style={{ fontSize: 16, margin: "18px 0 6px" }}>Qué hacer (una sola vez)</h3>
    <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7, fontSize: 14 }}>
      {config.steps.map((step, index) => <li key={index}>{step}</li>)}
    </ol>

    {config.callbackPath && <>
      <h3 style={{ fontSize: 16, margin: "18px 0 6px" }}>Direcciones de retorno</h3>
      <p style={{ margin: "0 0 4px", fontSize: 14 }}><strong>La que usa el sistema hoy</strong> (debe estar registrada en el proveedor):</p>
      <code style={{ fontSize: 13, wordBreak: "break-all" }}>{status?.callbackUrlInUse ?? "…"}</code>
      <p style={{ margin: "10px 0 4px", fontSize: 14 }}><strong>Agregar también</strong> (para el cambio a los dos sitios .net):</p>
      {NET_HOSTS.map((host) => <div key={host}><code style={{ fontSize: 13, wordBreak: "break-all" }}>{host}{config.callbackPath}</code></div>)}
    </>}

    {settingsPath && <>
      <h3 style={{ fontSize: 16, margin: "18px 0 6px" }}>Credenciales</h3>
      <form onSubmit={save} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input type="text" autoComplete="off" spellCheck={false} value={clientId} onChange={(event) => setClientId(event.target.value)} placeholder={idLabel} style={{ ...inputStyle, minWidth: 300 }} />
        <input type="password" autoComplete="off" value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} placeholder={secretLabel} style={{ ...inputStyle, minWidth: 300 }} />
        <button type="submit" disabled={busy || !clientId.trim() || !clientSecret.trim()} className="secondary" style={secondaryButtonStyle}>Guardar</button>
      </form>
      <p style={{ color: "#6e6e73", fontSize: 13 }}>
        {status?.source === "database" && `Configurada desde Administración: ID ${status.clientId}`}
        {status?.source === "environment" && "Configurada con las variables de entorno. Guarda credenciales aquí para reemplazarlas."}
        {status?.source === "shared-google-environment" && "Usa las credenciales de Google compartidas con Search Console y Analytics."}
        {status && !status.configured && "No configurada"}
      </p>
      {message && <p>{message}</p>}
    </>}
  </section>;
}
