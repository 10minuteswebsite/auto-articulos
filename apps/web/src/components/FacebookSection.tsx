"use client";

import { type OAuthNetworkConfig } from "./OAuthNetworkSection";
import ComposioConnect from "./ComposioConnect";

export const FACEBOOK: OAuthNetworkConfig = {
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
      {/*
       * La conexión operativa nueva de Facebook es Composio. Conservamos la
       * configuración OAuth directa arriba como legado documentado para no
       * borrar ni romper cuentas antiguas, pero no la montamos en la interfaz:
       * las nuevas conexiones deben pasar por Composio.
       *
       * <OAuthNetworkSection config={FACEBOOK} />
       */
      }
      <ComposioConnect inline showInactiveActions apps={["facebook"]} />
    </>
  );
}
