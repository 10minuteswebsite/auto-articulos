"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL || "https://hub.lasolucionweb.net";

const LABELS: Record<string, string> = {
  dashboard: "Inicio",
  publicar: "Publicar",
  oportunidades: "Oportunidades con IA",
  "oportunidades-redes": "Oportunidades para Redes Sociales",
  "publicaciones-en-curso": "Publicaciones en curso",
  historial: "Historial",
  estadisticas: "Estadísticas",
  configuracion: "Configuración",
  conexiones: "Conexiones",
  contenido: "Contenido",
  cuenta: "Cuenta",
  indexacion: "Indexación",
  movil: "Móvil",
  mcp: "Asistentes IA",
  inicial: "Configuración inicial",
  actualizaciones: "Actualizaciones",
  "como-funciona": "Cómo funciona",
  usuarios: "Usuarios",
  composio: "Composio",
  postpeer: "PostPeer",
  "vista-previa-bloqueo": "Vista previa de bloqueo",
};

function labelFor(segment: string) {
  return LABELS[segment] ?? segment.replace(/-/g, " ");
}

export default function AppBreadcrumbs({ productLabel }: { productLabel: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const dashboardIndex = segments.indexOf("dashboard");
  const appSegments = dashboardIndex >= 0 ? segments.slice(dashboardIndex) : ["dashboard"];

  const crumbs = appSegments.map((segment, index) => ({
    label: index === 0 ? productLabel : labelFor(segment),
    href: index === 0 ? "/dashboard" : `/${appSegments.slice(0, index + 1).join("/")}`,
    current: index === appSegments.length - 1,
  }));

  return (
    <nav
      aria-label="Ruta de navegación"
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 7,
        margin: "0 0 20px",
        padding: "6px 0",
        border: "0",
        borderRadius: 0,
        background: "transparent",
        color: "#43566d",
        fontSize: 12,
        lineHeight: 1.4,
        boxSizing: "border-box",
      }}
    >
      <a href={`${HUB_URL}/dashboard`} style={{ color: "#526579", textDecoration: "none", fontWeight: 600 }}>
        LA SOLUCIÓN IA
      </a>
      <span aria-hidden="true">›</span>
      {crumbs.map((crumb, index) => (
        <span key={crumb.href} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          {index > 0 && <span aria-hidden="true">›</span>}
          {crumb.current ? (
            <span aria-current="page" style={{ color: "#1d1d1f", fontWeight: 600 }}>
              {crumb.label}
            </span>
          ) : (
            <Link href={crumb.href} style={{ color: "#6e6e73", textDecoration: "none" }}>
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
