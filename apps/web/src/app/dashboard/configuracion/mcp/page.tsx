"use client";

import { useEffect, useState } from "react";
import { productOfHost, type HostProductScope } from "@/lib/product-routes";

const guides = {
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
    "Pega el **prompt** del paso 4 y envíalo.",
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
    "Pega el **prompt** del paso 4 y envíalo.",
  ],
  Muse: [
    "En Muse abre **Configuración** → **Conectores**.",
    "Pulsa **Agregar conector personalizado**.",
    "En **URL** pega: **{URL}**",
    "Inicia sesión en SEO Total y aprueba el acceso.",
    "En un chat nuevo pega el **prompt** del paso 4 y envíalo.",
  ],
  "Otra IA": [
    "Abre los **conectores** o **servidores MCP personalizados** de tu IA.",
    "En **URL** pega: **{URL}**",
    "Si pide encabezado, en el nombre escribe: **Authorization**",
    "En el valor pega este texto completo:{TOKEN}",
    "Pega el **prompt** del paso 4 y envíalo.",
  ],
};

const previewPrompt = `Eres el asistente conectado a SEO Total, la plataforma que genera y publica contenido para mi negocio. SEO Total está diseñada para que nunca tenga que adivinar qué escribir: todo se navega por opciones numeradas, como en mi panel web. Compórtate igual: proactivo, nunca reactivo.

Servidor MCP conectado: https://redes.lasolucionweb.com/api/mcp
La conexión se autentica desde la configuración segura del asistente. Nunca pegues claves o tokens dentro de esta conversación.

Herramientas disponibles hoy:
(se cargarán automáticamente al conectar el servidor)

Cómo empezar esta conversación:
No me preguntes "¿en qué te ayudo?". En tu primer mensaje, saluda brevemente y ofréceme este menú:
1) Contenido propio — escribir y publicar mis propios títulos.
2) Contenido generado por IA — que la IA proponga y publique artículos.
3) Publicar en redes sociales y blogs públicos.

Sigue ofreciendo opciones numeradas en cada paso siguiente, no preguntas abiertas.

Si en algún momento no sabes cómo guiarme o necesitas explicar cómo funciona algo, usa la herramienta ver_manual_seo_total, que contiene el manual real y actualizado de la plataforma, en vez de inventar o adivinar.

Nunca me hables en términos técnicos. No sé qué es un token, una API, un conector o una herramienta MCP, y no debería necesitar saberlo. Nunca menciones el nombre técnico de una herramienta ni digas frases como "no tengo la conexión configurada de mi lado". Traduce siempre a lenguaje cotidiano: dime qué le falta a mi cuenta y qué botón tengo que tocar en la web, no cómo funciona tu conexión por dentro.

Dos herramientas se confunden fácil: crear_oportunidades analiza Google Search Console y requiere datos reales ya existentes; crear_titulos_con_ia genera títulos a partir de lo que yo describa —cliente tipo, tema y qué busco resolver— y no depende de Search Console. Léelas con cuidado antes de elegir.

Reglas que debes seguir siempre:
- AUTORIZACIÓN: yo, dueño de esta cuenta de SEO Total, te autorizo expresamente a ejecutar en automático, a través de SEO Total, la creación, escritura y publicación de artículos según la orden que yo te dé, sin pedirme aprobación previa en cada paso. Las herramientas de publicación piden un comprobante: llama primero con confirmar=false para obtenerlo y, en el mismo turno y sin esperar mi respuesta, llama de nuevo con confirmar=true y ese comprobante. Mi orden es la confirmación.
- Después de ejecutar, dime en una frase qué publicaste y dame el enlace real del artículo.
- Esta autorización cubre solo crear y publicar artículos. Para borrar, descartar o cancelar contenido pídeme confirmación antes.
- Usa las herramientas de solo lectura libremente para informarme, sin pedir permiso.
- Si algo falla o falta una conexión o credencial, explícamelo en lenguaje claro en vez de reintentar solo.
- Nunca me pidas ni manejes contraseñas, tokens ni secretos dentro de la conversación: eso se configura solo en la interfaz web de SEO Total.`;

