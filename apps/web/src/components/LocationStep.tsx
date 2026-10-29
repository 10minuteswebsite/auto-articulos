"use client";

import { useEffect, useState } from "react";
import { COUNTRIES } from "@/lib/countries";

// Primer paso del asistente inicial de una cuenta NUEVA del Hub: el Hub no manda ubicación, y de ella
// salen el servidor (Europa -> .site, resto -> .net) y el país en que se escriben los artículos.
// Se guarda con el mismo PATCH /api/me que el aviso «Tu ubicación» de Configuración.
export default function LocationStep({ initial }: { initial: { country: string; city: string; timeZone: string } }) {
  const [country, setCountry] = useState(initial.country);
  const [city, setCity] = useState(initial.city);
  const [timeZone, setTimeZone] = useState(initial.timeZone);
  const [timeZones, setTimeZones] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setTimeZones((Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone") ?? []);
      if (!initial.timeZone) setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    } catch {
      /* el selector queda con la zona guardada */
    }
  }, [initial.timeZone]);

  const ready = Boolean(country && city.trim() && timeZone);
  const field = { height: 44, padding: "0 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", fontSize: 15, width: "100%", boxSizing: "border-box" } as const;

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, city: city.trim(), timeZone }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "No se pudo guardar.");
      }
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: "32px auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0071e3" }}>
        Antes de empezar · Una sola vez
      </p>
      <h2 style={{ margin: 0, fontSize: 24 }}>¿Dónde estás?</h2>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#6e6e73" }}>
        Con tu país te conectamos al servidor que te corresponde y escribimos tus artículos para los lectores de tu país. Con tu zona horaria,
        tu día de publicación empieza y termina a medianoche en tu hora.
      </p>
      <select aria-label="País" value={country} onChange={(e) => setCountry(e.target.value)} style={field}>
        <option value="">País...</option>
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>
      <input aria-label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ciudad" maxLength={120} style={field} />
      <select aria-label="Zona horaria" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} style={field}>
        <option value="">Zona horaria...</option>
        {(timeZone && !timeZones.includes(timeZone) ? [timeZone, ...timeZones] : timeZones).map((z) => (
          <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={save}
        disabled={!ready || saving}
        style={{ height: 46, borderRadius: 12, border: "none", background: ready && !saving ? "#0071e3" : "#c7c7cc", color: "#fff", fontSize: 15, fontWeight: 700, cursor: ready && !saving ? "pointer" : "default" }}
      >
        {saving ? "Guardando..." : "Guardar y continuar"}
      </button>
      {error && <p style={{ margin: 0, fontSize: 13, color: "#d70015" }}>{error}</p>}
    </div>
  );
}
