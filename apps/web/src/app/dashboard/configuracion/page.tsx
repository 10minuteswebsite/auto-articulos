import Link from "next/link";
import { headers } from "next/headers";
import ModuleIntro, { IntroP } from "@/components/ModuleIntro";
import { productOfHost } from "@/lib/product-routes";

export const dynamic = "force-dynamic";

/**
 * Índice de Configuración.
 *
 * Rediseño "RENEW CONFIGURACION" (7/9/2026, pedido de Milton): esta pantalla
 * dejó de mostrar directamente los formularios (antes renderizaba
 * `ConfiguracionView` con sus 6 pestañas mezcladas) y pasó a ser solo un
 * mapa: cada tarjeta explica en una frase qué hace esa sección, y el
 * formulario real vive en su propia página dedicada. Sin esto, entrar a
 * Configuración obligaba a adivinar qué pestaña era la correcta.
 */
const SECCIONES = [
  {
    href: "/dashboard/configuracion/inicial",
    titulo: "Configuración Inicial",
    producto: "ARTICULOS" as const,
    descripcion:
      "El paso a paso para conectar tu cuenta por primera vez. Empieza aquí si acabas de registrarte.",
  },
  {
    href: "/dashboard/configuracion/cuenta",
    titulo: "Cuenta",
    producto: "ARTICULOS" as const,
    descripcion:
      "Tu usuario y contraseña para publicar, tus categorías sincronizadas, y el idioma en que se escriben tus artículos.",
  },
  {
    href: "/dashboard/configuracion/contenido",
    titulo: "Contenido",
    producto: "COMPARTIDO" as const,
    descripcion:
      "Cómo se escriben tus artículos, el texto que firma cada uno, tu teléfono de contacto y las fotos que se usan en redes sociales.",
  },
  {
    href: "/dashboard/configuracion/conexiones",
    titulo: "Conexiones",
    producto: "COMPARTIDO" as const,
    descripcion:
      "Configura Search Console, Analytics y tus redes desde un solo lugar.",
  },
  {
    href: "/dashboard/configuracion/movil",
    titulo: "App Móvil",
    producto: "COMPARTIDO" as const,
    descripcion:
      "Cómo abrir esta aplicación desde la pantalla de inicio de tu celular, como si fuera una app instalada.",
  },
  {
    href: "/dashboard/configuracion/mcp",
    titulo: "Asistentes IA",
    producto: "COMPARTIDO" as const,
    descripcion:
      "Conecta Claude, ChatGPT, Meta MUSE u otro asistente a tu cuenta con un token personal, para operar SEO Total hablando o escribiendo.",
  },
] as const;

export default async function ConfiguracionPage() {
  const product = productOfHost((await headers()).get("host"));
  const seccionesVisibles = SECCIONES.filter(
    (seccion) => product === "COMPARTIDO" || seccion.producto === "COMPARTIDO" || seccion.producto === product,
  );
  const esRedes = product === "REDES";
  const esArticulos = product === "ARTICULOS";

  return (
    <div>
      <ModuleIntro titulo="Configuración">
        <IntroP>
          {esRedes
            ? "Aquí ajustas lo que SEO TOTAL REDES necesita para publicar y representar tu marca en tus redes."
            : "Aquí ajustas todo lo que SEO TOTAL ARTÍCULOS necesita para escribir, posicionar y publicar tus artículos."}
        </IntroP>
        <IntroP>
          No hace falta que entres a todo de una vez. Elige abajo la sección
          que corresponde a lo que quieres cambiar ahora mismo — cada una
          explica primero para qué sirve antes de pedirte nada.
        </IntroP>
      </ModuleIntro>
      <div style={{ marginTop: 24, borderTop: "1px solid #d2d2d7" }}>
        {seccionesVisibles.map((s, i) => (
          <Link
            key={s.href}
            href={s.href}
            style={{
              display: "grid",
              gridTemplateColumns: "42px minmax(0, 1fr) auto",
              alignItems: "center",
              gap: 16,
              padding: "20px 4px",
              textDecoration: "none",
              borderBottom: "1px solid #e5e5ea",
              color: "#1d1d1f",
            }}
          >
            <span style={{ color: "#8e8e93", fontSize: 12, letterSpacing: "0.06em" }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>
              <strong style={{ display: "block", fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>
                {s.titulo}
              </strong>
              <span style={{ display: "block", marginTop: 5, color: "#6e6e73", fontSize: 13, lineHeight: 1.45 }}>
                {esRedes && s.href === "/dashboard/configuracion/contenido"
                  ? "Sube las fotos y los logos que usarás al crear publicaciones para tus redes sociales."
                  : esRedes && s.href === "/dashboard/configuracion/conexiones"
                    ? "Conecta Instagram, Facebook, Threads, LinkedIn y tus demás canales de difusión."
                    : esArticulos && s.href === "/dashboard/configuracion/contenido"
                      ? "Define el estilo, la firma, las ubicaciones y el teléfono de tus artículos."
                      : esArticulos && s.href === "/dashboard/configuracion/conexiones"
                        ? "Conecta Search Console, Analytics y Bing para medir y mejorar tus artículos."
                    : s.descripcion}
              </span>
            </span>
            <span aria-hidden="true" style={{ color: "#6e6e73", fontSize: 22, lineHeight: 1 }}>
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
