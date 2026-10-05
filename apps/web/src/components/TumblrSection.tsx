"use client";

import OAuthNetworkSection, { type OAuthNetworkConfig } from "./OAuthNetworkSection";

const TUMBLR: OAuthNetworkConfig = {
  id: "tumblr",
  title: "Tumblr",
  lead: "En este sitio conectas tu cuenta de Tumblr para que SEO TOTAL pueda publicar los artículos o el contenido seleccionado por la IA que tú apruebes en el blog que elijas. Sigue las instrucciones paso a paso.",
  note: "Publica automáticamente tus artículos con imagen, texto y enlace.",
  admin: {
    title: "Credenciales de la aplicación",
    help: "OAuth Consumer Key y OAuth Consumer Secret de Tumblr.",
    idLabel: "Consumer Key",
    secretLabel: "Consumer Secret",
    keys: { shown: "clientId", raw: "rawClientId", bodyId: "clientId", bodySecret: "clientSecret" },
  },
  destination: { noun: "el blog", label: "Blog", listKey: "blogs", idField: "identifier", nameField: "title", savedIdKey: "blogIdentifier", savedNameKey: "blogTitle", patchKey: "blogIdentifier", pendingKey: "blogSelectionPending", note: "Elige el blog de esta cuenta; los demás no se usarán." },
};

export default function TumblrSection({ allowed = true }: { allowed?: boolean }) {
  return <OAuthNetworkSection config={TUMBLR} allowed={allowed} />;
}
