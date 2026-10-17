import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import NetworkAdminPanel, { type NetworkAdminConfig } from "@/components/NetworkAdminPanel";

const config: NetworkAdminConfig = {
  title: "Pinterest",
  intro: "Credenciales de la aplicación de Pinterest de la plataforma. Se guardan cifradas y nunca se muestran completas.",
  settingsPath: "/api/search-integrations/pinterest/settings",
  idLabel: "App ID de Pinterest",
  secretLabel: "App secret key de Pinterest",
  callbackPath: "/api/search-integrations/pinterest/callback",
  notice: "Hoy Pinterest se conecta por el panel de Composio (Composio Managed): para eso no hace falta nada aquí. Estos campos solo sirven para la conexión directa antigua.",
  steps: [
    <>Entra a <a href="https://developers.pinterest.com/apps/" target="_blank" rel="noreferrer">developers.pinterest.com/apps</a> y abre la aplicación.</>,
    <>Copia el <strong>App ID</strong> y la <strong>App secret key</strong> y pégalos abajo.</>,
    <>En <strong>Redirect URIs</strong>, agrega las dos direcciones de «Agregar también». No borres la que ya está.</>,
  ],
};

export default async function PinterestPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");
  return <NetworkAdminPanel config={config} />;
}
