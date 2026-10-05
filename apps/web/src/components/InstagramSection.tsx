"use client";

import { type OAuthNetworkConfig } from "./OAuthNetworkSection";
import ComposioConnect from "./ComposioConnect";

export const INSTAGRAM: OAuthNetworkConfig = {
  id: "instagram",
  title: "Instagram",
  lead: "En este sitio conectas tu cuenta profesional de Instagram para que SEO TOTAL pueda publicar los artículos o el contenido seleccionado por la IA que tú apruebes.",
  note: "Autorizas directamente en Meta. SEO TOTAL no ve tu contraseña y publica mediante Instagram Graph API.",
  accountKey: "instagramUsername",
  accountPrefix: "@",
  pendingSelection: {
    listKey: "accounts",
    idField: "instagramBusinessAccountId",
    accountField: "instagramUsername",
    pageField: "facebookPageName",
  },
  admin: {
    title: "Credenciales de la aplicación Meta",
    help: "App ID y App Secret de la aplicación Meta que tiene habilitado Instagram Graph API.",
    idLabel: "App ID",
    secretLabel: "App Secret",
    keys: { shown: "appId", raw: "rawAppId", bodyId: "appId", bodySecret: "appSecret" },
  },
};

export default function InstagramSection() {
  return (
    <>
      {/*
       * La conexión operativa nueva de Instagram es Composio. Conservamos la
       * configuración OAuth directa arriba como legado documentado para no
       * borrar ni romper cuentas antiguas, pero no la montamos en la interfaz:
       * las nuevas conexiones deben pasar por Composio.
       *
       * <OAuthNetworkSection config={INSTAGRAM} />
       */}
      <ComposioConnect inline showInactiveActions apps={["instagram"]} />
    </>
  );
}
