/*
 * BLOG IA · ayuda para conectar el dominio con CUALQUIER proveedor.
 *
 * El cliente crea un registro CNAME en el proveedor donde administra su DNS. Cada
 * proveedor llama distinto a los campos y a los botones, así que el asistente:
 *  1) detecta el proveedor a partir de los servidores de nombres (NS) del dominio;
 *  2) muestra los pasos de ESE proveedor con los valores ya rellenados;
 *  3) ofrece una lista de proveedores comunes y una guía genérica de respaldo.
 *
 * Todo es función pura (sin red): la consulta de NS vive en la ruta de la API.
 * Los textos describen el recorrido habitual; los nombres exactos de los botones
 * pueden variar con el tiempo, por eso cada guía lo avisa.
 */

export interface ProviderGuide {
  id: string;
  name: string;
  /** Fragmentos que identifican sus servidores de nombres (minúsculas). */
  nsPatterns: string[];
  /** Pasos con {label}, {full} y {target} como marcadores. */
  steps: string[];
  /** Cómo llama este proveedor al campo del nombre (orienta qué escribir). */
  hostField: "label" | "full";
  tip?: string;
}

export const GENERIC_GUIDE: ProviderGuide = {
  id: "generic",
  name: "Otro proveedor / no sé cuál es",
  nsPatterns: [],
  hostField: "label",
  steps: [
    "Entra al panel donde administras el DNS de tu dominio (el proveedor donde lo compraste o donde lo apuntaste).",
    "Busca la sección «DNS», «Zona DNS», «Administrar DNS» o «Registros».",
    "Crea un registro nuevo de tipo CNAME.",
    "En el campo de nombre / host escribe «{label}» (si tu proveedor pide el nombre completo, escribe «{full}»).",
    "En el campo de destino / valor / apunta a escribe «{target}».",
    "Guarda. Si ya existía otro registro (A, AAAA o CNAME) con el mismo nombre, elimínalo: no pueden convivir.",
  ],
  tip: "Si no encuentras el panel, pregúntale a quien administra tu página web o a tu proveedor de dominio dónde se editan los «registros DNS».",
};

const guide = (g: ProviderGuide): ProviderGuide => g;