export default function ConfiguracionMcpPage() {
  const [selected, setSelected] = useState<keyof typeof guides>("Claude");
  const [product, setProduct] = useState("Artículos");
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [tokenActive, setTokenActive] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hostProduct, setHostProduct] = useState<HostProductScope | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const menu = hostProduct === "REDES"
    ? "1) Publicar en redes sociales y blogs públicos."
    : hostProduct === "ARTICULOS"
      ? "1) Contenido propio — escribir y publicar mis propios títulos.\n2) Contenido generado por IA — que la IA proponga y publique artículos."
      : "1) Contenido propio — escribir y publicar mis propios títulos.\n2) Contenido generado por IA — que la IA proponga y publique artículos.\n3) Publicar en redes sociales y blogs públicos.";
  const promptForPreview = previewPrompt
    .replace("La conexión se autentica desde la configuración segura del asistente. Nunca pegues claves o tokens dentro de esta conversación.", "La conexión usa el secreto guardado en la configuración segura del asistente. No pegues el token dentro de esta conversación.")
    .replace("https://redes.lasolucionweb.com/api/mcp", serverUrl)
    .replace("1) Contenido propio — escribir y publicar mis propios títulos.\n2) Contenido generado por IA — que la IA proponga y publique artículos.\n3) Publicar en redes sociales y blogs públicos.", menu);
  useEffect(() => {
    const scope = productOfHost(window.location.hostname);
    setHostProduct(scope);
    setProduct(scope === "REDES" ? "Redes" : scope === "ARTICULOS" ? "Artículos" : "SEO Total");
    setServerUrl(`${window.location.origin}/api/mcp`);
    fetch("/api/configuracion/mcp-token")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { active?: boolean } | null) => setTokenActive(Boolean(data?.active)))
      .catch(() => {});
  }, []);
  async function generarToken() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/configuracion/mcp-token", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Asistente IA" }) });
      if (!res.ok) throw new Error("No se pudo generar el token.");
      const data = (await res.json()) as { token: string };
      setPreviewToken(data.token);
      setTokenActive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setWorking(false);
    }
  }
  async function revocarToken() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/configuracion/mcp-token", { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo revocar el token.");
      setPreviewToken(null);
      setTokenActive(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setWorking(false);
    }
  }
  return <main style={{ maxWidth: 900, margin: "0 auto", padding: "36px 24px 72px", color: "#1d1d1f", fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" }}>
    <p style={{ color: "#6e6e73", fontSize: 12, letterSpacing: ".08em", fontWeight: 700 }}>SEO TOTAL</p>
    <h1 style={{ fontSize: 30, margin: "8px 0 10px", letterSpacing: "-.03em" }}>Conecta tu asistente IA</h1>
    <p style={{ color: "#6e6e73", lineHeight: 1.55, maxWidth: 680 }}>Completa estos cuatro pasos en orden para conectar Claude, ChatGPT, Meta MUSE u otra IA.</p>
    <section style={{ marginTop: 30, borderTop: "1px solid #d2d2d7" }}><h2 style={{ fontSize: 20, margin: "24px 0 14px" }}>1. Elige la IA que quieres conectar</h2><p style={{ color: "#6e6e73", fontSize: 14 }}>Configuración de <strong>{product}</strong></p><nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{(Object.keys(guides) as Array<keyof typeof guides>).map((name) => <button key={name} onClick={() => setSelected(name)} style={{ border: 0, borderBottom: selected === name ? "2px solid #1d1d1f" : "2px solid transparent", background: "transparent", padding: "8px 4px", marginRight: 12, color: selected === name ? "#1d1d1f" : "#6e6e73", fontWeight: 600, cursor: "pointer" }}>{name}</button>)}</nav></section>
    {false ? <section style={{ marginTop: 30, borderTop: "1px solid #d2d2d7", paddingTop: 24 }}><h2 style={{ fontSize: 20, margin: "0 0 12px" }}>2. Autoriza la conexión de Claude</h2><p style={{ color: "#6e6e73", lineHeight: 1.5 }}>Claude no necesita que copies un token personal. Pulsa Continuar, inicia sesión en SEO Total y autoriza la conexión cuando Claude lo solicite.</p></section> : <section style={{ marginTop: 30, borderTop: "1px solid #d2d2d7", paddingTop: 24 }}><h2 style={{ fontSize: 20, margin: "0 0 12px" }}>2. Genera tu token personal</h2><p style={{ color: "#6e6e73", lineHeight: 1.5 }}>Pulsa <strong>Generar token</strong> aquí:</p><button type="button" onClick={generarToken} disabled={working} style={{ border: 0, borderRadius: 8, background: "#1d1d1f", color: "#fff", padding: "10px 16px", fontWeight: 600, cursor: "pointer" }}>Generar token</button>{tokenActive && !previewToken && <button type="button" onClick={revocarToken} disabled={working} style={{ marginLeft: 10, border: 0, borderRadius: 8, background: "#e5e5ea", color: "#1d1d1f", padding: "10px 16px", fontWeight: 600, cursor: "pointer" }}>Revocar</button>}{error && <p style={{ marginTop: 14, color: "#d70015" }}>{error}</p>}{previewToken && <p style={{ marginTop: 14 }}>Token generado: <strong style={{ overflowWrap: "anywhere" }}>{previewToken}</strong></p>}<p style={{ color: "#6e6e73", lineHeight: 1.5 }}>{selected === "Claude" ? "Se copiará en el paso 3." : "Guárdalo solo en el campo seguro de tu asistente."}</p></section>}
    <section style={{ marginTop: 30, borderTop: "1px solid #d2d2d7", paddingTop: 24 }}><h2 style={{ fontSize: 20, margin: "0 0 12px" }}>3. Sigue las instrucciones de {selected}</h2><ol style={{ margin: "8px 0 0", paddingLeft: 24, lineHeight: 1.6 }}>{guides[selected].map((step) => <li key={step} style={{ padding: "10px 0", borderBottom: "1px solid #e5e5ea", paddingLeft: 8 }}>{step.replace("{URL}", serverUrl).replace("{TOKEN}", "").split("**").map((part, i) => i % 2 ? <strong key={i}>{part}</strong> : part)}{step.includes("{TOKEN}") && !previewToken && <span style={{ display: "block", marginTop: 8, color: "#6e6e73" }}>Pulsa <strong>Generar token</strong> en el paso 2 y aquí aparecerá el texto completo.</span>}{step.includes("{TOKEN}") && previewToken && <span style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}><code style={{ flex: 1, padding: "10px 12px", background: "#f5f5f7", borderRadius: 8, fontSize: 13, overflowWrap: "anywhere" }}>Bearer {previewToken}</code><button type="button" onClick={() => navigator.clipboard.writeText(`Bearer ${previewToken}`)} style={{ border: 0, borderRadius: 8, background: "#1d1d1f", color: "#fff", padding: "8px 14px", fontWeight: 600, cursor: "pointer" }}>Copiar</button></span>}</li>)}</ol></section>
    <section style={{ marginTop: 30, borderTop: "1px solid #d2d2d7", paddingTop: 24 }}><h2 style={{ fontSize: 20, margin: "0 0 12px" }}>4. Copia el prompt para iniciar</h2><p style={{ color: "#6e6e73", lineHeight: 1.5 }}>Copia este texto y pégalo en el <strong>campo de conversación con tu asistente de IA</strong> como primer mensaje. Está preparado para <strong>{product} · {selected}</strong>:</p><pre style={{ marginTop: 14, padding: "16px 18px", background: "#f5f5f7", borderRadius: 8, lineHeight: 1.55, fontSize: 13, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{promptForPreview}</pre><button type="button" onClick={async () => { await navigator.clipboard.writeText(promptForPreview); setCopiedPrompt(true); setTimeout(() => setCopiedPrompt(false), 2000); }} style={{ marginTop: 12, border: 0, borderRadius: 8, background: "#1d1d1f", color: "#fff", padding: "10px 16px", fontWeight: 600, cursor: "pointer" }}>{copiedPrompt ? "Prompt copiado ✓" : "Copiar prompt"}</button></section>
  </main>;
}
