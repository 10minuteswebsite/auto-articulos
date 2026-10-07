import { HUB_URL } from "@/lib/product-routes";
import LogoutButton from "@/components/LogoutButton";
import StopImpersonationButton from "@/components/StopImpersonationButton";

type PlatformUser = {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role?: string;
};

export default function HubPlatformHeader({ user, actingAdmin }: { user: PlatformUser; actingAdmin: PlatformUser | null }) {
  // Match the Hub exactly: impersonating a tenant does not grant that tenant
  // an Administration link. The admin keeps management in the Hub banner.
  const canManage = user.role === "admin";

  return (
    <>
      {actingAdmin && (
        <div role="status" aria-live="polite" style={{ borderBottom: "1px solid #f2dfb2", background: "#fffbea", color: "#6f3f08" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", maxWidth: 1280, margin: "0 auto", padding: "10px 24px", fontSize: 14 }}>
            <span><strong>Impersonificación activa.</strong> Estás viendo el Hub como el tenant seleccionado. Administrador: {actingAdmin.email}.</span>
            <a href={`${HUB_URL}/dashboard`} style={{ border: "1px solid #f2c078", borderRadius: 9, background: "#ffffff", color: "#6f3f08", padding: "7px 12px", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>Gestionar desde el Hub</a>
          </div>
        </div>
      )}
      <header
        aria-label="Navegación de LA SOLUCIÓN IA"
        style={{
          borderBottom: "1px solid #e5e5ea",
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(18px)",
          position: "relative",
          zIndex: 30,
      }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap", maxWidth: 1280, margin: "0 auto", padding: "14px 24px" }}>
          <a href={`${HUB_URL}/dashboard`} style={{ display: "flex", alignItems: "center", gap: 12, color: "#1d1d1f", textDecoration: "none", minWidth: 190 }}>
            <span aria-hidden="true" style={{ display: "flex", height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, background: "#050505", color: "#ffffff", fontSize: 13, fontWeight: 700 }}>L</span>
            <strong style={{ fontSize: 16, letterSpacing: "-0.02em" }}>LA SOLUCIÓN IA</strong>
          </a>
          <nav aria-label="Secciones del Hub" style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", flex: 1 }}>
            <a href={`${HUB_URL}/dashboard`} style={{ ...navLinkStyle, background: "#f1f1f3", color: "#1d1d1f" }}>Aplicaciones</a>
            <a href={`${HUB_URL}/billing`} style={navLinkStyle}>Facturación</a>
            <a href={`${HUB_URL}/profile`} style={navLinkStyle}>Perfil</a>
            {canManage && <a href={`${HUB_URL}/admin`} style={{ ...navLinkStyle, border: "1px solid #e5e5ea" }}>Administración</a>}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <div style={{ textAlign: "right", minWidth: 120 }}>
              <span style={{ display: "block", color: "#6e6e73", fontSize: 12 }}>{user.email}</span>
              {actingAdmin && <span style={{ display: "block", color: "#8a4b08", fontSize: 11, fontWeight: 700 }}>Sesión administrada</span>}
            </div>
            {actingAdmin && <StopImpersonationButton />}
            <LogoutButton />
          </div>
        </div>
      </header>
    </>
  );
}

const navLinkStyle = {
  color: "#3a3a3c",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 10px",
  borderRadius: 8,
  textDecoration: "none",
} as const;
