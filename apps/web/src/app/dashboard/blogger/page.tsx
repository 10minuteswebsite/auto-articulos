import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import NetworkAdminPanel, { type NetworkAdminConfig } from "@/components/NetworkAdminPanel";

const config: NetworkAdminConfig = {
  title: "Blogger",
  intro: "Credenciales OAuth de Google para Blogger. Se guardan cifradas y nunca se muestran completas.",
  settingsPath: "/api/search-integrations/blogger/settings",
  callbackPath: "/api/search-integrations/blogger/callback",
  notice: "Si ya existen las credenciales de Google compartidas (Search Console y Analytics), Blogger las usa y no deja guardar otras.",
  steps: [
    <>Entra a <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">console.cloud.google.com/apis/credentials</a> y abre el cliente OAuth de la plataforma.</>,
    <>Copia el <strong>Client ID</strong> y el <strong>Client secret</strong> y pégalos abajo.</>,
    <>En <strong>Authorized redirect URIs</strong>, agrega las dos direcciones de «Agregar también». No borres la que ya está.</>,
    <>En <strong>APIs y servicios → Biblioteca</strong>, comprueba que <strong>Blogger API v3</strong> esté habilitada.</>,
  ],
};

export default async function BloggerPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");
  return <NetworkAdminPanel config={config} />;
}
