/**
 * Redes y blogs que el asistente puede mencionar por NOMBRE (o todas a la
 * vez). Lógica pura, sin base de datos: traduce lo que dice la persona
 * («Facebook», «google business», «todas») a los identificadores internos que
 * ya usan las rutas de Redes (`/api/social-opportunities/*`).
 *
 * X/Twitter no está: Milton la apagó el 30/8/2026 y no se ofrece en ninguna
 * pantalla ni aquí.
 */
export type SocialNetwork = {
  key: string;
  label: string;
  /** Nombre que espera `POST /api/social-opportunities/generate` en `networks`. */
  generateId: string;
  /** Formato principal: el que cuenta para el cupo diario y el que se publica en grupo. */
  platform: string;
  /** Todos los formatos que esta red puede tener como propuesta (para borrar pendientes). */
  platforms: string[];
  /** Clave en la respuesta de `GET /api/social-opportunities/generate` (red conectada). */
  connectedKey: string;
  aliases: string[];
};

export const SOCIAL_NETWORKS: SocialNetwork[] = [
  { key: "threads", label: "Threads", generateId: "threads", platform: "threads", platforms: ["threads"], connectedKey: "threads", aliases: ["threads"] },
  { key: "linkedin", label: "LinkedIn", generateId: "linkedin", platform: "linkedin", platforms: ["linkedin"], connectedKey: "linkedin", aliases: ["linkedin", "linked in"] },
  { key: "facebook", label: "Facebook", generateId: "facebook-page", platform: "facebook-page", platforms: ["facebook-page", "facebook-story"], connectedKey: "facebookPage", aliases: ["facebook", "facebook-page", "facebook page", "pagina de facebook", "fb"] },
  { key: "instagram", label: "Instagram", generateId: "instagram", platform: "instagram-post", platforms: ["instagram-post", "instagram-story", "instagram-reel-image", "instagram-carousel", "instagram-infografia"], connectedKey: "instagram", aliases: ["instagram", "ig", "insta"] },
  { key: "pinterest", label: "Pinterest", generateId: "pinterest", platform: "pinterest", platforms: ["pinterest"], connectedKey: "pinterest", aliases: ["pinterest"] },
  { key: "tumblr", label: "Tumblr", generateId: "tumblr", platform: "tumblr", platforms: ["tumblr"], connectedKey: "tumblr", aliases: ["tumblr"] },
  { key: "bluesky", label: "Bluesky", generateId: "bluesky", platform: "bluesky", platforms: ["bluesky"], connectedKey: "bluesky", aliases: ["bluesky", "blue sky"] },
  { key: "blogger", label: "Blogger", generateId: "blogger", platform: "blogger", platforms: ["blogger"], connectedKey: "blogger", aliases: ["blogger", "blog"] },
  { key: "google-business", label: "Google Business Profile", generateId: "google-business", platform: "google-business", platforms: ["google-business"], connectedKey: "googleBusiness", aliases: ["google business", "google business profile", "google-business", "google my business", "perfil de negocio", "google"] },
];

const ALL_WORDS = new Set(["todas", "todos", "todo", "todas las redes", "all", "cada red"]);

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Convierte la lista que dio la persona en redes reales. `all` es true cuando
 * no dijo ninguna o dijo «todas». `unknown` son los nombres que no existen
 * (para decírselo en vez de ignorarlos en silencio).
 */
export function resolveNetworks(input: unknown): { networks: SocialNetwork[]; unknown: string[]; all: boolean } {
  const raw = Array.isArray(input) ? input : typeof input === "string" ? input.split(/[,;]| y /i) : [];
  const names = raw.filter((value): value is string => typeof value === "string").map(normalize).filter(Boolean);
  if (names.length === 0 || names.some((name) => ALL_WORDS.has(name))) {
    return { networks: SOCIAL_NETWORKS, unknown: [], all: true };
  }
  const networks: SocialNetwork[] = [];
  const unknown: string[] = [];
  for (const name of names) {
    const found = SOCIAL_NETWORKS.find((network) => network.key === name || network.aliases.includes(name));
    if (!found) unknown.push(name);
    else if (!networks.includes(found)) networks.push(found);
  }
  return { networks, unknown, all: false };
}

export function networkLabel(platform: string): string {
  const network = SOCIAL_NETWORKS.find((item) => item.platforms.includes(platform));
  return network ? network.label : platform;
}

export type SocialProposalRow = { id?: string; platform?: string; status?: string; articleTitle?: string; suggestedText?: string; createdAt?: string | Date; publishedAt?: string | Date | null };

/** La propuesta pendiente (o en error, para reintentar) más reciente del formato principal de una red. */
export function pickPendingProposal(proposals: SocialProposalRow[], network: SocialNetwork, status: "pending" | "error" = "pending"): SocialProposalRow | null {
  const pending = proposals.filter((item) => item.id && item.status === status && item.platform === network.platform);
  pending.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  return pending[0] ?? null;
}