export const PROVIDERS: ProviderGuide[] = [
  guide({
    id: "godaddy", name: "GoDaddy", nsPatterns: ["domaincontrol.com"], hostField: "label",
    steps: [
      "Entra a godaddy.com → «Mis productos» → junto a tu dominio pulsa «DNS».",
      "Pulsa «Agregar nuevo registro».",
      "Tipo: CNAME. Nombre: «{label}». Valor: «{target}». TTL: el predeterminado.",
      "Pulsa «Guardar».",
    ],
  }),
  guide({
    id: "namecheap", name: "Namecheap", nsPatterns: ["registrar-servers.com"], hostField: "label",
    steps: [
      "Entra a namecheap.com → «Domain List» → «Manage» junto a tu dominio.",
      "Abre la pestaña «Advanced DNS» → «Add New Record».",
      "Type: CNAME Record. Host: «{label}». Value: «{target}». TTL: Automatic.",
      "Pulsa la palomita verde para guardar.",
    ],
  }),
  guide({
    id: "cloudflare", name: "Cloudflare", nsPatterns: ["ns.cloudflare.com"], hostField: "label",
    steps: [
      "Entra a dash.cloudflare.com → elige tu dominio → «DNS» → «Records» → «Add record».",
      "Type: CNAME. Name: «{label}». Target: «{target}».",
      "Proxy status: déjalo en «DNS only» (nube gris).",
      "Pulsa «Save».",
    ],
    tip: "Si tu dominio está en Cloudflare es importante que la nube esté gris («DNS only»), no naranja.",
  }),
  guide({
    id: "squarespace", name: "Squarespace / Google Domains", nsPatterns: ["googledomains.com", "squarespacedns.com"], hostField: "label",
    steps: [
      "Entra a domains.squarespace.com (o a Google Domains) → elige tu dominio → «DNS».",
      "En «Registros personalizados» (Custom records) pulsa «Crear registro».",
      "Nombre de host: «{label}». Tipo: CNAME. Datos: «{target}».",
      "Pulsa «Guardar».",
    ],
  }),
  guide({
    id: "hostinger", name: "Hostinger", nsPatterns: ["dns-parking.com", "hostinger"], hostField: "label",
    steps: [
      "Entra a hpanel.hostinger.com → «Dominios» → «Administrar» junto a tu dominio → «DNS / Servidores de nombres».",
      "En «Registros DNS» agrega uno nuevo: Tipo CNAME.",
      "Nombre: «{label}». Apunta a: «{target}». TTL: el predeterminado.",
      "Pulsa «Agregar registro».",
    ],
  }),
  guide({
    id: "ionos", name: "IONOS (1&1)", nsPatterns: ["ui-dns", "ionos"], hostField: "label",
    steps: [
      "Entra a ionos.com → «Dominios y SSL» → elige tu dominio → pestaña «DNS».",
      "Pulsa «Añadir registro» → CNAME.",
      "Nombre de host: «{label}». Apunta a: «{target}».",
      "Pulsa «Guardar».",
    ],
  }),
  guide({
    id: "wix", name: "Wix", nsPatterns: ["wixdns.net"], hostField: "label",
    steps: [
      "Entra a Wix → «Dominios» → los tres puntos de tu dominio → «Administrar registros DNS».",
      "En la sección «CNAME» pulsa «+ Agregar registro».",
      "Nombre del host: «{label}». Apunta a: «{target}».",
      "Pulsa «Guardar».",
    ],
  }),
  guide({
    id: "bluehost", name: "Bluehost", nsPatterns: ["bluehost.com"], hostField: "label",
    steps: [
      "Entra a Bluehost → «Dominios» → «Administrar» junto a tu dominio → pestaña «DNS».",
      "En «CNAME» pulsa «Agregar registro».",
      "Host Record: «{label}». Points to: «{target}». TTL: el predeterminado.",
      "Pulsa «Guardar».",
    ],
  }),
  guide({
    id: "hostgator", name: "HostGator / cPanel", nsPatterns: ["hostgator.com", "websitewelcome.com"], hostField: "full",
    steps: [
      "Entra al cPanel de tu hosting → «Editor de zona» (Zone Editor) → «Administrar» tu dominio.",
      "Pulsa «Agregar registro» → CNAME.",
      "Nombre: «{full}.». Registro (destino): «{target}».",
      "Pulsa «Agregar registro».",
    ],
    tip: "En cPanel el nombre suele pedirse completo y con un punto final.",
  }),
  guide({
    id: "siteground", name: "SiteGround", nsPatterns: ["siteground.net", "sgvps.net", "sgcloud"], hostField: "label",
    steps: [
      "Entra a SiteGround → «Sitios web» → tu sitio → «Dominio» → «Zona DNS».",
      "Pulsa «Agregar registro» → CNAME.",
      "Nombre: «{label}». Apunta a: «{target}».",
      "Pulsa «Crear».",
    ],
  }),
  guide({
    id: "networksolutions", name: "Network Solutions", nsPatterns: ["worldnic.com"], hostField: "label",
    steps: [
      "Entra a networksolutions.com → «Administrador de cuenta» → «Mis nombres de dominio».",
      "Elige tu dominio → «Cambiar a dónde apunta el dominio» → «DNS avanzado».",
      "En «Alias de host (CNAME)» pulsa «Editar» → «Agregar».",
      "Alias: «{label}». Apunta a: «{target}». Guarda.",
    ],
  }),
  guide({
    id: "porkbun", name: "Porkbun", nsPatterns: ["porkbun.com"], hostField: "label",
    steps: [
      "Entra a porkbun.com → «Domain Management» → «DNS» junto a tu dominio.",
      "Type: CNAME. Host: «{label}». Answer: «{target}».",
      "Pulsa «Add».",
    ],
  }),
  guide({
    id: "route53", name: "Amazon Route 53", nsPatterns: ["awsdns-"], hostField: "full",
    steps: [
      "Entra a la consola de AWS → Route 53 → «Hosted zones» → tu dominio → «Create record».",
      "Record name: «{label}». Record type: CNAME. Value: «{target}».",
      "Pulsa «Create records».",
    ],
  }),
  guide({
    id: "ovh", name: "OVH", nsPatterns: ["ovh.net", "ovh.com"], hostField: "label",
    steps: [
      "Entra al área de cliente de OVH → «Dominios» → tu dominio → «Zona DNS».",
      "Pulsa «Añadir una entrada» → CNAME.",
      "Subdominio: «{label}». Destino: «{target}.».",
      "Confirma.",
    ],
    tip: "OVH suele pedir un punto al final del destino.",
  }),
  guide({
    id: "vercel", name: "Vercel", nsPatterns: ["vercel-dns.com"], hostField: "label",
    steps: [
      "Entra a vercel.com → «Domains» → tu dominio → «DNS Records» → «Add».",
      "Type: CNAME. Name: «{label}». Value: «{target}».",
      "Pulsa «Add».",
    ],
  }),
];

