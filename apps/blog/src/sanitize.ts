// Sanitizador de HTML de artículos (blueprint §5.3 y §11: sanitización, XSS).
// Lista blanca estricta: se eliminan por completo los bloques peligrosos
// (script, style, iframe...), se descartan etiquetas y atributos desconocidos
// y solo se permiten URLs http(s), mailto, relativas y anclas.

import { esc } from "./util";

const DROP_BLOCKS = /<(script|style|iframe|object|embed|noscript|template|form|svg|math|textarea|select)\b[\s\S]*?<\/\1\s*>/gi;
const DROP_SINGLE = /<\/?(script|style|iframe|object|embed|noscript|template|form|input|button|link|meta|base|svg|math|textarea|select)\b[^>]*>/gi;

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ["href", "title"],
  img: ["src", "alt", "width", "height"],
  th: ["colspan", "rowspan", "scope"],
  td: ["colspan", "rowspan"],
  h2: ["id"], h3: ["id"], h4: ["id"],
};
const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "strong", "b", "em", "i", "u", "blockquote",
  "a", "img", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "figure", "figcaption", "code", "pre", "sup", "sub", "small", "span", "div",
]);
const VOID = new Set(["br", "hr", "img"]);

function safeUrl(raw: string, allowRelative = true): string | null {
  const v = raw.trim().replace(/[\u0000-\u001f\u007f\s]+/g, "");
  if (!v) return null;
  if (/^(https?:|mailto:)/i.test(v)) return raw.trim();
  if (allowRelative && (/^#/.test(v) || (/^\/(?!\/)/.test(v)))) return raw.trim();
  return null;
}

function parseAttrs(src: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const name = m[1].toLowerCase();
    if (!out.has(name)) out.set(name, m[2] ?? m[3] ?? m[4] ?? "");
  }
  return out;
}

export function sanitizeHtml(input: string): string {
  let html = input.replace(/<!--[\s\S]*?-->/g, "").replace(DROP_BLOCKS, "").replace(DROP_SINGLE, "");
  return html.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, (_all, slash: string, rawTag: string, rest: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (slash) return VOID.has(tag) ? "" : `</${tag}>`;
    const allowed = ALLOWED_ATTRS[tag] ?? [];
    const attrs = parseAttrs(rest);
    let out = `<${tag}`;
    for (const name of allowed) {
      const raw = attrs.get(name);
      if (raw === undefined) continue;
      let value = raw;
      if (name === "href") {
        const u = safeUrl(raw);
        if (!u) continue;
        value = u;
      } else if (name === "src") {
        const u = safeUrl(raw, false);
        if (!u || /^mailto:/i.test(u)) continue;
        value = u;
      } else if (name === "id") {
        if (!/^[a-zA-Z][-a-zA-Z0-9_]*$/.test(raw)) continue;
      } else if (["width", "height", "colspan", "rowspan"].includes(name)) {
        if (!/^\d{1,5}$/.test(raw)) continue;
      }
      out += ` ${name}="${esc(value)}"`;
    }
    if (tag === "a" && attrs.has("href") && out.includes("href=")) {
      out += ' rel="noopener noreferrer"';
    }
    if (tag === "img") out += ' loading="lazy"';
    return out + ">";
  });
}
