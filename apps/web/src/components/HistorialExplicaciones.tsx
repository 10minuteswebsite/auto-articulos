"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { h2Style, buttonStyle } from "@/components/dashboard-ui";

// «¿Por qué estos títulos?»: la persona elige una ejecución y pide un resumen
// ejecutivo (máximo dos párrafos). Solo corre cuando lo pide; cada resumen
// queda guardado con su fecha de solicitud.

type RunOption = { id: string; createdAt: string; categoria: string; titulos: number };
type Cupo = { used: number; max: number; unlimited: boolean; nextAt: string | null; exhausted: boolean };
type Saved = { id: string; runId: string; requestedAt: string; summary: string; status: string; errorMessage: string | null };

const cardStyle: CSSProperties = {
  background: "#ffffff",
  color: "#1d1d1f",
  border: "1px solid #d2d2d7",
  borderRadius: 6,
  padding: 18,
  marginTop: 12,
  boxSizing: "border-box",
  width: "100%",
};

export default function HistorialExplicaciones() {
  const [abierta, setAbierta] = useState(false);
  const [runs, setRuns] = useState<RunOption[]>([]);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [runId, setRunId] = useState("");
  const [cupo, setCupo] = useState<Cupo | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargada, setCargada] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([fetch("/api/historial/explicacion?runs=1"), fetch("/api/historial/explicacion")]);
      if (a.ok) {
        const d = await a.json();
        setRuns(d.runs ?? []);
        setCupo(d.cupo ?? null);
        setRunId((prev) => prev || d.runs?.[0]?.id || "");
      }
      if (b.ok) setSaved((await b.json()).explanations ?? []);
    } catch {
      setError("No se pudo cargar esta sección.");
    } finally {
      setCargada(true);
    }
  }, []);

  useEffect(() => {
    if (abierta && !cargada) void cargar();
  }, [abierta, cargada, cargar]);

  async function pedir() {
    if (!runId || pidiendo) return;
    setPidiendo(true);
    setError(null);
    try {
      const res = await fetch("/api/historial/explicacion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "No se pudo generar la explicación.");
        if (res.status === 429) await cargar();
        return;
      }
      await cargar();
    } finally {
      setPidiendo(false);
    }
  }

  return (
    <details style={cardStyle} onToggle={(e) => setAbierta((e.currentTarget as HTMLDetailsElement).open)}>
      <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, userSelect: "none" }}>
        <div>
          <p className="eyebrow" style={{ margin: "0 0 2px", color: "#6e6e73" }}>Bajo demanda</p>
          <h2 style={{ ...h2Style, margin: 0 }}>¿Por qué estos títulos?</h2>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>{cargada ? saved.length : "…"}</span>
      </summary>
      <div style={{ marginTop: 14 }}>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Elige una ejecución y te explicamos, en un resumen corto, de dónde salió la información, por qué se tomó la decisión y cómo se cuidó que no se repitan temas. Solo se genera cuando lo pides y queda guardado con su fecha.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <select value={runId} onChange={(e) => setRunId(e.target.value)} disabled={pidiendo || runs.length === 0} style={{ padding: "6px 8px", fontSize: 13, maxWidth: "100%" }}>
            {runs.length === 0 && <option value="">No hay ejecuciones</option>}
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {new Date(r.createdAt).toLocaleDateString()} · {r.categoria} · {r.titulos} {r.titulos === 1 ? "título" : "títulos"}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void pedir()} disabled={!runId || pidiendo || Boolean(cupo?.exhausted)} style={{ ...buttonStyle, padding: "6px 12px", fontSize: 13 }}>
            {pidiendo ? "Explicando..." : "Explicar por qué"}
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12, margin: "0 0 10px" }}>
          {cupo?.unlimited
            ? "Como administrador no tienes límite de explicaciones."
            : `Puedes pedir ${cupo?.max ?? 1} explicación cada 24 horas, para cuidar el uso de la IA. Elige bien la ejecución: ${cupo ? `hoy llevas ${cupo.used} de ${cupo.max}.` : "cargando tu cupo..."}`}
        </p>
        {cupo?.exhausted && cupo.nextAt && (
          <p style={{ fontSize: 13, color: "#8a4b08", margin: "0 0 10px" }}>
            Ya usaste tu explicación de hoy. Podrás pedir otra a partir del {new Date(cupo.nextAt).toLocaleString()}. Mientras tanto, abajo puedes releer las que ya pediste.
          </p>
        )}
        {error && <p style={{ fontSize: 12, color: "#ff3b30" }}>{error}</p>}
        {cargada && saved.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Todavía no has pedido ninguna explicación.</p>}
        {saved.filter((s) => s.status === "ok").map((s) => {
          const run = runs.find((r) => r.id === s.runId);
          return (
            <div key={s.id} style={{ borderTop: "1px solid #e5e5ea", padding: "12px 0" }}>
              <p className="muted" style={{ fontSize: 12, margin: "0 0 6px" }}>
                Pedida el {new Date(s.requestedAt).toLocaleString()}{run ? ` · ${run.categoria}` : ""}
              </p>
              {s.summary.split(/\n\s*\n/).map((p, i) => (
                <p key={i} style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 8px" }}>{p}</p>
              ))}
            </div>
          );
        })}
      </div>
    </details>
  );
}
