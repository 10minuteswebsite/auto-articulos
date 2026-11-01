"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { h2Style, secondaryButtonStyle, thStyle, tdStyle } from "@/components/dashboard-ui";
import HistorialExplicaciones from "@/components/HistorialExplicaciones";

// Historiales forenses de Artículos: debajo de los históricos de siempre.
// Cada sección carga SOLO cuando se abre (no recarga el Historial entero) y
// pagina de 50 en 50. Solo lectura.

type SeccionId = "errores" | "cancelados" | "en-curso" | "descartados" | "propuestos" | "eventos";
type Row = Record<string, unknown> & { id: string };
type Columna = { clave: string; titulo: string; fecha?: boolean };

const SECCIONES: Array<{ id: SeccionId; eyebrow: string; titulo: string; ayuda: string; columnas: Columna[] }> = [
  {
    id: "errores",
    eyebrow: "Sin publicar",
    titulo: "No se pudieron publicar",
    ayuda: "Cada título que terminó en error, con el motivo que registró el sistema. Incluye los de ejecuciones que sí publicaron otros títulos.",
    columnas: [
      { clave: "titulo", titulo: "Título" },
      { clave: "categoria", titulo: "Categoría" },
      { clave: "motivo", titulo: "Motivo" },
      { clave: "intentos", titulo: "Intentos" },
      { clave: "ejecucionCreada", titulo: "Se creó", fecha: true },
      { clave: "procesado", titulo: "Último intento", fecha: true },
      { clave: "ultimoEvento", titulo: "Último paso registrado" },
      { clave: "codigoTecnico", titulo: "Código técnico (para soporte)" },
      { clave: "id", titulo: "Código del título" },
    ],
  },
  {
    id: "cancelados",
    eyebrow: "Sin publicar",
    titulo: "Títulos cancelados",
    ayuda: "Títulos que se cancelaron antes de publicarse.",
    columnas: [
      { clave: "titulo", titulo: "Título" },
      { clave: "categoria", titulo: "Categoría" },
      { clave: "estadoEjecucion", titulo: "Estado de la ejecución" },
      { clave: "ejecucionCreada", titulo: "Se creó", fecha: true },
      { clave: "procesado", titulo: "Procesado", fecha: true },
      { clave: "motivo", titulo: "Motivo" },
      { clave: "id", titulo: "Código del título" },
    ],
  },
  {
    id: "en-curso",
    eyebrow: "En marcha",
    titulo: "En curso o en cola",
    ayuda: "Títulos que todavía esperan o se están procesando. Si llevan mucho tiempo aquí, algo se atascó.",
    columnas: [
      { clave: "titulo", titulo: "Título" },
      { clave: "categoria", titulo: "Categoría" },
      { clave: "estado", titulo: "Estado" },
      { clave: "intentos", titulo: "Intentos" },
      { clave: "ejecucionCreada", titulo: "Desde", fecha: true },
      { clave: "ultimoEvento", titulo: "Último paso registrado" },
      { clave: "id", titulo: "Código del título" },
    ],
  },
  {
    id: "descartados",
    eyebrow: "Descartados",
    titulo: "Descartados y borrados",
    ayuda: "Oportunidades que descartaste, que se reemplazaron al analizar de nuevo, y errores o cancelados que se borraron con «Borrar historial». Solo se registran desde el 1 de noviembre de 2026: lo anterior no se puede recuperar.",
    columnas: [
      { clave: "fecha", titulo: "Fecha", fecha: true },
      { clave: "titulo", titulo: "Título" },
      { clave: "categoria", titulo: "Categoría" },
      { clave: "origen", titulo: "Cómo salió" },
      { clave: "razonDelTitulo", titulo: "Razón del título" },
      { clave: "razonDeLaOportunidad", titulo: "Razón de la oportunidad" },
      { clave: "impresiones", titulo: "Veces que se mostró en Google" },
      { clave: "clics", titulo: "Visitas desde Google" },
      { clave: "oportunidadCreada", titulo: "Oportunidad creada", fecha: true },
      { clave: "id", titulo: "Código" },
    ],
  },
  {
    id: "propuestos",
    eyebrow: "Temas",
    titulo: "Temas que te propusimos",
    ayuda: "Los títulos que el sistema te ofreció cada día y lo que escribiste en el formulario. Sirve para ver si los temas se repiten.",
    columnas: [
      { clave: "fecha", titulo: "Fecha", fecha: true },
      { clave: "categoria", titulo: "Categoría" },
      { clave: "titulosOfrecidos", titulo: "Títulos ofrecidos" },
      { clave: "entradasDelUsuario", titulo: "Lo que escribiste" },
      { clave: "espacio", titulo: "Espacio" },
      { clave: "id", titulo: "Código" },
    ],
  },
  {
    id: "eventos",
    eyebrow: "Registro",
    titulo: "Línea de tiempo de eventos",
    ayuda: "Todos los pasos que el sistema registró por cada título, del más reciente al más antiguo.",
    columnas: [
      { clave: "fecha", titulo: "Fecha", fecha: true },
      { clave: "titulo", titulo: "Título" },
      { clave: "estadoDelTitulo", titulo: "Estado del título" },
      { clave: "evento", titulo: "Evento" },
      { clave: "categoria", titulo: "Categoría" },
      { clave: "codigoTitulo", titulo: "Código del título" },
    ],
  },
];

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

