"use client";

import { useEffect, useState } from "react";

type Mode = "off" | "shadow" | "enforce";

export default function ProductEnforcementPanel() {
  const [mode, setMode] = useState<Mode>("off");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/product-enforcement", { cache: "no-store" })
      .then((response) => response.json().then((body) => ({ response, body })))
      .then(({ response, body }) => {
        if (!response.ok) throw new Error(body?.error ?? "No se pudo leer el interruptor");
        setMode(body.mode);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "No se pudo leer el interruptor"));
  }, []);

  async function changeMode(next: Mode) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/product-enforcement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "No se pudo actualizar el interruptor");
      setMode(body.mode);
      setMessage("Guardado");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el interruptor");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ margin: "24px 0", padding: 20, border: "1px solid #d2d2d7", borderRadius: 14, background: "#fff" }}>
      <p className="eyebrow" style={{ margin: 0 }}>Control de acceso</p>
      <h2 style={{ margin: "4px 0 8px", fontSize: 20 }}>Interruptor de derechos por producto</h2>
      <p style={{ margin: "0 0 14px", color: "#6e6e73", lineHeight: 1.5 }}>
        Sombra registra lo que bloquearía sin impedir el acceso. Activo bloquea cuentas sin derecho; úsese solo después de al menos una semana en Sombra revisando los registros.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(["off", "shadow", "enforce"] as const).map((option) => (
          <button key={option} type="button" disabled={busy} onClick={() => changeMode(option)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #d2d2d7", background: mode === option ? "#1d1d1f" : "#fff", color: mode === option ? "#fff" : "#1d1d1f", cursor: busy ? "wait" : "pointer" }}>
            {option === "off" ? "Apagado" : option === "shadow" ? "Sombra" : "Activo"}
          </button>
        ))}
      </div>
      {message && <p style={{ margin: "10px 0 0", color: "#6e6e73" }}>{message}</p>}
    </section>
  );
}
