"use client";

import { useEffect, useState, type FormEvent } from "react";
import { sectionStyle, h2Style, inputStyle, secondaryButtonStyle } from "@/components/dashboard-ui";

type Status = {
  configured: boolean;
  clientId?: string | null;
  source?: "database" | "environment" | "none";
  callbackUrlInUse?: string;
};

const NEW_CALLBACKS = [
  "https://articulos.lasolucionweb.net/api/search-integrations/linkedin/callback",
  "https://redes.lasolucionweb.net/api/search-integrations/linkedin/callback",
];

export default function LinkedInPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/search-integrations/linkedin/settings", { cache: "no-store" });
    if (response.ok) setStatus(await response.json());
  }
  useEffect(() => { void load(); }, []);

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/search-integrations/linkedin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, clientSecret }) });
      const body = await response.json().catch(() => ({}));
      setMessage(response.ok ? "Credenciales guardadas de forma cifrada. Las nuevas conexiones de LinkedIn ya las usan." : (body.error ?? "No se pudieron guardar las credenciales."));
      if (response.ok) { setClientId(""); setClientSecret(""); await load(); }
    } finally { setBusy(false); }
  }

  return <section style={sectionStyle}>
    <h2 style={h2Style}>LinkedIn · conexión principal</h2>
    <p>Credenciales OAuth de la aplicación de LinkedIn de la plataforma. Se guardan cifradas y nunca se muestran completas.</p>

    <h3 style={{ fontSize: 16, margin: "18px 0 6px" }}>Qué hacer en LinkedIn (una sola vez)</h3>
    <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7, fontSize: 14 }}>
      <li>Entra a <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noreferrer">linkedin.com/developers/apps</a> con la cuenta que creó la aplicación y ábrela.</li>
      <li>Pestaña <strong>Auth</strong>: copia el <strong>Client ID</strong> y el <strong>Primary Client Secret</strong> y pégalos abajo.</li>
      <li>En esa misma pestaña, en <strong>Authorized redirect URLs for your app</strong>, agrega las dos direcciones de «Agregar también» (abajo) y pulsa <strong>Update</strong>. No borres la que ya está.</li>
      <li>Pestaña <strong>Products</strong>: comprueba que estén activos <strong>Sign In with LinkedIn using OpenID Connect</strong> y <strong>Share on LinkedIn</strong>.</li>
    </ol>

    <h3 style={{ fontSize: 16, margin: "18px 0 6px" }}>Direcciones de retorno</h3>
    <p style={{ margin: "0 0 4px", fontSize: 14 }}><strong>La que usa el sistema hoy</strong> (debe estar registrada en LinkedIn):</p>
    <code style={{ fontSize: 13, wordBreak: "break-all" }}>{status?.callbackUrlInUse ?? "…"}</code>
    <p style={{ margin: "10px 0 4px", fontSize: 14 }}><strong>Agregar también</strong> (para el cambio a los dos sitios .net):</p>
    {NEW_CALLBACKS.map((url) => <div key={url}><code style={{ fontSize: 13, wordBreak: "break-all" }}>{url}</code></div>)}

    <h3 style={{ fontSize: 16, margin: "18px 0 6px" }}>Credenciales</h3>
    <form onSubmit={save} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <input type="text" autoComplete="off" spellCheck={false} value={clientId} onChange={(event) => setClientId(event.target.value)} placeholder="Client ID de LinkedIn" style={{ ...inputStyle, minWidth: 300 }} />
      <input type="password" autoComplete="off" value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} placeholder="Client Secret de LinkedIn" style={{ ...inputStyle, minWidth: 300 }} />
      <button type="submit" disabled={busy || !clientId.trim() || !clientSecret.trim()} className="secondary" style={secondaryButtonStyle}>Guardar</button>
    </form>
    <p style={{ color: "#6e6e73", fontSize: 13 }}>
      {status?.source === "database" && `Configurada desde Administración: ID ${status.clientId}`}
      {status?.source === "environment" && "Configurada con las variables de entorno. Guarda credenciales aquí para reemplazarlas."}
      {status && !status.configured && "No configurada"}
    </p>
    {message && <p>{message}</p>}
  </section>;
}
