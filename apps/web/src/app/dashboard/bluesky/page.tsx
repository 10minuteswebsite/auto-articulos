import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import NetworkAdminPanel, { type NetworkAdminConfig } from "@/components/NetworkAdminPanel";

const config: NetworkAdminConfig = {
  title: "Bluesky",
  intro: "Bluesky no usa una aplicación de la plataforma: no hay Client ID ni Client Secret ni direcciones de retorno que registrar.",
  settingsPath: null,
  steps: [
    <>Cada persona conecta su propia cuenta en <strong>Configuración → Conexiones → Bluesky</strong>, con su usuario (por ejemplo nombre.bsky.social) y una <strong>contraseña de aplicación</strong>.</>,
    <>La contraseña de aplicación se crea en Bluesky: <strong>Settings → Privacy and security → App passwords</strong>. Nunca debe usarse la contraseña principal.</>,
    <>No hay nada que configurar aquí.</>,
  ],
};

export default async function BlueskyPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");
  return <NetworkAdminPanel config={config} />;
}
