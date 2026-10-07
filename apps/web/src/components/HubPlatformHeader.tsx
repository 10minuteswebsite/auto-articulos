import { HUB_URL } from "@/lib/product-routes";
import { displayName } from "@/lib/current-user";
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
  const canManage = user.role === "admin" || Boolean(actingAdmin);

  return (
    <>
      {actingAdmin && (
        <div role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "10px 14px", marginBottom: 10, border: "1px solid #f2c078", borderRadius: 12, background: "#fff7e6", color: "#7a4100", fontSize: 13, fontWeight: 600 }}>
          <span>Impersonificación activa: estás viendo la cuenta de {displayName(user)}. Administrador: {actingAdmin.email}.</span>
          <a href={`${HUB_URL}/dashboard`} style={{ color: "#7a4100", textDecoration: "underline", whiteSpace: "nowrap" }}>Gestionar desde el Hub</a>
        </div>
      )}
      <header
        aria-label="Navegación de LA SOLUCIÓN IA"
        style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 18,
        flexWrap: "wrap",
        padding: "14px 18px",
        marginBottom: 18,
        border: "1px solid #e5e5ea",
        borderRadius: 16,
        background: "linear-gradient(110deg, #f7f7fb 0%, #ffffff 58%, #f2f7ff 100%)",
        boxShadow: "0 2px 12px rgba(29, 29, 31, 0.04)",
      }}
    >
      <a href={`${HUB_URL}/dashboard`} style={{ color: "#1d1d1f", textDecoration: "none", minWidth: 190 }}>
        <strong style={{ display: "block", fontSize: 17, letterSpacing: "-0.02em" }}>LA SOLUCIÓN IA</strong>
        <span style={{ display: "block", marginTop: 2, color: "#6e6e73", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Plataforma</span>
      </a>
      <nav aria-label="Secciones del Hub" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1 }}>
        <a href={`${HUB_URL}/dashboard`} style={navLinkStyle}>Aplicaciones</a>
        <a href={`${HUB_URL}/billing`} style={navLinkStyle}>Facturación</a>
        <a href={`${HUB_URL}/profile`} style={navLinkStyle}>Perfil</a>
        {canManage && <a href={`${HUB_URL}/admin`} style={navLinkStyle}>Administración</a>}
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <div style={{ textAlign: "right", minWidth: 120 }}>
          <span style={{ display: "block", color: "#6e6e73", fontSize: 12 }}>{displayName(user)}</span>
          {actingAdmin && <span style={{ display: "block", color: "#8a4b08", fontSize: 11, fontWeight: 700 }}>Sesión administrada</span>}
        </div>
        {actingAdmin && <StopImpersonationButton />}
        <LogoutButton />
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
