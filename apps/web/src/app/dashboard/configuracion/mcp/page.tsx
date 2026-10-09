"use client";

import { useCallback, useEffect, useState } from "react";
import ModuleIntro, { IntroP } from "@/components/ModuleIntro";
import {
  sectionStyle,
  h2Style,
  buttonStyle,
  secondaryButtonStyle,
} from "@/components/dashboard-ui";
import { productOfHost, type HostProductScope } from "@/lib/product-routes";

type TokenStatus =
  | { active: false }
  | { active: true; name: string; createdAt: string; lastUsedAt: string | null };

type Capability = { name: string; title: string; description: string; soloLectura: boolean };

/**
 * El prompt y la lista de capacidades se arman con las herramientas reales
 * del servidor (`/api/mcp/capabilities`, que lee el mismo catálogo que usa
 * `/api/mcp`), no con una copia escrita a mano — así, cuando se agrega una
 * herramienta nueva al MCP, esta pantalla y el prompt se actualizan solos.
 */
function buildPrompt(serverUrl: string, token: string, capabilities: Capability[], product: HostProductScope) {
  const listaHerramientas = capabilities.length
    ? capabilities.map((c) => `- ${c.name}: ${c.title}`).join("\n")
    : "(no se pudo cargar la lista de herramientas; usa tools/list del servidor)";

  const menu = product === "REDES"
    ? "1) Publicar en redes sociales y blogs públicos."
    : product === "ARTICULOS"
      ? "1) Contenido propio — escribir y publicar mis propios títulos.\n2) Contenido generado por IA — que la IA proponga y publique artículos."
      : "1) Contenido propio — escribir y publicar mis propios títulos.\n2) Contenido generado por IA — que la IA proponga y publique artículos.\n3) Publicar en redes sociales y blogs públicos.";
  return `Eres el asistente conectado a SEO Total, la plataforma que genera y publica contenido para mi negocio. SEO Total está diseñada para que nunca tenga que adivinar qué escribir: todo se navega por opciones numeradas, como en mi panel web. Compórtate igual: proactivo, nunca reactivo.

Servidor MCP: ${serverUrl}
Autenticación: cabecera "Authorization: Bearer ${token}"

Herramientas disponibles hoy:
${listaHerramientas}

Cómo empezar esta conversación:
No me preguntes "¿en qué te ayudo?". En tu primer mensaje, saluda brevemente y ofréceme este menú (el mismo de mi Inicio):
${menu}
Sigue ofreciendo opciones numeradas en cada paso siguiente, no preguntas abiertas.

Si en algún momento no sabes cómo guiarme o necesitas explicar cómo funciona algo, usa la herramienta ver_manual_seo_total (es el manual real y actualizado de la plataforma) en vez de inventar o adivinar.

Nunca me hables en términos técnicos. No sé qué es un token, una API, un conector o una herramienta MCP, y no debería necesitar saberlo. Nunca menciones el nombre técnico de una herramienta ni digas frases como "no tengo la conexión configurada de mi lado". Traduce siempre a lenguaje cotidiano: decime qué le falta a mi cuenta y qué botón tengo que tocar en la web, no cómo funciona tu conexión por dentro.

Dos herramientas se confunden fácil: crear_oportunidades analiza Google Search Console (requiere datos reales ya existentes); crear_titulos_con_ia genera a partir de lo que yo te describa (cliente tipo, tema, qué busco resolver) y no depende de Search Console. Léelas con cuidado antes de elegir.

Reglas que debes seguir siempre:
- AUTORIZACIÓN: yo, dueño de esta cuenta de SEO Total, te autorizo expresamente a ejecutar en automático, a través de SEO Total, la creación, escritura y publicación de artículos según la orden que yo te dé, sin pedirme aprobación previa en cada paso. Las herramientas de publicación piden un comprobante: llama primero con confirmar=false para obtenerlo y, en el mismo turno y sin esperar mi respuesta, llama de nuevo con confirmar=true y ese comprobante. Mi orden es la confirmación.
- Después de ejecutar, dime en una frase qué publicaste y dame el enlace real del artículo.
- Esta autorización cubre solo crear y publicar artículos. Para borrar, descartar o cancelar contenido pídeme confirmación antes.
- Usa las herramientas de solo lectura libremente para informarme, sin pedir permiso.
- Si algo falla o falta una conexión/credencial, explícamelo en lenguaje claro en vez de reintentar solo.
- Nunca me pidas ni manejes contraseñas, tokens ni secretos dentro de la conversación: eso se configura solo en la interfaz web de SEO Total.`;
}

