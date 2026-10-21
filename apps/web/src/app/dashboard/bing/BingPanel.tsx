"use client";

import { useEffect, useState, type FormEvent } from "react";
import { sectionStyle, h2Style, inputStyle, secondaryButtonStyle } from "@/components/dashboard-ui";

type Status = {
  configured: boolean;
  source: "admin" | "env" | null;
  maskedClientId: string | null;
  maskedClientSecret: string | null;
  redirectUri: string | null;
};

export default function BingPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/bing", { cache: "no-store" });
    if (response.ok) setStatus(await response.json());
  }
  useEffect(() => { void load(); }, []);

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/admin/bing", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, clientSecret }) });
      const body = await response.json();
      setMessage(response.ok ? "Credenciales guardadas de forma cifrada. Las nuevas conexiones de Bing ya las usan." : (body.error ?? "No se pudieron guardar las credenciales."));
      if (response.ok) { setClientId(""); setClientSecret(""); await load(); }
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm("¿Eliminar las credenciales guardadas de Bing? Se usarán las variables de entorno si existen; si no, Bing dejará de poder conectarse.")) return;
    setBusy(true); await fetch("/api/admin/bing", { method: "DELETE" }); await load(); setBusy(false);
  }

  return <section style={sectionStyle}>
    <h2 style={h2Style}>Bing Webmaster Tools · conexión principal</h2>
    <p>Credenciales OAuth de la plataforma para Bing. Se guardan cifradas y nunca se muestran completas. Si cambias el cliente de Bing, quienes ya estaban conectados deben reconectar.</p>
    <form onSubmit={save} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <input type="text" autoComplete="off" spellCheck={false} value={clientId} onChange={(event) => setClientId(event.target.value)} placeholder="Client ID de Bing" style={{ ...inputStyle, minWidth: 300 }} />
      <input type="password" autoComplete="off" value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} placeholder="Client Secret de Bing" style={{ ...inputStyle, minWidth: 300 }} />
      <button type="submit" disabled={busy || !clientId.trim() || !clientSecret.trim()} className="secondary" style={secondaryButtonStyle}>Guardar</button>
      {status?.source === "admin" && <button type="button" disabled={busy} onClick={() => void remove()} className="secondary" style={secondaryButtonStyle}>Eliminar credenciales</button>}
    </form>
    <p style={{ color: "#6e6e73", fontSize: 13 }}>
      {status?.source === "admin" && `Configurada desde Administración: ID ${status.maskedClientId} · Secret ${status.maskedClientSecret}`}
      {status?.source === "env" && "Configurada con las variables de entorno (Vercel y worker). Guarda credenciales aquí para reemplazarlas."}
      {status && !status.configured && "No configurada"}
    </p>
    <p style={{ color: "#6e6e73", fontSize: 13 }}>Dirección de retorno registrada en Bing: {status?.redirectUri ?? "la de siempre (según el sitio desde el que se conecta)"}</p>
    {message && <p>{message}</p>}
  </section>;
}
