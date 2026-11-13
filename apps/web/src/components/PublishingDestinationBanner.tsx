"use client";

import { useEffect, useState } from "react";

/**
 * Dice siempre dónde se publica cuando el destino es el BLOG IA. Con destino
 * 10minutesWebsite o MCP no muestra nada. El cambio de destino se gestiona
 * desde su flujo específico y no se ofrece desde el editor de artículos.
 */
export default function PublishingDestinationBanner() {
  const [info, setInfo] = useState<{ hostname: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/credentials", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.publishingDestination === "blog-ia") setInfo({ hostname: d.blogHostname ?? null }); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!info) return null;

  return (
    <div role="status" style={{ border: "1px solid #e5e5ea", borderRadius: 14, background: "#ffffff", padding: "16px 20px", marginBottom: 16, color: "#1d1d1f" }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#6e6e73", marginBottom: 4 }}>DESTINO DE PUBLICACIÓN</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>BLOG IA{info.hostname ? `: ${info.hostname}` : ""}</div>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6e6e73", lineHeight: 1.5 }}>
        Todo lo que publiques aquí se publica en ese blog, <strong>no</strong> en tu sitio de 10minutesWebsite.
      </p>
    </div>
  );
}
