"use client";

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
function fechaCorta(valor: string | Date) {
  return new Date(valor).toLocaleString("es-US", {
    day: "numeric",
    month: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function GoogleIndexingStatus({ title }: { title: TitleRow }) {
  // Leer siempre las props actuales. El estado se actualiza después de
  // "Comprobar indexación" y una copia inicial con useState dejaba visible
  // el resultado anterior hasta recargar toda la página.
  const status = title.googleIndexingStatus;
  const message = title.googleIndexingMessage;

  const indexed = status === "indexed";

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

  return (
    <div style={{ marginTop: 7, fontSize: 12 }}>
      {title.lastSitemapSentAt ? (
        <div style={{ color: "#16803c" }}>
          {`✓ Sitemap enviado a Google · ${fechaCorta(title.lastSitemapSentAt)}`}
        </div>
      ) : (
        <div style={{ color: "#6e6e73" }}>
          Sitemap: se enviará a Google en el próximo envío diario.
        </div>
      )}
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
      {(status === "error" || indexed) && (
        <div style={{ color: status === "error" ? "#ff3b30" : "#16803c" }}>
          {status === "error"
            ? "Google: no se pudo consultar la indexación"
            : "✓ Indexada en Google"}
        </div>
      )}
      {message && status === "error" && (
        <div style={{ color: "#6e6e73", marginTop: 2 }}>{message}</div>
      )}
      {/* Bing Indexing Status.
          Pedido explícito del usuario (11/8/2026): el error "InvalidToken" de
          Bing es intermitente del lado de Bing (reintenta 2 veces con token
          fresco en notifyBing() y aun así falla para algunos títulos del
          mismo lote, con el mismo token válido) — no es algo que más
          reintentos de nuestro código vayan a resolver, y el artículo ya se
          publicó bien de todas formas (esto es solo la indexación instantánea
          opcional). Se deja de mostrar el estado "error" para no alarmar por
          algo fuera de nuestro control; "submitted" sigue mostrándose. */}
      {title.bingIndexingStatus &&
        title.bingIndexingStatus !== "not_configured" &&
        title.bingIndexingStatus !== "error" && (
        <div style={{ color: title.bingIndexingStatus === "submitted" ? "#16803c" : "#6e6e73" }}>
          {title.bingIndexingStatus === "submitted"
            ? `✓ Aviso enviado a Bing${title.bingIndexingAt ? ` · ${fechaCorta(title.bingIndexingAt)}` : ""}`
            : `Bing: ${title.bingIndexingStatus}`}
        </div>
      )}
    </div>
  );
}
