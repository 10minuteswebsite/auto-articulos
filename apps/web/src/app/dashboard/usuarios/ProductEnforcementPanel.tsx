"use client";

import { useEffect, useState } from "react";

/*
 * INTERRUPTOR DE DERECHOS POR PRODUCTO (Administración). Controla si el sistema
 * BLOQUEA de verdad a las cuentas sin derecho a un producto. Hoy está apagado.
 *
 * Seguridad (la API la exige también; esto es solo la parte visible):
 *  - «Activo» solo se puede elegir desde «Sombra» y pide escribir ACTIVAR.
 *  - Volver a «Sombra» o «Apagado» es siempre libre: es la reversa de emergencia.
 *  - Mientras no se sepa el modo real (cargando o con error) no se muestra ni se
 *    permite cambiar nada: nunca se enseña un estado inventado.
 */
type Mode = "off" | "shadow" | "enforce";

const LABEL: Record<Mode, string> = { off: "Apagado", shadow: "Sombra", enforce: "Activo" };

export default function ProductEnforcementPanel() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/product-enforcement", { cache: "no-store" })
      .then((response) => response.json().then((body) => ({ response, body })))
      .then(({ response, body }) => {
        if (!response.ok) throw new Error(body?.error ?? "No se pudo leer el interruptor");
        setMode(body.mode);
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : "No se pudo leer el interruptor"));
  }, []);

  async function changeMode(next: Mode) {
    if (!mode || next === mode) return;
    let confirm: string | undefined;
    if (next === "enforce") {
      const typed = window.prompt(
        "Vas a ACTIVAR el bloqueo real: toda cuenta sin derecho a un producto dejará de poder usarlo.\n\nHazlo solo después de al menos una semana en Sombra revisando los registros.\n\nEscribe ACTIVAR para confirmar:",
      );
      if (typed === null) return;
      confirm = typed.trim();
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/product-enforcement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next, confirm }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "No se pudo actualizar el interruptor");
      setMode(body.mode);
      setMessage(`Guardado: ${LABEL[body.mode as Mode]}. Puede tardar hasta 30 segundos en aplicarse en todos los servidores.`);
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
        <strong>Apagado</strong>: no se aplica nada (como hoy). <strong>Sombra</strong>: se registra lo que se bloquearía, sin impedir el acceso. <strong>Activo</strong>: bloquea de verdad a las cuentas sin derecho; solo se puede elegir desde Sombra y después de al menos una semana revisando sus registros. Volver a Sombra o Apagado es siempre inmediato.
      </p>
      {loadError ? (
        <p role="alert" style={{ margin: 0, color: "#b00020" }}>{loadError}</p>
      ) : mode === null ? (
        <p style={{ margin: 0, color: "#6e6e73" }}>Cargando…</p>
      ) : (
        <>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "#6e6e73" }}>Modo actual: <strong style={{ color: "#1d1d1f" }}>{LABEL[mode]}</strong></p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(["off", "shadow", "enforce"] as const).map((option) => (
              <button key={option} type="button" disabled={busy} onClick={() => changeMode(option)} aria-pressed={mode === option} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #d2d2d7", background: mode === option ? "#1d1d1f" : "#fff", color: mode === option ? "#fff" : "#1d1d1f", cursor: busy ? "wait" : "pointer" }}>
                {LABEL[option]}
              </button>
            ))}
          </div>
        </>
      )}
      {message && <p style={{ margin: "10px 0 0", color: "#6e6e73" }}>{message}</p>}
    </section>
  );
}
