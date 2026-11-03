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
  detalle?: { entregados?: Array<{ title: string; verdict?: string; note?: string | null; neighbor?: string | null }>; quitados?: Array<{ title: string; neighbor: string | null }>; motivo?: string; banderaRoja?: boolean } | null;
};
type Cuenta = { userId: string; correo: string; reportes: number };

const MODOS: Record<string, string> = {
  apagado: "Apagada: no hace nada (como hoy)",
  sombra: "Sombra: mide y registra, sin cambiar lo que recibe la gente",
  activo: "Activa: evita repetidos en el porcentaje de solicitudes que elijas",
};

export default function GuardiaAdmin() {
  const [modo, setModo] = useState<string>("");
  const [vence, setVence] = useState<string | null>(null);
  const [porcentaje, setPorcentaje] = useState<number>(10);
  const [reportes, setReportes] = useState<Reporte[] | null>(null);
  const [total, setTotal] = useState(0);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cuenta, setCuenta] = useState<string>("");
  const [complemento, setComplemento] = useState<string>("activo");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [linea, setLinea] = useState<string | null>(null);
  const [cargandoLinea, setCargandoLinea] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [m, r, cm] = await Promise.all([fetch("/api/admin/title-guard/mode"), fetch(`/api/admin/title-guard/reports${cuenta ? `?userId=${encodeURIComponent(cuenta)}` : ""}`), fetch("/api/admin/title-guard/complemento")]);
      if (cm.ok) setComplemento((await cm.json()).modo ?? "activo");
      if (m.ok) {
        const dm = await m.json();
        setModo(dm.modo);
        if (typeof dm.porcentaje === "number" && dm.porcentaje > 0) setPorcentaje(dm.porcentaje);
        setVence(dm.aviso ?? (dm.seApagaSolaEl ? `La sombra se apaga sola el ${new Date(dm.seApagaSolaEl).toLocaleDateString()} si no la renuevas (elige «apagada» y luego «sombra»).` : null));
      }
      if (r.ok) {
        const d = await r.json();
        if (d.disponible) {
          setReportes(d.reportes);
          setTotal(d.total);
          if (Array.isArray(d.cuentas)) setCuentas(d.cuentas);
        } else {
          setReportes(null);
          setMensaje(d.causa ? `${d.mensaje} Causa: ${d.causa}` : d.mensaje);
        }
      }
    } catch {
      setMensaje("No se pudo cargar la guardia.");
    }
  }, [cuenta]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function cambiar(nuevo: string) {
    setMensaje(null);
    const res = await fetch("/api/admin/title-guard/mode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modo: nuevo, porcentaje }) });
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
          Evita que las ideas de títulos con IA se repitan. Apagada no hace nada; en sombra mide y registra sin cambiar lo que recibe la gente; activa evita repetidos en el porcentaje que elijas. Abajo puedes ver los reportes de una cuenta concreta.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", margin: "10px 0" }}>
          <select value={modo} onChange={(e) => void cambiar(e.target.value)} style={{ padding: "6px 8px", fontSize: 13, maxWidth: "100%" }}>
            {Object.entries(MODOS).map(([valor, texto]) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
          </select>
          {modo === "activo" && (
            <select value={porcentaje} onChange={(e) => { const p = Number(e.target.value); setPorcentaje(p); void fetch("/api/admin/title-guard/mode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modo: "activo", porcentaje: p }) }).then(() => setMensaje(`Se aplica al ${p} % de las solicitudes.`)); }} style={{ padding: "6px 8px", fontSize: 13 }}>
              {[10, 25, 50, 100].map((p) => (
                <option key={p} value={p}>{p} % de las solicitudes</option>
              ))}
            </select>
          )}
          <button type="button" onClick={() => void medir()} disabled={cargandoLinea} style={{ ...buttonStyle, padding: "6px 12px", fontSize: 13 }}>
            {cargandoLinea ? "Midiendo..." : "Medir repeticiones en todas las cuentas"}
          </button>
          <button type="button" onClick={() => void cargar()} style={{ ...secondaryButtonStyle, padding: "6px 12px", fontSize: 13 }}>Actualizar</button>
        </div>
        {vence && <p className="muted" style={{ fontSize: 12 }}>{vence}</p>}
        {mensaje && <p style={{ fontSize: 13, color: "#8a4b08" }}>{mensaje}</p>}
        {linea && <p style={{ fontSize: 13 }}>{linea}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", margin: "10px 0" }}>
          <label className="muted" style={{ fontSize: 12 }}>Ideas complementarias del botón 2 (se regulan solas; esto es solo el botón de emergencia):</label>
          <select
            value={complemento}
            onChange={(e) => {
              const modo = e.target.value;
              void fetch("/api/admin/title-guard/complemento", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modo }) }).then((r) => {
                if (r.ok) {
                  setComplemento(modo);
                  setMensaje(`Modo complementario: ${modo}.`);
                } else setMensaje("No se pudo cambiar el modo complementario.");
              });
            }}
            style={{ padding: "6px 8px", fontSize: 13 }}
          >
            <option value="activo">Activo (normal): se regula solo</option>
            <option value="sombra">Sombra: calcula y registra, no muestra nada</option>
            <option value="apagado">Apagado (emergencia)</option>
          </select>
        </div>
        {reportes && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", margin: "10px 0 6px" }}>
              <label className="muted" style={{ fontSize: 12 }}>Ver una cuenta:</label>
              <select value={cuenta} onChange={(e) => setCuenta(e.target.value)} style={{ padding: "6px 8px", fontSize: 13, maxWidth: "100%" }}>
                <option value="">Todas las cuentas (últimos 30)</option>
                {cuentas.map((c) => (
                  <option key={c.userId} value={c.userId}>{c.correo} ({c.reportes})</option>
                ))}
              </select>
              <span className="muted" style={{ fontSize: 12 }}>{total} reportes {cuenta ? "de esta cuenta" : "en total"}.</span>
            </div>
            {reportes.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>Todavía no hay solicitudes observadas. Aparecen cuando alguien pide ideas con la guardia en modo sombra.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr>
                      {["Fecha", "Categoría", "Modo", "Candidatos", "Recibió hoy", "Limpios", "Parecidos", "Con nota", "Juez"].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportes.map((r) => (
                      <tr key={r.id} style={{ borderTop: "1px solid #e5e5ea" }}>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{new Date(r.fecha).toLocaleString()}</td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{r.categoria}</td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{r.modo}</td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{r.candidatos}</td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{r.entregadosHoy}</td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{r.limpios}</td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{r.parecidos}</td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{r.completadosConNota}</td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>
                          {r.error ? `Falló: ${r.error}` : r.juez}
                          {r.detalle?.banderaRoja && r.detalle?.motivo ? <p style={{ margin: "4px 0 0", fontSize: 12, color: "#b3261e" }}>🚩 {r.detalle.motivo}</p> : null}
                          {(r.detalle?.quitados?.length || r.detalle?.entregados?.some((e) => e.note)) ? (
                            <details style={{ marginTop: 4 }}>
                              <summary style={{ cursor: "pointer", fontSize: 12 }}>Ver títulos afectados</summary>
                              <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 12 }}>
                                {(r.detalle?.quitados ?? []).map((q, i) => (
                                  <li key={`q${i}`}>Quitado: {q.title}{q.neighbor ? ` — se parecía a: ${q.neighbor}` : ""}</li>
                                ))}
                                {(r.detalle?.entregados ?? []).filter((e) => e.note).map((e, i) => (
                                  <li key={`e${i}`}>Entregado con nota: {e.title}{e.neighbor ? ` — se parece a: ${e.neighbor}` : ""}</li>
                                ))}
                              </ul>
                            </details>
                          ) : null}
                        </td>
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
