import type { CSSProperties } from "react";
import LogoutButton from "@/components/LogoutButton";
import StopImpersonationButton from "@/components/StopImpersonationButton";

const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL || "https://hub.lasolucionweb.net";

const headerLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 8,
  color: "#6b7280",
  fontSize: 14,
  fontWeight: 400,
  lineHeight: "20px",
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
      className="ecosystem-header global-topbar"
      aria-label="Navegación principal de LA SOLUCIÓN IA"
      style={{
        width: "100%",
        position: "sticky",
        top: 0,
        zIndex: 30,
        minHeight: 64,
        borderBottom: "1px solid rgba(229, 231, 235, 0.8)",
        background: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      <style>{`
        .ecosystem-header .global-topbar-inner {
          width: 100%;
          max-width: 1280px;
          min-height: 64px;
          margin: 0 auto;
          padding: 12px 16px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          column-gap: 24px;
          row-gap: 12px;
          box-sizing: border-box;
        }
        .ecosystem-header .global-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
          color: #030712;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.025em;
          white-space: nowrap;
        }
        .ecosystem-header .global-brand-mark {
          display: flex;
          width: 32px;
          height: 32px;
          align-items: center;
          justify-content: center;
          border-radius: 12px !important;
          background: #030712;
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: -0.025em;
        }
        .ecosystem-header .global-nav {
          order: 3;
          display: flex;
          flex-basis: 100%;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px;
          margin: 0;
          font-size: 14px;
        }
        .ecosystem-header .global-nav a {
          padding: 8px 12px;
          border-radius: 8px !important;
          color: #6b7280;
          font-size: 14px;
          font-weight: 400;
          line-height: 20px;
        }
        .ecosystem-header .global-nav a:hover {
          background: #f9fafb !important;
          color: #030712 !important;
        }
        .ecosystem-header .global-nav a.is-active {
          background: #f3f4f6 !important;
          color: #030712 !important;
          font-weight: 500;
        }
        .ecosystem-header .global-nav a[href*="/admin/"] {
          margin-left: 4px;
          border: 1px solid #e5e7eb;
          color: #4b5563;
        }
        .ecosystem-header .global-account {
          order: 0;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
          color: #6b7280;
          font-size: 12px;
        }
        .ecosystem-header .global-account > span {
          display: none;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ecosystem-header .global-account .quiet-button {
          padding: 8px 12px !important;
          border: 1px solid #d1d5db !important;
          border-radius: 8px !important;
          background: #fff !important;
          color: #030712 !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          line-height: 20px !important;
        }
        @media (min-width: 640px) {
          .ecosystem-header .global-topbar-inner { padding-right: 24px; padding-left: 24px; }
          .ecosystem-header .global-nav { order: 2; flex-basis: auto; width: auto; overflow: visible; padding-bottom: 0; }
          .ecosystem-header .global-account { order: 3; }
        }
        @media (min-width: 768px) {
          .ecosystem-header .global-account > span { display: inline; }
        }
        @media (min-width: 1024px) {
          .ecosystem-header .global-topbar-inner { padding-right: 32px; padding-left: 32px; }
        }
        @media (max-width: 639px) {
          .ecosystem-header .global-topbar-inner { column-gap: 12px; }
          .ecosystem-header .global-nav { width: 100%; overflow-x: auto; flex-wrap: nowrap; padding-bottom: 2px; }
          .ecosystem-header .global-nav a { padding: 6px 8px; font-size: 12px; }
          .ecosystem-header .global-account .quiet-button { padding: 7px 10px; font-size: 12px; }
          .ecosystem-header .global-brand { font-size: 14px; }
          .ecosystem-header .global-brand-mark { width: 30px; height: 30px; border-radius: 11px !important; }
        }
      `}</style>
      <div
        className="global-topbar-inner"
        style={{
          maxWidth: 1280,
        }}
      >
        <a
          className="global-brand"
          href={`${HUB_URL}/dashboard`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            color: "#030712",
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          <span
            className="global-brand-mark"
            aria-hidden="true"
            style={{
              width: 32,
              height: 32,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              background: "#030712",
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
          className="ecosystem-main-nav global-nav"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            order: 2,
            flex: "1 1 auto",
          }}
        >
          <a className="is-active" href={`${HUB_URL}/dashboard`} style={{ ...headerLinkStyle, color: "#030712", background: "#f3f4f6", fontWeight: 500 }}>
            Aplicaciones
          </a>
          <a href={`${HUB_URL}/billing`} style={headerLinkStyle}>
            Facturación
          </a>
          <a href={`${HUB_URL}/profile`} style={headerLinkStyle}>
            Perfil
          </a>
          {isAdmin && (
            <a href={`${HUB_URL}/admin`} style={{ ...headerLinkStyle, marginLeft: 4, border: "1px solid #e5e7eb", color: "#4b5563" }}>
              Admin Hub
            </a>
          )}
        </nav>

        <div
          className="ecosystem-session global-account"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 16,
            order: 3,
            minWidth: 0,
          }}
        >
          <span title={email} style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#6e6e73", fontSize: 12 }}>
            {email}
          </span>
          {actingAdmin && <StopImpersonationButton />}
          <LogoutButton className="quiet-button" label="Salir" redirectTo={`${HUB_URL}/auth/logout`} />
        </div>
      </div>
    </header>
  );
}
