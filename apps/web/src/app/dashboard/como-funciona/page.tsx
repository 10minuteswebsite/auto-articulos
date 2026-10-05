import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { MENU_NAMES } from "@/lib/menu-names";
import { productOfHost } from "@/lib/product-routes";

export const metadata: Metadata = {
  title: "Cómo funciona esta aplicación — SEO TOTAL",
  description: "Elige cómo crear y publicar tu contenido.",
};

const cardStyle = { border: "1px solid #d2d2d7", borderRadius: 6, padding: 18, background: "#ffffff", minWidth: 0 };
const linkStyle = { display: "inline-flex", marginTop: 16, color: "#1d1d1f", fontSize: 13, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 };

export default async function ComoFuncionaPage() {
  const product = productOfHost((await headers()).get("host"));
  const esRedes = product === "REDES";
  const esArticulos = product === "ARTICULOS";
  const titulo = esRedes ? "Cómo funciona SEO Total Redes" : esArticulos ? "Cómo funciona SEO Total Artículos" : "Cómo funciona esta aplicación";
  const intro = esRedes
    ? "Revisa, prepara y difunde tus publicaciones en redes sociales y blogs públicos."
    : esArticulos
      ? "Escribe tus propios artículos o pide a la IA que encuentre temas para tu página web."
      : "Puedes escribir tus propios artículos, pedir ayuda a la IA o publicar tu contenido en otros canales.";
  const cards = esRedes
    ? [{ option: "OPCIÓN 1", title: "Publica en redes y blogs", text: "Revisa el contenido creado y decide en qué redes sociales o blogs públicos quieres difundirlo.", href: "/dashboard/oportunidades-redes", label: MENU_NAMES.redes }]
    : esArticulos
      ? [
          { option: "OPCIÓN 1", title: "Escribe tus propios artículos", text: "Tú eliges el título, las variables y la categoría. La plataforma redacta y publica el artículo en tu web.", href: "/dashboard/publicar", label: MENU_NAMES.propios },
          { option: "OPCIÓN 2", title: "Pide títulos y contenido con IA", text: "Puedes indicar tus propias variables o dejar que la IA encuentre temas que tu público está buscando.", href: "/dashboard/oportunidades", label: MENU_NAMES.ia },
        ]
      : [
          { option: "OPCIÓN 1", title: "Escribe tus propios artículos", text: "Tú eliges el título, las variables y la categoría. La plataforma redacta y publica el artículo en tu web.", href: "/dashboard/publicar", label: MENU_NAMES.propios },
          { option: "OPCIÓN 2", title: "Pide títulos y contenido con IA", text: "Puedes indicar tus propias variables o dejar que la IA encuentre temas que tu público está buscando.", href: "/dashboard/oportunidades", label: MENU_NAMES.ia },
          { option: "OPCIÓN 3", title: "Publica en redes y blogs", text: "Revisa el contenido creado y decide en qué redes sociales o blogs públicos quieres difundirlo.", href: "/dashboard/oportunidades-redes", label: MENU_NAMES.redes },
        ];

  return (
    <main style={{ width: "100%", maxWidth: 1120, margin: "0 auto" }}>
      <header style={{ borderBottom: "1px solid #d2d2d7", padding: "0 0 24px" }}>
        <p className="eyebrow" style={{ margin: "0 0 6px" }}>CÓMO FUNCIONA</p>
        <h1 style={{ margin: 0, fontSize: "clamp(26px, 4vw, 38px)", lineHeight: 1.1, fontWeight: 600, letterSpacing: "-0.03em" }}>{titulo}</h1>
        <p style={{ margin: "10px 0 0", maxWidth: 700, fontSize: 17, lineHeight: 1.5 }}>{intro}</p>
      </header>
      <section style={{ padding: "24px 0 0" }}>
        <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.2, fontWeight: 600 }}>{esRedes ? "Tu opción de Redes" : esArticulos ? "Tus opciones de Artículos" : "Tus tres opciones"}</h2>
        <p className="muted" style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5 }}>{esRedes ? "Aquí preparas y distribuyes publicaciones sociales." : esArticulos ? "Elige cómo crear contenido para tu página web." : "Elige una opción desde Inicio. Puedes usar las tres cuando las necesites."}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: 12, marginTop: 16 }}>
          {cards.map((card) => (
            <article key={card.href} style={cardStyle}>
              <p className="eyebrow" style={{ margin: "0 0 8px" }}>{card.option}</p>
              <h3 style={{ margin: 0, fontSize: 20, lineHeight: 1.2 }}>{card.title}</h3>
              <p className="muted" style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.5 }}>{card.text}</p>
              <Link href={card.href} aria-label={`Abrir ${card.label}`} style={linkStyle}>Abrir módulo →</Link>
            </article>
          ))}
        </div>
      </section>
      {!esRedes && (
        <section style={{ borderTop: "1px solid #d2d2d7", marginTop: 28, padding: "22px 0 0" }}>
          <h2 style={{ margin: 0, fontSize: 22, lineHeight: 1.2, fontWeight: 600 }}>Cómo ayuda la IA</h2>
          <p style={{ margin: "10px 0 0", maxWidth: 760, fontSize: 15, lineHeight: 1.5 }}>Si conectas tus fuentes de datos, la IA puede usarlas para proponer temas más útiles:</p>
          <ul style={{ margin: "10px 0 0", paddingLeft: 20, maxWidth: 760, fontSize: 15, lineHeight: 1.6 }}>
            <li><strong>Google Search Console:</strong> qué búsquedas llevan personas a tu web.</li>
            <li><strong>Google Analytics:</strong> qué contenido recibe visitas.</li>
            <li><strong>Bing:</strong> qué oportunidades aparecen en ese buscador.</li>
          </ul>
          <Link href="/dashboard/configuracion" style={linkStyle}>Revisar configuración →</Link>
        </section>
      )}
      <details style={{ borderTop: "1px solid #d2d2d7", marginTop: 24, padding: "18px 0 0" }}>
        <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Qué ocurre después de publicar</summary>
        <p className="muted" style={{ margin: "10px 0 0", maxWidth: 760, fontSize: 14, lineHeight: 1.5 }}>Puedes seguir el avance en Progreso de las publicaciones. Cuando termina, el resultado queda guardado en Historial.</p>
      </details>
    </main>
  );
}
