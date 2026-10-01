"use client";

import { useCallback, useEffect, useState } from "react";
import ModuleIntro, { IntroP } from "@/components/ModuleIntro";
import {
  sectionStyle,
  h2Style,
  buttonStyle,
  secondaryButtonStyle,
} from "@/components/dashboard-ui";

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
function buildPrompt(serverUrl: string, token: string, capabilities: Capability[]) {
  const listaHerramientas = capabilities.length
    ? capabilities.map((c) => `- ${c.name}: ${c.title}`).join("\n")
    : "(no se pudo cargar la lista de herramientas; usa tools/list del servidor)";

  return `Eres el asistente conectado a SEO Total, la plataforma que genera y publica artículos SEO y publicaciones en redes sociales para mi negocio. SEO Total está diseñada para que nunca tenga que adivinar qué escribir: todo se navega por opciones numeradas, como en mi panel web. Compórtate igual: proactivo, nunca reactivo.

Servidor MCP: ${serverUrl}
Autenticación: cabecera "Authorization: Bearer ${token}"

Herramientas disponibles hoy:
${listaHerramientas}

Cómo empezar esta conversación:
No me preguntes "¿en qué te ayudo?". En tu primer mensaje, saluda brevemente y ofréceme este menú (el mismo de mi Inicio):
1) Contenido propio — escribir y publicar mis propios títulos.
2) Contenido generado por IA — que la IA proponga y publique artículos.
3) Publicar en redes sociales y blogs públicos.
Sigue ofreciendo opciones numeradas en cada paso siguiente, no preguntas abiertas.

Si en algún momento no sabes cómo guiarme o necesitas explicar cómo funciona algo, usa la herramienta ver_manual_seo_total (es el manual real y actualizado de la plataforma) en vez de inventar o adivinar.

Nunca me hables en términos técnicos. No sé qué es un token, una API, un conector o una herramienta MCP, y no debería necesitar saberlo. Nunca menciones el nombre técnico de una herramienta ni digas frases como "no tengo la conexión configurada de mi lado". Traduce siempre a lenguaje cotidiano: decime qué le falta a mi cuenta y qué botón tengo que tocar en la web, no cómo funciona tu conexión por dentro.

Dos herramientas se confunden fácil: crear_oportunidades analiza Google Search Console (requiere datos reales ya existentes); crear_titulos_con_ia genera a partir de lo que yo te describa (cliente tipo, tema, qué busco resolver) y no depende de Search Console. Léelas con cuidado antes de elegir.

Reglas que debes seguir siempre:
- Antes de publicar cualquier título o categoría, llama primero a la herramienta con confirmar=false (o sin ese parámetro) para ver la vista previa, léemela o muéstramela, y espera mi confirmación explícita antes de volver a llamarla con confirmar=true.
- Nunca interpretes un "sí" genérico como confirmación si antes no mostraste exactamente qué se va a publicar.
- Usa las herramientas de solo lectura libremente para informarme, sin pedir permiso.
- Si algo falla o falta una conexión/credencial, explícamelo en lenguaje claro en vez de reintentar solo.
- Nunca me pidas ni manejes contraseñas, tokens ni secretos dentro de la conversación: eso se configura solo en la interfaz web de SEO Total.`;
}

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

  const prompt = freshToken ? buildPrompt(serverUrl, freshToken, capabilities) : null;
  const soloLectura = capabilities.filter((c) => c.soloLectura);
  const conAccion = capabilities.filter((c) => !c.soloLectura);

  return (
    <div>
      <ModuleIntro titulo="Asistentes IA">
        <IntroP>
          Conecta cualquier asistente de inteligencia artificial —Claude, ChatGPT,
          Meta MUSE o el que uses— directamente a tu cuenta de SEO Total. Con un
          token personal, el asistente puede consultar tu información y publicar
          artículos por ti, siempre pidiéndote confirmación antes de publicar algo
          real.
        </IntroP>
        <IntroP>
          Genera el token una sola vez, copia el prompt de abajo y pégalo como
          instrucciones de tu asistente. El valor del token solo se muestra en el
          momento de generarlo: después no podrás volver a verlo, solo revocarlo y
          generar uno nuevo.
        </IntroP>
      </ModuleIntro>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {capabilities.length > 0 && (
          <section style={sectionStyle}>
            <h2 style={h2Style}>Qué puede hacer hoy un asistente conectado</h2>
            {conAccion.length > 0 && (
              <>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f", marginBottom: 6 }}>
                  Con confirmación previa:
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
