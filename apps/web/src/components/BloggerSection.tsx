"use client";

import OAuthNetworkSection, { type OAuthNetworkConfig } from "./OAuthNetworkSection";

const BLOGGER: OAuthNetworkConfig = {
  id: "blogger",
  title: "Blogger",
  lead: "En este sitio conectas tu cuenta de Google para que SEO TOTAL pueda publicar los artículos o el contenido seleccionado por la IA que tú apruebes en el blog de Blogger que elijas. Sigue las instrucciones paso a paso.",
  note: "Publica artículos en el blog de Blogger que elijas.",
  admin: {
    title: "Credenciales de la aplicación",
    help: "Client ID y Client Secret de Google Cloud.",
    idLabel: "Client ID",
    secretLabel: "Client Secret",
    keys: { shown: "clientId", raw: "rawClientId", bodyId: "clientId", bodySecret: "clientSecret" },
  },
  destination: { noun: "el blog", label: "Blog", listKey: "blogs", idField: "id", nameField: "name", savedIdKey: "blogId", savedNameKey: "blogName", patchKey: "blogId", note: "Elige el blog de esta cuenta; los demás no se usarán." },
};

export default function BloggerSection({ allowed = true }: { allowed?: boolean }) {
  return <OAuthNetworkSection config={BLOGGER} allowed={allowed} />;
}
