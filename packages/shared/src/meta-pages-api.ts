/**
 * OAuth de Meta para administrar y publicar en Páginas de Facebook.
 * La misma aplicación de Meta puede tener también el caso de uso de Instagram.
 */

const GRAPH_API_VERSION = "v25.0";
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface MetaPageTokenExchangeResult {
  pageAccessToken: string;
  expiresInSeconds: number;
  facebookPageId: string;
  facebookPageName: string;
  instagramBusinessAccountId?: string;
  instagramUsername?: string;
}

export function getMetaPagesAuthUrl(
  state: string,
  redirectUri: string,
  appCredentials: { appId: string; appSecret: string },
): string {
  const params = new URLSearchParams({
    client_id: appCredentials.appId,
    redirect_uri: redirectUri,
    // Meta currently rejects pages_manage_posts for this app because it is
    // still pending App Review. Keep connection/discovery available with the
    // permissions already enabled; publishing is gated until Meta approves it.
    scope: "pages_show_list,pages_read_engagement,business_management",
    response_type: "code",
    state,
    auth_type: "rerequest",
  });

  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

/** Canjea el código OAuth y obtiene el token de la primera Página administrada. */
export async function exchangeCodeForMetaPageToken(
  code: string,
  redirectUri: string,
  appCredentials: { appId: string; appSecret: string },
): Promise<MetaPageTokenExchangeResult> {
  const shortLivedBody = new URLSearchParams({
    client_id: appCredentials.appId,
    client_secret: appCredentials.appSecret,
    redirect_uri: redirectUri,
    code,
  });
  const shortLivedRes = await fetch(`${GRAPH_API_URL}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: shortLivedBody.toString(),
  });
  if (!shortLivedRes.ok) throw new Error(`Meta no aceptó el código OAuth: ${await shortLivedRes.text()}`);
  const shortLived = (await shortLivedRes.json()) as { access_token?: string };
  if (!shortLived.access_token) throw new Error("Meta no devolvió un token de acceso.");

  const longLivedParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appCredentials.appId,
    client_secret: appCredentials.appSecret,
    fb_exchange_token: shortLived.access_token,
  });
  const longLivedRes = await fetch(`${GRAPH_API_URL}/oauth/access_token?${longLivedParams.toString()}`);
  if (!longLivedRes.ok) throw new Error(`Meta no pudo renovar el token: ${await longLivedRes.text()}`);
  const longLived = (await longLivedRes.json()) as { access_token?: string; expires_in?: number };
  if (!longLived.access_token) throw new Error("Meta no devolvió el token de larga duración.");

  const pagesParams = new URLSearchParams({
    fields: "id,name,access_token,instagram_business_account{id,username}",
    access_token: longLived.access_token,
  });
  const pagesRes = await fetch(`${GRAPH_API_URL}/me/accounts?${pagesParams.toString()}`);
  if (!pagesRes.ok) throw new Error(`No se pudieron obtener tus Páginas de Facebook: ${await pagesRes.text()}`);
  const pages = (await pagesRes.json()) as {
    data?: Array<{
      id: string;
      name?: string;
      access_token?: string;
      instagram_business_account?: { id: string; username?: string };
    }>;
  };
  const page = pages.data?.find((item) => item.id && item.access_token);
  if (!page?.access_token) {
    throw new Error("No se encontraron Páginas de Facebook administradas por esta cuenta.");
  }

  return {
    pageAccessToken: page.access_token,
    expiresInSeconds: longLived.expires_in || 60 * 86400,
    facebookPageId: page.id,
    facebookPageName: page.name || "",
    instagramBusinessAccountId: page.instagram_business_account?.id,
    instagramUsername: page.instagram_business_account?.username || "",
  };
}
