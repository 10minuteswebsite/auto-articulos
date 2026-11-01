"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { h2Style, secondaryButtonStyle, thStyle, tdStyle } from "@/components/dashboard-ui";
import HistorialExplicaciones from "@/components/HistorialExplicaciones";

// Historiales forenses de Artículos: debajo de los históricos de siempre.
// Cada sección carga SOLO cuando se abre (no recarga el Historial entero) y
// pagina de 50 en 50. Solo lectura.

type SeccionId = "errores" | "cancelados" | "en-curso" | "descartados" | "propuestos" | "seguimiento" | "pasos-tecnicos";
type Row = Record<string, unknown> & { id: string };
type Columna = { clave: string; titulo: string; fecha?: boolean; soloAdmin?: boolean; tipo?: "icono" | "enlace" };

const SECCIONES: Array<{ id: SeccionId; eyebrow: string; titulo: string; ayuda: string; columnas: Columna[]; soloAdmin?: boolean }> = [
  {
    id: "errores",
    soloAdmin: true,
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
      { clave: "codigoTecnico", titulo: "Código del error (para soporte)" },
      { clave: "id", titulo: "Código del título", soloAdmin: true },
    ],
  },
  {
    id: "cancelados",
    soloAdmin: true,
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
      { clave: "id", titulo: "Código del título", soloAdmin: true },
    ],
  },
  {
    id: "en-curso",
    soloAdmin: true,
    eyebrow: "En marcha",
    titulo: "En curso o en cola",
    ayuda: "Títulos que todavía esperan o se están procesando. Si llevan mucho tiempo aquí, algo se atascó.",
    columnas: [
      { clave: "titulo", titulo: "Título" },
      { clave: "categoria", titulo: "Categoría" },
      { clave: "icono", titulo: "Estado", tipo: "icono" },
      { clave: "intentos", titulo: "Intentos" },
      { clave: "ejecucionCreada", titulo: "Desde", fecha: true },
      { clave: "ultimoEvento", titulo: "Último paso registrado" },
      { clave: "id", titulo: "Código del título", soloAdmin: true },
    ],
  },
  {
    id: "descartados",
    soloAdmin: true,
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
      { clave: "id", titulo: "Código", soloAdmin: true },
    ],
  },
  {
    id: "propuestos",
    soloAdmin: true,
    eyebrow: "Temas",
    titulo: "Temas que te propusimos",
    ayuda: "Cada vez que le pediste ideas de títulos a la inteligencia artificial: qué le pediste y qué títulos te ofreció.",
    columnas: [
      { clave: "fecha", titulo: "Fecha", fecha: true },
      { clave: "categoria", titulo: "Categoría" },
      { clave: "loQuePediste", titulo: "Lo que pediste" },
      { clave: "titulosOfrecidos", titulo: "Títulos que te ofrecimos" },
    ],
  },
  {
    id: "seguimiento",
    eyebrow: "Registro",
    titulo: "Tus artículos",
    ayuda: "Del más reciente al más antiguo. ✓ se publicó, ✗ no se pudo.",
    columnas: [
      { clave: "icono", titulo: "Estado", tipo: "icono" },
      { clave: "titulo", titulo: "Artículo" },
      { clave: "categoria", titulo: "Categoría", soloAdmin: true },
      { clave: "pedido", titulo: "Lo pediste", fecha: true, soloAdmin: true },
      { clave: "publicado", titulo: "Se publicó", fecha: true },
      { clave: "enlace", titulo: "Enlace", tipo: "enlace" },
      { clave: "quePaso", titulo: "Qué pasó" },
    ],
  },
  {
    id: "pasos-tecnicos",
    eyebrow: "Solo administrador",
    titulo: "Pasos técnicos del sistema",
    ayuda: "El registro interno completo, paso a paso, para investigar problemas. No es para clientes.",
    soloAdmin: true,
    columnas: [
      { clave: "fecha", titulo: "Fecha", fecha: true },
      { clave: "titulo", titulo: "Título" },
      { clave: "estadoDelTitulo", titulo: "Estado del título" },
      { clave: "evento", titulo: "Paso registrado" },
      { clave: "categoria", titulo: "Categoría" },
      { clave: "codigoTitulo", titulo: "Código del título", soloAdmin: true },
    ],
  },
];

const cardStyle: CSSProperties = {
  background: "transparent",
  color: "#1d1d1f",
  border: "none",
  borderTop: "1px solid #e5e5ea",
  borderRadius: 0,
  padding: "14px 0 4px",
  marginTop: 12,
  boxSizing: "border-box",
  width: "100%",
};