function formatCell(value: unknown, fecha?: boolean): string {
  if (value === null || value === undefined || value === "") return "—";
  if (fecha && typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
  }
  if (Array.isArray(value)) return value.length === 0 ? "—" : value.map(String).join("\n");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function Seccion({ def, total, esAdmin, todos }: { def: (typeof SECCIONES)[number]; total: number | null; esAdmin: boolean; todos: boolean }) {
  const [abierta, setAbierta] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargada, setCargada] = useState(false);

  const query = useCallback(
    (extra: string) => `/api/historial/forense?seccion=${def.id}${todos ? "&todos=1" : ""}${extra}`,
    [def.id, todos],
  );

  const cargar = useCallback(
    async (desde: string | null) => {
      setCargando(true);
      setError(null);
      try {
        const res = await fetch(query(desde ? `&cursor=${encodeURIComponent(desde)}` : ""));
        if (!res.ok) throw new Error("No se pudo cargar esta sección.");
        const data = await res.json();
        setRows((prev) => (desde ? [...prev, ...data.rows] : data.rows));
        setCursor(data.nextCursor ?? null);
        setCargada(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo cargar esta sección.");
      } finally {
        setCargando(false);
      }
    },
    [query],
  );

  // Al cambiar de "este sitio" a "todos mis sitios", se vuelve a cargar.
  useEffect(() => {
    setRows([]);
    setCursor(null);
    setCargada(false);
  }, [todos]);

  useEffect(() => {
    if (abierta && !cargada && !cargando) void cargar(null);
  }, [abierta, cargada, cargando, cargar]);

  return (
    <details style={cardStyle} onToggle={(e) => setAbierta((e.currentTarget as HTMLDetailsElement).open)}>
      <summary
        style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, userSelect: "none" }}
      >
        <div>
          <p className="eyebrow" style={{ margin: "0 0 2px", color: "#6e6e73" }}>{def.eyebrow}</p>
          <h2 style={{ ...h2Style, margin: 0 }}>{def.titulo}</h2>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>{total === null ? "…" : total}</span>
      </summary>
      <div style={{ marginTop: 14 }}>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{def.ayuda}</p>
        {esAdmin && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <a href={query("&formato=csv")} style={{ ...secondaryButtonStyle, padding: "4px 10px", fontSize: 12, textDecoration: "none" }}>
              Exportar CSV
            </a>
          </div>
        )}
        {error && <p style={{ fontSize: 12, color: "#ff3b30" }}>{error}</p>}
        {cargada && rows.length === 0 && !error ? (
          <p className="muted" style={{ fontSize: 13 }}>No hay registros en esta sección.</p>
        ) : (
          rows.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr>
                    {def.columnas.map((c) => (
                      <th key={c.clave} style={thStyle}>{c.titulo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} style={{ borderTop: "1px solid #e5e5ea" }}>
                      {def.columnas.map((c) => (
                        <td key={c.clave} style={{ ...tdStyle, whiteSpace: "pre-line", fontSize: 13 }}>{formatCell(row[c.clave], c.fecha)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {cargando && <p className="muted" style={{ fontSize: 13 }}>Cargando...</p>}
        {cursor && !cargando && (
          <button type="button" className="secondary" onClick={() => void cargar(cursor)} style={{ ...secondaryButtonStyle, marginTop: 10, padding: "4px 10px", fontSize: 12 }}>
            Ver más
          </button>
        )}
      </div>
    </details>
  );
}

export default function HistorialForense() {
  const [resumen, setResumen] = useState<Record<string, number> | null>(null);
  const [todos, setTodos] = useState(false);
  const [esAdmin, setEsAdmin] = useState(false);

  // La exportación a CSV es solo del administrador (también cuando actúa como
  // otro usuario). Si /api/me falla, simplemente no se ofrece el botón.
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEsAdmin(Boolean(d && (d.role === "admin" || d.isActingAdmin))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let vivo = true;
    setResumen(null);
    fetch(`/api/historial/forense?seccion=resumen${todos ? "&todos=1" : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vivo && d?.resumen) setResumen(d.resumen);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [todos]);

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 24 }}>
        <div>
          <p className="eyebrow" style={{ margin: "0 0 2px" }}>Más detalle</p>
          <h2 style={{ ...h2Style, margin: 0 }}>Historiales completos</h2>
        </div>
        <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} />
          Todos mis sitios
        </label>
      </div>
      {SECCIONES.map((def) => (
        <Seccion key={def.id} def={def} total={resumen ? (resumen[def.id] ?? 0) : null} esAdmin={esAdmin} todos={todos} />
      ))}
      <HistorialExplicaciones />
    </>
  );
}
