"use client";

import ComposioConnect from "./ComposioConnect";
import OAuthNetworkSection, { type OAuthNetworkConfig } from "./OAuthNetworkSection";

const THREADS: OAuthNetworkConfig = {
  id: "threads",
  title: "Threads",
  lead: "En este sitio conectas tu cuenta de Threads para que SEO TOTAL pueda publicar los artículos o el contenido seleccionado por la IA que tú apruebes. Sigue las instrucciones para configurarla paso a paso.",
  note: "Publica tus artículos como publicaciones de Threads. Autorizas directamente en Meta; nunca vemos tu contraseña.",
  accountKey: "threadsUsername",
  accountPrefix: "@",
  admin: {
    title: "Credenciales de la aplicación",
    help: "App ID y App Secret específicos del producto Threads.",
    idLabel: "App ID",
    secretLabel: "App Secret",
    keys: { shown: "appId", raw: "rawAppId", bodyId: "appId", bodySecret: "appSecret" },
  },
};

interface ThreadsSectionProps {
  allowThreads?: boolean;
  /** Se conservan por compatibilidad con la página antigua; Instagram y Facebook se gestionan desde sus propias tarjetas. */
  allowInstagram?: boolean;
  allowFacebook?: boolean;
  isAdmin?: boolean;
  showComposioSocial?: boolean;
}

export default function ThreadsSection({ allowThreads = true, showComposioSocial = true }: ThreadsSectionProps) {
  return (
    <>
      <OAuthNetworkSection config={THREADS} allowed={allowThreads} />
      {showComposioSocial && <ComposioConnect inline showInactiveActions apps={["facebook", "instagram"]} />}
    </>
  );
}