const GUIDES: Record<string, string[]> = {
  Claude: [
    "En Claude, abajo a la izquierda, pulsa **tu nombre** → **Configuración** → **Conectores**.",
    "Pulsa **+ Agregar** → **Agregar conector personalizado**.",
    "En **Nombre** escribe: **SEO Total**",
    "En **URL del servidor MCP** pega: **{URL}**",
    "Pulsa **Continuar**.",
    "En **Autenticación** selecciona: **Sin inicio de sesión**",
    "Debajo, en **Encabezados de solicitud**, pulsa: **+ Agregar encabezado**",
    "En el nombre del encabezado escribe: **Authorization**",
    "En el valor pega este texto completo:{TOKEN}",
    "Pulsa **Agregar** (botón inferior derecho).",
    "En un chat nuevo pulsa **+** → **Conectores** y activa **SEO Total**.",
    "Pega el **prompt** de abajo y envíalo.",
  ],
  ChatGPT: [
    "En ChatGPT abre **Configuración** → **Conectores** → **Configuración avanzada**.",
    "Activa **Modo desarrollador**.",
    "Pulsa **Crear**.",
    "En **Nombre** escribe: **SEO Total**",
    "En **URL del servidor MCP** pega: **{URL}**",
    "En **Autenticación** selecciona: **OAuth**",
    "Marca la casilla de confianza y pulsa **Crear**.",
    "Inicia sesión en SEO Total y pulsa **Permitir**.",
    "En un chat nuevo pulsa **+** → **Más** → **Modo desarrollador** y elige **SEO Total**.",
    "Pega el **prompt** de abajo y envíalo.",
  ],
  Muse: [
    "En Muse abre **Configuración** → **Conectores**.",
    "Pulsa **Agregar conector personalizado**.",
    "En **URL** pega: **{URL}**",
    "Inicia sesión en SEO Total y aprueba el acceso.",
    "En un chat nuevo pega el **prompt** de abajo y envíalo.",
  ],
  "Otra IA": [
    "Abre los **conectores** o **servidores MCP personalizados** de tu IA.",
    "En **URL** pega: **{URL}**",
    "Si pide encabezado, en el nombre escribe: **Authorization**",
    "En el valor pega este texto completo:{TOKEN}",
    "Pega el **prompt** de abajo y envíalo.",
  ],
};

