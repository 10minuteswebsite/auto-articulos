"use client";

import { useState } from "react";
import type { TitleRow } from "@/types/dashboard";

// Pedido explícito del usuario (13/8/2026): los estados intermedios/pendientes
// ("Sitemap: todavía no se confirmó...", "Google: pendiente de indexación",
// el mensaje de "Google no reconoce esta URL", "Bing no estaba conectado...")
// y el botón "Actualizar estado" generaban confusión y alarma constante en el
// historial, sin ser accionables — indexar en Google/Bing lleva tiempo y es
// normal que un artículo recién publicado todavía no aparezca. Ahora solo se
// muestran los estados POSITIVOS confirmados (✓ enviado / ✓ indexado / ✓
// enviado a Bing) y errores reales; el silencio es el estado normal de
// "todavía no, pero va a pasar".
export default function GoogleIndexingStatus({ title }: { title: TitleRow }) {
  // Leer siempre las props actuales. El estado se actualiza después de
  // "Comprobar indexación" y una copia inicial con useState dejaba visible
  // el resultado anterior hasta recargar toda la página.
  const status = title.googleIndexingStatus;
  const [enviando, setEnviando] = useState<"google" | "bing" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // BLOG IA en su dirección de inicio: va con «no indexar» a propósito. No se envía sitemap ni se puede comprobar
  // indexación, así que se explica en vez de prometer algo que no va a ocurrir.
  if (title.indexingNotApplicable) {
    return (
      <div style={{ marginTop: 7, fontSize: 12 }}>
        <div style={{ color: "#6e6e73" }}>
          Tu blog está en su dirección de inicio y Google todavía no lo lee. Se indexará cuando conectes tu propio dominio.
        </div>
        {title.businessProfilePost?.status === "sent" && (
          <div style={{ color: "#16803c" }}>
            {`✓ Publicado en Google Business Profile${title.businessProfilePost.sentAt ? `: ${new Date(title.businessProfilePost.sentAt).toLocaleString("es-US")}` : ""}`}
          </div>
        )}
      </div>
    );
  }

  if (status === "not_configured") {
    return (
      <div style={{ marginTop: 7, fontSize: 12 }}>
        <div style={{ color: "#6e6e73" }}>
          Google Search Console no estaba conectado cuando se publicó este
          artículo.
        </div>
        <div style={{ marginTop: 5 }}>
          <a
            href="/dashboard/configuracion"
            style={{ color: "#0066cc", fontWeight: 600 }}
          >
            Conectar Google Search Console
          </a>
        </div>
      </div>
    );
  }

  const googleSent = Boolean(title.lastSitemapSentAt);
  const bingSent = title.bingIndexingStatus === "submitted";
  const bingConfigured = title.bingIndexingStatus !== "not_configured";

  async function enviar(url: string, clave: "google" | "bing") {
    setEnviando(clave);
    setError(null);
    try {
      const res = await fetch(url, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error ?? "No se pudo enviar. Inténtalo de nuevo.");
      // Un envío cubre a todos los artículos: se recarga todo el Historial.
      else window.dispatchEvent(new Event("historial:reload"));
    } finally {
      setEnviando(null);
    }
  }

  const botonStyle = {
    marginTop: 3,
    padding: 0,
    border: 0,
    background: "transparent",
    fontSize: 12,
    cursor: "pointer",
  } as const;

  return (
    <div style={{ marginTop: 7, fontSize: 12 }}>
      {googleSent ? (
        <div style={{ color: "#16803c" }}>Sitemap enviado a Google</div>
      ) : (
        <div style={{ color: "#6e6e73" }}>
          <div>Sitemap por enviar a Google</div>
          <div style={{ fontSize: 11 }}>
            Google permite un envío al día. Yo lo envío solo cuando corresponde;
            si lo envías ahora, cuenta como el envío de hoy.
          </div>
          <button
            type="button"
            className="link-button"
            style={botonStyle}
            disabled={enviando !== null}
            onClick={() => enviar("/api/sitemap/send", "google")}
          >
            {enviando === "google" ? "Enviando…" : "Enviar ahora"}
          </button>
        </div>
      )}
      {bingConfigured &&
        (bingSent ? (
          <div style={{ color: "#16803c" }}>Artículo enviado a Bing</div>
        ) : (
          <div style={{ color: "#6e6e73" }}>
            <div>Artículo por enviar a Bing</div>
            <button
              type="button"
              className="link-button"
              style={botonStyle}
              disabled={enviando !== null}
              onClick={() => enviar("/api/bing/master-index", "bing")}
            >
              {enviando === "bing" ? "Enviando…" : "Enviar ahora"}
            </button>
          </div>
        ))}
      {error && <div style={{ color: "#ff3b30", marginTop: 2 }}>{error}</div>}
      {title.businessProfilePost && (
        <div
          style={{
            color:
              title.businessProfilePost.status === "sent"
                ? "#16803c"
                : title.businessProfilePost.status === "rejected" ||
                    title.businessProfilePost.status === "error"
                  ? "#ff3b30"
                  : "#8a4b08",
          }}
        >
          {title.businessProfilePost.status === "sent"
            ? `✓ Publicado en Google Business Profile${title.businessProfilePost.sentAt ? `: ${new Date(title.businessProfilePost.sentAt).toLocaleString("es-US")}` : ""}`
            : title.businessProfilePost.status === "rejected"
              ? "Google Business Profile rechazó esta publicación."
              : title.businessProfilePost.status === "error"
                ? "Error al publicar en Google Business Profile."
                : "Publicando en Google Business Profile..."}
        </div>
      )}
    </div>
  );
}
