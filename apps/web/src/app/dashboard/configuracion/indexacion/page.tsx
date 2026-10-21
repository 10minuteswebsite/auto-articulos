"use client";

import { useEffect, useState } from "react";
import ModuleIntro, { IntroP } from "@/components/ModuleIntro";
import { sectionStyle } from "@/components/dashboard-ui";

/**
 * Página "Indexación y SEO", parte del rediseño "RENEW CONFIGURACION"
 * (7/9/2026). Antes era una pestaña más de `ConfiguracionView.tsx`; su
 * contenido ya era autocontenido (los tres componentes no reciben props ni
 * comparten estado con nada más), así que la extracción es directa: sin
 * cambios de lógica.
 */
export default function ConfiguracionIndexacionPage() {
  const [disableIndexing, setDisableIndexing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" }).then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        setDisableIndexing(Boolean(data.disableIndexing));
      }
    }).finally(() => setLoading(false));
  }, []);

  async function save(next: boolean) {
    setSaving(true); setMessage(null);
    const response = await fetch("/api/me", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disableIndexing: next }),
    });
    if (response.ok) { setDisableIndexing(next); setMessage("Preferencia guardada."); }
    else setMessage("No se pudo guardar la preferencia.");
    setSaving(false);
  }

  return <div>
    <ModuleIntro titulo="Indexación">
      <IntroP>Define el comportamiento predeterminado de los nuevos artículos. Puedes revisarlo y cambiarlo antes de cada publicación.</IntroP>
    </ModuleIntro>
    <section style={sectionStyle}>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15, lineHeight: 1.5 }}>
        <input type="checkbox" checked={disableIndexing} disabled={loading || saving} onChange={(event) => save(event.target.checked)} />
        <span><strong>No solicitar indexación automática</strong><br /><span style={{ color: "#6e6e73", fontSize: 13 }}>Cuando está activado, los artículos nuevos quedan sin solicitud automática de indexación para que puedas revisarlos primero.</span></span>
      </label>
      {message && <p role="status" style={{ color: "#1d1d1f", fontSize: 13 }}>{message}</p>}
      <p style={{ color: "#6e6e73", fontSize: 13 }}>Estado actual: {disableIndexing ? "indexación automática desactivada" : "indexación automática activada"}.</p>
    </section>
  </div>;
}
