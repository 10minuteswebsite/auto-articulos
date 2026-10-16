import type { CSSProperties } from "react";
import LogoutButton from "@/components/LogoutButton";
import StopImpersonationButton from "@/components/StopImpersonationButton";

const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL || "https://hub.lasolucionweb.net";

const headerLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 9,
  color: "#6e6e73",
  fontSize: 13,
  fontWeight: 500,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

export default function EcosystemHeader({
  email,
  isAdmin,
  actingAdmin,
}: {
  email: string;
  isAdmin: boolean;
  actingAdmin: boolean;
}) {
  return (
    <header
      className="ecosystem-header"
      aria-label="Navegación principal de LA SOLUCIÓN IA"
      style={{
        width: "100%",
        borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
        background: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          minHeight: 64,
          margin: "0 auto",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          boxSizing: "border-box",
        }}
      >
        <a
          href={`${HUB_URL}/dashboard`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            color: "#1d1d1f",
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 32,
              height: 32,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 11,
              background: "#1d1d1f",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            L
          </span>
          LA SOLUCIÓN IA
        </a>

        <nav
          aria-label="Secciones del Hub"
          className="ecosystem-main-nav"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            order: 2,
            flex: "1 1 auto",
          }}
        >
          <a href={`${HUB_URL}/dashboard`} style={{ ...headerLinkStyle, color: "#1d1d1f", background: "#f5f5f7", fontWeight: 600 }}>
            Aplicaciones
          </a>
          <a href={`${HUB_URL}/billing`} style={headerLinkStyle}>
            Facturación
          </a>
          <a href={`${HUB_URL}/profile`} style={headerLinkStyle}>
            Perfil
          </a>
          {isAdmin && (
            <a href={`${HUB_URL}/admin`} style={{ ...headerLinkStyle, marginLeft: 4 }}>
              Admin Hub
            </a>
          )}
        </nav>

        <div
          className="ecosystem-session"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 14,
            order: 3,
            minWidth: 0,
          }}
        >
          <span title={email} style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#6e6e73", fontSize: 12 }}>
            {email}
          </span>
          {actingAdmin && <StopImpersonationButton />}
          <LogoutButton label="Salir" redirectTo={`${HUB_URL}/auth/logout`} />
        </div>
      </div>
    </header>
  );
}
