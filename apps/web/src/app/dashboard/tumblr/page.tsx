import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import NetworkAdminPanel, { type NetworkAdminConfig } from "@/components/NetworkAdminPanel";

const config: NetworkAdminConfig = {
  title: "Tumblr",
  intro: "Credenciales OAuth de la aplicación de Tumblr de la plataforma. Se guardan cifradas y nunca se muestran completas.",
  settingsPath: "/api/search-integrations/tumblr/settings",
  idLabel: "OAuth Consumer Key de Tumblr",
  secretLabel: "OAuth Consumer Secret de Tumblr",
  callbackPath: "/api/search-integrations/tumblr/callback",
  steps: [
    <>Entra a <a href="https://www.tumblr.com/oauth/apps" target="_blank" rel="noreferrer">tumblr.com/oauth/apps</a> y abre la aplicación de la plataforma.</>,
    <>Copia el <strong>OAuth Consumer Key</strong> y el <strong>OAuth Consumer Secret</strong> (este último con «Show secret key») y pégalos abajo.</>,
    <>En <strong>Default callback URL</strong> y <strong>OAuth2 redirect URLs</strong>, agrega las dos direcciones de «Agregar también». No borres la que ya está.</>,
  ],
};

export default async function TumblrPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");
  return <NetworkAdminPanel config={config} />;
}
