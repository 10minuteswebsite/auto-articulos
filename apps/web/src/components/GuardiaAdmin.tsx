"use client";

import { useCallback, useEffect, useState } from "react";
import { h2Style, secondaryButtonStyle, buttonStyle, thStyle, tdStyle } from "@/components/dashboard-ui";

// Solo administrador (vive dentro de «Detalle para el administrador»). Cambia el modo de la
// Guardia de ángulos, muestra lo que decidiría en cada solicitud y mide la línea base.

type Reporte = {
  id: string;
  fecha: string;
  categoria: string;
  modo: string;
  candidatos: number;
  entregadosHoy: number;
  limpios: number;
  parecidos: number;
  completadosConNota: number;
  juez: string;
  error: string | null;
};

const MODOS: Record<string, string> = {
  apagado: "Apagada: no hace nada (como hoy)",
  sombra: "Sombra: mide y registra, sin cambiar lo que recibe la gente",
};

export default function GuardiaAdmin() {
  const [modo, setModo] = useState<string>("");
  const [vence, setVence] = useState<string | null>(null);
  const [reportes, setReportes] = useState<Reporte[] | null>(null);
  const [total, setTotal] = useState(0);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [linea, setLinea] = useState<string | null>(null);
  const [cargandoLinea, setCargandoLinea] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [m, r] = await Promise.all([fetch("/api/admin/title-guard/mode"), fetch("/api/admin/title-guard/reports")]);
      if (m.ok) {
        const dm = await m.json();
        setModo(dm.modo);
        setVence(dm.aviso ?? (dm.seApagaSolaEl ? `La sombra se apaga sola el ${new Date(dm.seApagaSolaEl).toLocaleDateString()} si no la renuevas (elige «apagada» y luego «sombra»).` : null));
      }
      if (r.ok) {
        const d = await r.json();
        if (d.disponible) {
          setReportes(d.reportes);
          setTotal(d.total);
        } else {
          setReportes(null);
          setMensaje(d.causa ? `${d.mensaje} Causa: ${d.causa}` : d.mensaje);
        }
      }
    } catch {
      setMensaje("No se pudo cargar la guardia.");
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function cambiar(nuevo: string) {
    setMensaje(null);
    const res = await fetch("/api/admin/title-guard/mode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modo: nuevo }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setMensaje(d.error ?? "No se pudo cambiar el modo.");
    else {
      setModo(d.modo);
      setMensaje(`Modo cambiado a «${d.modo}».`);
    }
  }

  async function medir() {
    setCargandoLinea(true);
    setLinea(null);
    try {
      const res = await fetch("/api/admin/title-guard/baseline");
      const d = await res.json().catch(() => ({}));
      setLinea(res.ok ? d.resumen : d.error ?? "No se pudo medir.");
    } finally {
      setCargandoLinea(false);
    }
  }

  return (
    <details style={{ marginTop: 12, borderTop: "1px solid #e5e5ea", paddingTop: 12 }}>
      <summary style={{ cursor: "pointer", listStyle: "none", userSelect: "none" }}>
        <p className="eyebrow" style={{ margin: "0 0 2px", color: "#6e6e73" }}>Solo administrador</p>
        <h2 style={{ ...h2Style, margin: 0 }}>Guardia de ángulos</h2>
      </summary>
      <div style={{ marginTop: 12 }}>
        <p className="muted" style={{ fontSize: 13 }}>
          Evita que las ideas de títulos con IA se repitan. Hoy solo puede estar apagada o en sombra: en sombra calcula lo que haría y lo registra, pero lo que recibe cada persona es exactamente lo de siempre.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", margin: "10px 0" }}>
          <select value={modo} onChange={(e) => void cambiar(e.target.value)} style={{ padding: "6px 8px", fontSize: 13, maxWidth: "100%" }}>
            {Object.entries(MODOS).map(([valor, texto]) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
          </select>
          <button type="button" onClick={() => void medir()} disabled={cargandoLinea} style={{ ...buttonStyle, padding: "6px 12px", fontSize: 13 }}>
            {cargandoLinea ? "Midiendo..." : "Medir repeticiones en todas las cuentas"}
          </button>
          <button type="button" onClick={() => void cargar()} style={{ ...secondaryButtonStyle, padding: "6px 12px", fontSize: 13 }}>Actualizar</button>
        </div>
        {vence && <p className="muted" style={{ fontSize: 12 }}>{vence}</p>}
        {mensaje && <p style={{ fontSize: 13, color: "#8a4b08" }}>{mensaje}</p>}
        {linea && <p style={{ fontSize: 13 }}>{linea}</p>}
        {reportes && (
          <>
            <p className="muted" style={{ fontSize: 12, margin: "10px 0 6px" }}>Últimas solicitudes observadas ({total} en total).</p>
            {reportes.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>Todavía no hay solicitudes observadas. Aparecen cuando alguien pide ideas con la guardia en modo sombra.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr>
                      {["Fecha", "Categoría", "Candidatos", "Recibió hoy", "Limpios", "Parecidos", "Con nota", "Juez"].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportes.map((r) => (
                      <tr key={r.id} style={{ borderTop: "1px solid #e5e5ea" }}>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{new Date(r.fecha).toLocaleString()}</td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{r.categoria}</td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{r.candidatos}</td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{r.entregadosHoy}</td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{r.limpios}</td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{r.parecidos}</td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{r.completadosConNota}</td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{r.error ? `Falló: ${r.error}` : r.juez}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}
