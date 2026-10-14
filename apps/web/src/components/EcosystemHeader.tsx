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

export type ProductIdentity = {
  hubLabel: string;
  appLabel: string;
};

export default function EcosystemHeader({
  email,
  isAdmin,
  actingAdminName,
  actingUserName,
  product,
}: {
  email: string;
  isAdmin: boolean;
  actingAdminName?: string;
  actingUserName?: string;
  product: ProductIdentity;
}) {
  return (
    <>
      <header
        className="ecosystem-header"
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
            aria-label="Navegación principal"
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
                Administración
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
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, minWidth: 0 }}>
              <span
                title={email}
                style={{
                  maxWidth: 220,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "#6e6e73",
                  fontSize: 12,
                }}
              >
                {email}
              </span>
              {actingAdminName && actingUserName && (
                <span style={{ maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#8a4b08", fontSize: 11, fontWeight: 600 }}>
                  Actuando como: {actingUserName}
                </span>
              )}
            </div>
            {actingAdminName && <StopImpersonationButton />}
            <LogoutButton label="Salir" redirectTo={`${HUB_URL}/auth/logout`} />
          </div>
        </div>
      </header>

      <div
        className="product-header"
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "16px 24px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <a
            href={`${HUB_URL}/dashboard`}
            style={{
              color: "#6e6e73",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            ← Volver al Hub
          </a>
          <span aria-hidden="true" style={{ color: "#d2d2d7" }}>
            |
          </span>
          <a
            href="/dashboard"
            style={{
              color: "#1d1d1f",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {product.hubLabel}
          </a>
          <span aria-hidden="true" style={{ color: "#d2d2d7" }}>
            /
          </span>
          <span style={{ color: "#6e6e73", fontSize: 14, fontWeight: 500 }}>
            {product.appLabel}
          </span>
        </div>
        <span style={{ color: "#86868b", fontSize: 12 }}>
          Navegación de la aplicación
        </span>
      </div>
    </>
  );
}
