import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import NetworkAdminPanel, { type NetworkAdminConfig } from "@/components/NetworkAdminPanel";

const config: NetworkAdminConfig = {
  title: "LinkedIn",
  intro: "Credenciales OAuth de la aplicación de LinkedIn de la plataforma. Se guardan cifradas y nunca se muestran completas.",
  settingsPath: "/api/search-integrations/linkedin/settings",
  callbackPath: "/api/search-integrations/linkedin/callback",
  steps: [
    <>Entra a <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noreferrer">linkedin.com/developers/apps</a> con la cuenta que creó la aplicación y ábrela.</>,
    <>Pestaña <strong>Auth</strong>: copia el <strong>Client ID</strong> y el <strong>Primary Client Secret</strong> y pégalos abajo.</>,
    <>En esa pestaña, en <strong>Authorized redirect URLs for your app</strong>, agrega las dos direcciones de «Agregar también» y pulsa <strong>Update</strong>. No borres la que ya está.</>,
    <>Pestaña <strong>Products</strong>: comprueba que estén activos <strong>Sign In with LinkedIn using OpenID Connect</strong> y <strong>Share on LinkedIn</strong>.</>,
  ],
};

export default async function LinkedInPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");
  return <NetworkAdminPanel config={config} />;
}
