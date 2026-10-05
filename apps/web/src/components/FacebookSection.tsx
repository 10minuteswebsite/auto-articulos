"use client";

import OAuthNetworkSection, { type OAuthNetworkConfig } from "./OAuthNetworkSection";
import ComposioConnect from "./ComposioConnect";

const FACEBOOK: OAuthNetworkConfig = {
  id: "facebook-pages",
  title: "Facebook",
  lead: "En este sitio conectas la Página de Facebook que administras para que SEO TOTAL pueda publicar los artículos o el contenido seleccionado por la IA que tú apruebes.",
  note: "Autorizas directamente en Meta. SEO TOTAL no ve tu contraseña y publica mediante la API de Páginas de Facebook.",
  accountKey: "facebookPageName",
  admin: {
    title: "Credenciales de la aplicación Meta",
    help: "App ID y App Secret de la aplicación Meta que tiene habilitado Facebook Pages API.",
    idLabel: "App ID",
    secretLabel: "App Secret",
    keys: { shown: "appId", raw: "rawAppId", bodyId: "appId", bodySecret: "appSecret" },
  },
};

export default function FacebookSection() {
  return (
    <>
      <OAuthNetworkSection config={FACEBOOK} />
      <ComposioConnect inline showInactiveActions apps={["facebook"]} />
    </>
  );
}
