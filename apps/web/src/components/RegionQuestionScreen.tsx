"use client";

import { useState } from "react";

// Primera entrada de una cuenta nueva del Hub: se elige el servidor (Europa -> .site,
// resto -> .net). Reemplaza el contenido del panel hasta responder (ver dashboard/layout.tsx).
export default function RegionQuestionScreen() {
  const [saving, setSaving] = useState<"europe" | "other" | null>(null);
  const [error, setError] = useState("");

  async function choose(region: "europe" | "other") {
    setSaving(region);
    setError("");
    try {
      const response = await fetch("/api/me/region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region }),
      });
      if (!response.ok) throw new Error();
      window.location.reload();
    } catch {
      setSaving(null);
      setError("No se pudo guardar. Inténtalo de nuevo.");
    }
  }

  const button = {
    padding: "14px 22px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#1d1d1f",
    color: "#f5f5f7",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    minWidth: 160,
  } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 18, padding: "48px 16px" }}>
      <h2 style={{ margin: 0, fontSize: 22 }}>¿Desde dónde usarás la plataforma?</h2>
      <p style={{ margin: 0, maxWidth: 460, fontSize: 14, lineHeight: 1.6, color: "#6e6e73" }}>
        Con tu respuesta te conectamos al servidor que te corresponde. Solo te lo preguntamos esta vez.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button type="button" style={button} disabled={saving !== null} onClick={() => choose("europe")}>
          {saving === "europe" ? "Guardando…" : "Europa"}
        </button>
        <button type="button" style={button} disabled={saving !== null} onClick={() => choose("other")}>
          {saving === "other" ? "Guardando…" : "Resto del mundo"}
        </button>
      </div>
      {error && <p style={{ margin: 0, fontSize: 13, color: "#d70015" }}>{error}</p>}
    </div>
  );
}
