"use client";

import { useEffect, useState } from "react";
import { buttonStyle, secondaryButtonStyle } from "./dashboard-ui";

/**
 * Dice siempre dónde se publica cuando el destino es el BLOG IA (para que nadie se sorprenda de que su sitio 10minutesWebsite
 * ya no recibe artículos) y ofrece el camino de vuelta. Con destino 10minutesWebsite o MCP no muestra nada.
 */
export default function PublishingDestinationBanner() {
  const [info, setInfo] = useState<{ hostname: string | null; websiteConnected: boolean } | null>(null);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/credentials", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.publishingDestination === "blog-ia") setInfo({ hostname: d.blogHostname ?? null, websiteConnected: Boolean(d.configured) }); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!info) return null;

  async function back() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/publishing-destination", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ destination: "website", confirm: true }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setError(data.error ?? "No pudimos cambiar el destino. Inténtalo de nuevo."); return; }
      window.location.reload();
    } catch {
      setError("No pudimos conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="status" style={{ border: "1px solid #e5e5ea", borderRadius: 14, background: "#ffffff", padding: "16px 20px", marginBottom: 16, color: "#1d1d1f" }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#6e6e73", marginBottom: 4 }}>DESTINO DE PUBLICACIÓN</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>BLOG IA{info.hostname ? `: ${info.hostname}` : ""}</div>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6e6e73", lineHeight: 1.5 }}>
        Todo lo que publiques aquí se publica en ese blog, <strong>no</strong> en tu sitio de 10minutesWebsite.
      </p>
      {!asking ? (
        <button type="button" style={{ ...secondaryButtonStyle, marginTop: 12 }} onClick={() => setAsking(true)}>Volver a publicar en mi sitio 10minutesWebsite</button>
      ) : (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: "0 0 10px", fontSize: 13 }}>
            {info.websiteConnected
              ? "¿Seguro? Desde ahora tus artículos nuevos se publicarán en tu sitio de 10minutesWebsite y dejarán de publicarse en el blog. Los que ya están en el blog se quedan."
              : "Todavía no conectaste tu sitio de 10minutesWebsite. Conéctalo primero en Configuración y luego vuelve aquí."}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {info.websiteConnected && <button type="button" style={buttonStyle} disabled={busy} onClick={back}>{busy ? "Cambiando…" : "Sí, volver a mi sitio"}</button>}
            <button type="button" style={secondaryButtonStyle} disabled={busy} onClick={() => { setAsking(false); setError(null); }}>Cancelar</button>
          </div>
        </div>
      )}
      {error && <p role="alert" style={{ margin: "10px 0 0", fontSize: 13, color: "#ff3b30" }}>{error}</p>}
    </div>
  );
}