/** Detecta el proveedor por los servidores de nombres. null = no reconocido. */
export function detectProvider(nameservers: string[]): ProviderGuide | null {
  const ns = nameservers.map((n) => n.toLowerCase().replace(/\.$/, ""));
  for (const p of PROVIDERS) {
    if (ns.some((n) => p.nsPatterns.some((pat) => n.includes(pat)))) return p;
  }
  return null;
}

// Sufijos de dos niveles frecuentes: el dominio registrable tiene 3 etiquetas.
const SECOND_LEVEL = new Set([
  "com.co", "net.co", "org.co", "com.mx", "org.mx", "com.ar", "com.br", "com.pe", "com.ve", "com.ec", "com.uy",
  "com.py", "com.bo", "com.cl", "com.pa", "com.do", "com.gt", "com.sv", "com.hn", "com.ni", "com.cr", "com.pr",
  "co.uk", "org.uk", "co.nz", "com.au", "co.za", "co.in", "co.jp", "com.es", "com.tr",
]);

/** Separa «blog.cliente.com» en { registrable: «cliente.com», label: «blog» }. */
export function splitHostname(hostname: string): { registrable: string; label: string; full: string } {
  const full = hostname.trim().toLowerCase().replace(/\.$/, "");
  const parts = full.split(".");
  const tail2 = parts.slice(-2).join(".");
  const take = SECOND_LEVEL.has(tail2) ? 3 : 2;
  const registrable = parts.slice(-take).join(".");
  const label = parts.slice(0, Math.max(0, parts.length - take)).join(".") || "@";
  return { registrable, label, full };
}

/** Rellena los marcadores de los pasos. */
export function renderSteps(g: ProviderGuide, v: { label: string; full: string; target: string }): string[] {
  return g.steps.map((s) => s.replaceAll("{label}", v.label).replaceAll("{full}", v.full).replaceAll("{target}", v.target));
}

export function guideById(id: string): ProviderGuide {
  return PROVIDERS.find((p) => p.id === id) ?? GENERIC_GUIDE;
}

/** Errores frecuentes, comunes a todos los proveedores. */
export const COMMON_MISTAKES: string[] = [
  "No escribas «https://» ni una barra «/» al final.",
  "Si ya había otro registro (A, AAAA o CNAME) con el mismo nombre, elimínalo: un nombre no puede tener dos.",
  "Algunos proveedores agregan solos tu dominio al final del nombre: si ves «{label}.tudominio.com.tudominio.com», borra la parte repetida.",
  "Los cambios de DNS pueden tardar en propagarse; no hay un tiempo fijo. Vuelve a pulsar «Verificar conexión» más tarde.",
];
