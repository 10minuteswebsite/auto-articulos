/**
 * Enlace público a una publicación, a partir de la red y del id guardado.
 * Devuelve null si no se puede armar un enlace real: en ese caso no se muestra
 * el botón (nunca se enlaza a «#»).
 */
export function socialPostUrl(platform: string, postId: string | null | undefined): string | null {
  const id = (postId ?? "").trim();
  if (!id) return null;
  if (/^https?:\/\//i.test(id)) return id;
  const encoded = encodeURIComponent(id);
  switch (platform.toLowerCase()) {
    case "threads":
      // Threads devuelve un permalink con la forma /@usuario/post/id. Los
      // registros antiguos que solo tienen el id se abren con el dominio
      // público actual; las URLs completas guardadas arriba se respetan.
      return `https://www.threads.com/t/${encoded}`;
    case "x":
    case "twitter":
      return `https://x.com/i/status/${encoded}`;
    case "linkedin":
      return `https://www.linkedin.com/feed/update/${encoded}`;
    case "facebook":
    case "facebook-page":
      // El id de una publicación de Página tiene la forma «idPagina_idPublicacion».
      return `https://www.facebook.com/${encoded}`;
    // These platforms publish a real permalink/URL and save it in postId.
    // Do not invent a URL from an opaque id: without the account/slug it
    // would be as misleading as the old Threads link.
    default:
      return null;
  }
}