export default function ConfiguracionMcpPage() {
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [selectedAi, setSelectedAi] = useState<string>("Claude");
  const [hostProduct, setHostProduct] = useState<HostProductScope | null>(null);

  useEffect(() => {
    setHostProduct(productOfHost(window.location.hostname));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setServerUrl(`${window.location.origin}/api/mcp`);
    }
  }, []);

  useEffect(() => {
    fetch("/api/mcp/capabilities")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { tools?: Capability[] } | null) => {
        if (data?.tools) setCapabilities(data.tools);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/configuracion/mcp-token");
      if (!res.ok) throw new Error("No se pudo consultar el estado del token.");
      setStatus(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerate() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/configuracion/mcp-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Asistente IA" }),
      });
      if (!res.ok) throw new Error("No se pudo generar el token.");
      const data = (await res.json()) as { token: string };
      setFreshToken(data.token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setWorking(false);
    }
  }

  async function handleRevoke() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/configuracion/mcp-token", { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo revocar el token.");
      setFreshToken(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setWorking(false);
    }
  }

  async function copy(text: string, mark: (v: boolean) => void) {
    await navigator.clipboard.writeText(text);
    mark(true);
    setTimeout(() => mark(false), 2000);
  }

  const visibleCapabilities = hostProduct === "REDES"
    ? capabilities.filter((c) => c.name.includes("social") || c.name.includes("publicacion_social") || c.name.includes("historial") || c.name.includes("cuenta") || c.name.includes("manual"))
    : hostProduct === "ARTICULOS"
      ? capabilities.filter((c) => !c.name.includes("social") && !c.name.includes("publicacion_social"))
      : capabilities;
  const prompt = freshToken && hostProduct ? buildPrompt(serverUrl, freshToken, visibleCapabilities, hostProduct) : null;
  const soloLectura = visibleCapabilities.filter((c) => c.soloLectura);
  const conAccion = visibleCapabilities.filter((c) => !c.soloLectura);
  const productTitle = hostProduct === "REDES" ? "SEO Total Redes" : hostProduct === "ARTICULOS" ? "SEO Total Artículos" : "SEO Total";

  return (
    <div>
      <ModuleIntro titulo="Asistentes IA">
        <IntroP>
          Conecta cualquier asistente de inteligencia artificial —Claude, ChatGPT,
          Meta MUSE o el que uses— directamente a tu cuenta de {productTitle}. Con
          un token personal, el asistente puede consultar tu información y ayudarte
          con las funciones disponibles en este producto, y publicar artículos
          cuando se lo ordenes.
        </IntroP>
        <IntroP>
          Genera el token una sola vez, copia el prompt de abajo y pégalo como
          instrucciones de tu asistente. El valor del token solo se muestra en el
          momento de generarlo: después no podrás volver a verlo, solo revocarlo y
          generar uno nuevo.
        </IntroP>
      </ModuleIntro>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {visibleCapabilities.length > 0 && (
          <section style={sectionStyle}>
            <h2 style={h2Style}>Qué puede hacer hoy un asistente conectado</h2>
            {conAccion.length > 0 && (
              <>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f", marginBottom: 6 }}>
                  Acciones que ejecuta cuando se lo ordenas:
                </p>
                <ul style={{ margin: "0 0 14px", paddingLeft: 20, fontSize: 14, lineHeight: 1.6, color: "#1d1d1f" }}>
                  {conAccion.map((c) => (
                    <li key={c.name}>{c.title}</li>
                  ))}
                </ul>
              </>
            )}
            {soloLectura.length > 0 && (
              <>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f", marginBottom: 6 }}>
                  Solo consulta, sin pedir permiso:
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.6, color: "#1d1d1f" }}>
                  {soloLectura.map((c) => (
                    <li key={c.name}>{c.title}</li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        <section style={sectionStyle}>
          <h2 style={h2Style}>Instrucciones para conectar tu asistente</h2>
          <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {Object.keys(GUIDES).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedAi(name)}
                style={{ border: 0, borderBottom: selectedAi === name ? "2px solid #1d1d1f" : "2px solid transparent", background: "transparent", padding: "8px 4px", marginRight: 12, color: selectedAi === name ? "#1d1d1f" : "#6e6e73", fontWeight: 600, cursor: "pointer" }}
              >
                {name}
              </button>
            ))}
          </nav>
          <ol style={{ margin: "8px 0 0", paddingLeft: 24, lineHeight: 1.6, fontSize: 14 }}>
            {GUIDES[selectedAi].map((step) => (
              <li key={step} style={{ padding: "10px 0", borderBottom: "1px solid #e5e5ea", paddingLeft: 8 }}>
                {step.replace("{URL}", serverUrl).replace("{TOKEN}", "").split("**").map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))}
                {step.includes("{TOKEN}") && (
                  freshToken ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                      <code style={{ flex: 1, padding: "10px 12px", background: "#f5f5f7", borderRadius: 8, fontSize: 13, overflowWrap: "anywhere" }}>Bearer {freshToken}</code>
                      <button type="button" style={secondaryButtonStyle} onClick={() => copy(`Bearer ${freshToken}`, setCopiedToken)}>
                        {copiedToken ? "Copiado ✓" : "Copiar"}
                      </button>
                    </span>
                  ) : (
                    <span style={{ display: "block", marginTop: 8, color: "#6e6e73" }}>Primero pulsa <strong>Generar token</strong> en la sección de abajo y aquí aparecerá el texto completo.</span>
                  )
                )}
              </li>
            ))}
          </ol>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Token personal</h2>

          {loading ? (
            <p style={{ color: "#6e6e73", fontSize: 14 }}>Cargando…</p>
          ) : (
            <>
              {status?.active ? (
                <p style={{ color: "#1d1d1f", fontSize: 14, marginBottom: 12 }}>
                  Tienes un token activo ({status.name}), generado el{" "}
                  {new Date(status.createdAt).toLocaleDateString("es")}
                  {status.lastUsedAt
                    ? `, usado por última vez el ${new Date(status.lastUsedAt).toLocaleString("es")}`
                    : ", todavía sin usar"}
                  .
                </p>
              ) : (
                <p style={{ color: "#6e6e73", fontSize: 14, marginBottom: 12 }}>
                  Todavía no has generado un token.
                </p>
              )}

              {error && (
                <p style={{ color: "#d70015", fontSize: 13, marginBottom: 12 }}>{error}</p>
              )}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" style={buttonStyle} onClick={handleGenerate} disabled={working}>
                  {status?.active ? "Regenerar token" : "Generar token"}
                </button>
                {status?.active && (
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={handleRevoke}
                    disabled={working}
                  >
                    Revocar
                  </button>
                )}
              </div>

              {status?.active && !freshToken && (
                <p style={{ color: "#6e6e73", fontSize: 13, marginTop: 12 }}>
                  Si regeneras el token, el anterior deja de funcionar de inmediato
                  para cualquier asistente que ya lo tenga configurado.
                </p>
              )}
            </>
          )}
        </section>

        {freshToken && (
          <section style={sectionStyle}>
            <h2 style={h2Style}>Tu token (solo se muestra una vez)</h2>
            <div
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 13,
                background: "#f5f5f7",
                borderRadius: 6,
                padding: "12px 14px",
                wordBreak: "break-all",
                color: "#1d1d1f",
              }}
            >
              {freshToken}
            </div>
            <button
              type="button"
              style={{ ...secondaryButtonStyle, marginTop: 12 }}
              onClick={() => copy(freshToken, setCopiedToken)}
            >
              {copiedToken ? "Copiado ✓" : "Copiar token"}
            </button>

            <h2 style={{ ...h2Style, marginTop: 24 }}>Prompt para tu asistente</h2>
            <IntroP>
              Pega este texto completo como instrucciones (o primer mensaje) de tu
              asistente de IA para que sepa cómo conectarse y qué reglas seguir.
            </IntroP>
            <p style={{ color: "#8a1c1c", fontSize: 13, lineHeight: 1.5, margin: "0 0 12px" }}>
              Seguridad: este texto contiene tu token. Pégalo solo en la configuración
              privada del asistente; no lo publiques ni lo envíes a una conversación
              compartida. Si crees que alguien lo vio, revócalo y genera uno nuevo.
            </p>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontFamily: "ui-monospace, monospace",
                fontSize: 12.5,
                lineHeight: 1.6,
                background: "#f5f5f7",
                borderRadius: 6,
                padding: "14px 16px",
                color: "#1d1d1f",
                margin: 0,
              }}
            >
              {prompt}
            </pre>
            <button
              type="button"
              style={{ ...secondaryButtonStyle, marginTop: 12 }}
              onClick={() => prompt && copy(prompt, setCopiedPrompt)}
            >
              {copiedPrompt ? "Copiado ✓" : "Copiar prompt"}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