// Mismo recuadro que usan las demás secciones del Historial (cardSectionStyle
// de historial/page.tsx): tarjeta blanca con borde y esquinas suaves.
const marcoStyle: CSSProperties = {
  background: "#ffffff",
  color: "#1d1d1f",
  border: "1px solid #d2d2d7",
  borderRadius: 6,
  padding: "18px",
  marginTop: 12,
  boxShadow: "none",
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

const ICONOS: Record<string, { simbolo: string; color: string; texto: string }> = {
  ok: { simbolo: "✓", color: "#34c759", texto: "Publicado" },
  error: { simbolo: "✗", color: "#ff3b30", texto: "No se pudo publicar" },
  cancelado: { simbolo: "✗", color: "#8e8e93", texto: "Cancelado" },
  espera: { simbolo: "⏳", color: "#8a4b08", texto: "En proceso" },
};

function renderCelda(c: Columna, row: Row) {
  const valor = row[c.clave];
  if (c.tipo === "icono") {
    const icono = ICONOS[String(valor)] ?? ICONOS.espera;
    return <span title={icono.texto} aria-label={icono.texto} style={{ color: icono.color, fontSize: 18, fontWeight: 700 }}>{icono.simbolo}</span>;
  }
  if (c.tipo === "enlace") {
    return typeof valor === "string" && valor ? (
      <a href={valor} target="_blank" rel="noopener noreferrer" style={{ color: "#0071e3", fontWeight: 600, textDecoration: "none" }}>Ver artículo ↗</a>
    ) : (
      "—"
    );
  }
  return formatCell(valor, c.fecha);
}

function Seccion({ def, total, esAdmin, todos }: { def: (typeof SECCIONES)[number]; total: number | null; esAdmin: boolean; todos: boolean }) {
  const [abierta, setAbierta] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargada, setCargada] = useState(false);
  const columnas = def.columnas.filter((c) => !c.soloAdmin || esAdmin);

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
                    {columnas.map((c) => (
                      <th key={c.clave} style={thStyle}>{c.titulo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} style={{ borderTop: "1px solid #e5e5ea" }}>
                      {columnas.map((c) => (
                        <td key={c.clave} style={{ ...tdStyle, whiteSpace: "pre-line", fontSize: 13 }}>{renderCelda(c, row)}</td>
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
  // Todo el bloque nace COLAPSADO y no consulta nada hasta que alguien lo abre:
  // a la mayoría de las personas no les hace falta, y mientras más se les
  // explica más preguntas surgen (pedido de Milton, 2026-11-01).
  const [abierto, setAbierto] = useState(false);
  const [resumen, setResumen] = useState<Record<string, number> | null>(null);
  const [todos, setTodos] = useState(false);
  const [esAdmin, setEsAdmin] = useState(false);

  // La exportación a CSV es solo del administrador (también cuando actúa como
  // otro usuario). Si /api/me falla, simplemente no se ofrece el botón.
  useEffect(() => {
    if (!abierto) return;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEsAdmin(Boolean(d && (d.role === "admin" || d.isActingAdmin))))
      .catch(() => {});
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
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
  }, [todos, abierto]);

  const principales = SECCIONES.filter((def) => !def.soloAdmin);
  const soloAdministrador = SECCIONES.filter((def) => def.soloAdmin);
  const verSeccion = (def: (typeof SECCIONES)[number]) => (
    <Seccion key={def.id} def={def} total={resumen ? (resumen[def.id] ?? 0) : null} esAdmin={esAdmin} todos={todos} />
  );

  return (
    <details style={marcoStyle} onToggle={(e) => setAbierto((e.currentTarget as HTMLDetailsElement).open)}>
      <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, userSelect: "none" }}>
        <div>
          <p className="eyebrow" style={{ margin: "0 0 2px" }}>Registro</p>
          <h2 style={{ ...h2Style, margin: 0 }}>Historiales completos</h2>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>Ver detalle</span>
      </summary>
      <HistorialExplicaciones />
      {principales.map(verSeccion)}
      {esAdmin && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ cursor: "pointer", fontSize: 13, color: "#6e6e73", userSelect: "none" }}>Detalle para el administrador</summary>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} />
              Todos mis sitios
            </label>
          </div>
          {soloAdministrador.map(verSeccion)}
        </details>
      )}
    </details>
  );
}
