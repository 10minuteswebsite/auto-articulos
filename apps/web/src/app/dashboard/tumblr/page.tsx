import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import NetworkAdminPanel, { type NetworkAdminConfig } from "@/components/NetworkAdminPanel";

const config: NetworkAdminConfig = {
  title: "Tumblr",
  intro: "Credenciales OAuth de la aplicación de Tumblr de la plataforma. Se guardan cifradas y nunca se muestran completas.",
  settingsPath: "/api/search-integrations/tumblr/settings",
  idLabel: "OAuth Consumer Key de Tumblr",
  secretLabel: "OAuth Consumer Secret de Tumblr",
  fixedCallback: "https://redes.lasolucionweb.net/api/search-integrations/tumblr/callback",
  steps: [
    <>Entra a <a href="https://www.tumblr.com/oauth/apps" target="_blank" rel="noreferrer">tumblr.com/oauth/apps</a> y abre la aplicación de la plataforma.</>,
    <>Copia el <strong>OAuth Consumer Key</strong> y el <strong>OAuth Consumer Secret</strong> (este último con «Show secret key») y pégalos abajo.</>,
    <>En <strong>URL de retrollamada (Default callback URL)</strong> y en <strong>URL de redirección de OAuth2</strong>, deja SOLO la dirección de abajo y pulsa <strong>Guardar cambios</strong>. Tumblr admite una sola.</>,
  ],
};

export default async function TumblrPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");
  return <NetworkAdminPanel config={config} />;
}
