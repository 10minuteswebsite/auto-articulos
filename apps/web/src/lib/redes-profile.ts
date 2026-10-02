/**
 * Perfil inicial de acceso a SEO Total Redes.
 *
 * Es lógica pura para poder reutilizarla al crear una cuenta del HUB y en el
 * script del Día Cero sin importar Prisma ni modificar otros overrides del
 * usuario. Mastodon queda fuera por decisión de Milton; X/Twitter no tiene un
 * campo `allow*Publishing` en el esquema actual y no se inventa uno aquí.
 */

export const REDES_PUBLISHING_FIELDS = [
  "allowInstagramPublishing",
  "allowLinkedInPublishing",
  "allowThreadsPublishing",
  "allowFacebookPublishing",
  "allowPinterestPublishing",
  "allowTumblrPublishing",
  "allowBlueskyPublishing",
  "allowDevToPublishing",
  "allowBloggerPublishing",
  "allowGoogleBusinessPublishing",
] as const;

export type RedesPublishingField = (typeof REDES_PUBLISHING_FIELDS)[number];

export type RedesProfileInput = {
  role?: string | null;
  disabledModules?: string | null;
};

export type RedesProfile = {
  [K in RedesPublishingField]: true;
} & { disabledModules: string };

function enableSocialModule(raw: string | null | undefined): string {
  if (!raw) return JSON.stringify({ "oportunidades-redes": "enabled" });

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return JSON.stringify(
        parsed.filter((id) => id !== "oportunidades-redes"),
      );
    }
    if (parsed && typeof parsed === "object") {
      return JSON.stringify({
        ...(parsed as Record<string, unknown>),
        "oportunidades-redes": "enabled",
      });
    }
  } catch {
    // Un formato inválido no debe impedir encender el perfil; se reemplaza por
    // el formato de overrides explícitos, sin arriesgar una interpretación.
  }
  return JSON.stringify({ "oportunidades-redes": "enabled" });
}

/** Devuelve el patch de Redes; `null` significa que el usuario es admin. */
export function redesProfile(input: RedesProfileInput = {}): RedesProfile | null {
  if (input.role === "admin") return null;
  return {
    allowInstagramPublishing: true,
    allowLinkedInPublishing: true,
    allowThreadsPublishing: true,
    allowFacebookPublishing: true,
    allowPinterestPublishing: true,
    allowTumblrPublishing: true,
    allowBlueskyPublishing: true,
    allowDevToPublishing: true,
    allowBloggerPublishing: true,
    allowGoogleBusinessPublishing: true,
    disabledModules: enableSocialModule(input.disabledModules),
  };
}
