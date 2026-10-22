"use client";

import { useCallback, useEffect, useState } from "react";
import { COMMON_MISTAKES, GENERIC_GUIDE, PROVIDERS, guideById, renderSteps } from "@/lib/blog-ia-dns-help";

type Stage = "not_started" | "brand" | "domain" | "dns" | "tls" | "ready_to_activate" | "active" | "suspended" | "deactivated" | "error";

interface LinkItem { label: string; href: string }

/** «Texto | https://…» por línea ⇄ lista de enlaces. */
const linksToText = (items?: LinkItem[]) => (items ?? []).map((l) => `${l.label} | ${l.href}`).join("\n");
const textToLinks = (text: string): LinkItem[] =>
  text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [label, ...rest] = line.split("|");
    return { label: label.trim(), href: rest.join("|").trim() };
  });

interface View {
  exists: boolean;
  status: string;
  stage: Stage;
  config: { siteUrl?: string; name?: string; accentColor?: string; language?: string; whatsapp?: string; tagline?: string; logoUrl?: string; nav?: LinkItem[]; footerLinks?: LinkItem[]; confirmedAt?: string };
  hostname: string | null;
  dns: { type: "CNAME"; host: string; target: string } | null;
  publicUrl: string | null;
  message: string;
  lastError: string | null;
  available: boolean;
}

const card: React.CSSProperties = { padding: 24, background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 18, marginBottom: 16 };
const input: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #d2d2d7", borderRadius: 10, fontSize: 15, boxSizing: "border-box" };
const label: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "#1d1d1f", margin: "14px 0 6px" };
const primary: React.CSSProperties = { padding: "11px 20px", background: "#1d1d1f", color: "#fff", border: 0, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" };
const hint: React.CSSProperties = { fontSize: 13, color: "#6e6e73", lineHeight: 1.5, margin: "6px 0 0" };

const STEPS = ["Mi sitio y marca", "Así se verá", "Conectar dominio", "Activar"];

function stepIndex(stage: Stage): number {
  if (stage === "brand") return 0;
  if (stage === "domain" || stage === "dns" || stage === "tls" || stage === "error") return 2;
  if (stage === "ready_to_activate" || stage === "active" || stage === "suspended" || stage === "deactivated") return 3;
  return -1;
}

export default function BlogIaPage() {
  const [view, setView] = useState<View | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ siteUrl: "", name: "", accentColor: "#0071e3", language: "es", whatsapp: "", tagline: "", logoUrl: "", navText: "", footerText: "" });
  const [hostname, setHostname] = useState("");
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const apply = useCallback((v: View) => {
    setView(v);
    setForm((f) => ({
      siteUrl: v.config.siteUrl ?? f.siteUrl,
      name: v.config.name ?? f.name,
      accentColor: v.config.accentColor ?? f.accentColor,
      language: v.config.language ?? f.language,
      whatsapp: v.config.whatsapp ? `+${v.config.whatsapp}` : f.whatsapp,
      tagline: v.config.tagline ?? f.tagline,
      logoUrl: v.config.logoUrl ?? f.logoUrl,
      navText: v.config.nav ? linksToText(v.config.nav) : f.navText,
      footerText: v.config.footerLinks ? linksToText(v.config.footerLinks) : f.footerText,
    }));
    if (v.hostname) setHostname(v.hostname);
  }, []);

  useEffect(() => {
    fetch("/api/blog-ia", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error ?? "No pudimos cargar BLOG IA.");
        apply(data);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "No pudimos cargar BLOG IA."));
  }, [apply]);

  async function call(url: string, method: string, body?: unknown): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "No pudimos completar la acción.");
        return false;
      }
      apply(data);
      return true;
    } catch {
      setError("No pudimos conectar con el servidor. Inténtalo de nuevo.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function analyzeSite() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await fetch("/api/blog-ia/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: form.siteUrl }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "No pudimos analizar tu sitio. Escribe los datos a mano.");
        return;
      }
      const sg = data.suggestions as { name?: string; logoUrl?: string; accentColor?: string; language?: string; whatsapp?: string; nav: LinkItem[]; footerLinks: LinkItem[] };
      setForm((f) => ({
        ...f,
        name: sg.name ?? f.name,
        logoUrl: sg.logoUrl ?? f.logoUrl,
        accentColor: sg.accentColor ?? f.accentColor,
        language: sg.language && ["es", "en", "pt", "fr", "it", "de"].includes(sg.language) ? sg.language : f.language,
        whatsapp: sg.whatsapp ?? f.whatsapp,
        navText: sg.nav.length ? linksToText(sg.nav) : f.navText,
        footerText: sg.footerLinks.length ? linksToText(sg.footerLinks) : f.footerText,
      }));
      const found = !!(sg.name || sg.logoUrl || sg.accentColor || sg.whatsapp || sg.nav.length || sg.footerLinks.length);
      setNotice(found
        ? "Esto fue lo que encontramos en tu sitio. Revisa cada dato antes de continuar: puede que algo no sea correcto."
        : "Leímos tu sitio pero no encontramos datos para sugerirte (puede que arme su contenido con JavaScript). Escríbelos a mano.");
    } catch {
      setError("No pudimos conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  function saveBrand(confirm: boolean) {
    const { navText, footerText, ...rest } = form;
    return call("/api/blog-ia/config", "PUT", { ...rest, nav: textToLinks(navText), footerLinks: textToLinks(footerText), confirm });
  }

  if (loadError) {
    return <div style={{ ...card, maxWidth: 640, margin: "24px auto" }}><h2 style={{ margin: 0 }}>BLOG IA no está disponible</h2><p style={hint}>{loadError}</p></div>;
  }
  if (!view) return null;

  const idx = stepIndex(view.stage);
  const confirmed = !!view.config.confirmedAt;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 0 48px" }}>
      <p className="eyebrow" style={{ margin: "0 0 4px" }}>Publicaciones</p>
      <h1 style={{ margin: 0, fontSize: 32, color: "#1d1d1f" }}>BLOG IA</h1>
      <p style={{ margin: "10px 0 20px", color: "#6e6e73", lineHeight: 1.5 }}>{view.message}</p>

      {idx >= 0 && (
        <ol aria-label="Progreso" style={{ display: "flex", gap: 8, listStyle: "none", padding: 0, margin: "0 0 20px", flexWrap: "wrap" }}>
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === idx ? "step" : undefined} style={{ fontSize: 13, padding: "6px 12px", borderRadius: 999, background: i === idx ? "#1d1d1f" : i < idx ? "#e8e8ed" : "#f5f5f7", color: i === idx ? "#fff" : "#6e6e73" }}>
              {i + 1}. {s}
            </li>
          ))}
        </ol>
      )}

      {!view.available && (
        <div role="status" style={{ ...card, background: "#fff8e6", borderColor: "#f0d9a0" }}>
          <strong>La conexión del servidor aún no está lista.</strong>
          <p style={hint}>Puedes guardar tu marca; conectar el dominio estará disponible cuando el administrador termine la configuración del servidor.</p>
        </div>
      )}

      {notice && !error && <div role="status" style={{ ...card, background: "#eef6ff", borderColor: "#b9d6f5", color: "#0b3a66" }}>{notice}</div>}
      {error && <div role="alert" style={{ ...card, background: "#fff1f0", borderColor: "#f5b5b0", color: "#8a1c14" }}>{error}</div>}
      {view.lastError && !error && <div role="status" style={{ ...card, background: "#fff1f0", borderColor: "#f5b5b0", color: "#8a1c14" }}>{view.lastError}</div>}

      {view.stage === "not_started" && (
        <section style={card}>
          <h2 style={{ margin: "0 0 8px" }}>Tu blog inteligente, sin cambiar tu página web</h2>
          <p style={hint}>BLOG IA publica los artículos creados por SEO Total en un blog moderno conectado a tu propio dominio. Tu página actual sigue funcionando donde está. Mientras BLOG IA esté activo, tus artículos se publican solo en el blog.</p>
          <ul style={{ ...hint, paddingLeft: 18 }}><li>Tu marca y dominio</li><li>Diseño listo para móvil</li><li>Artículos organizados por categorías</li><li>SEO técnico incluido</li></ul>
          <button style={{ ...primary, marginTop: 14 }} disabled={busy} onClick={() => call("/api/blog-ia", "POST")}>Configurar mi BLOG IA</button>
        </section>
      )}

      {(view.stage === "brand" || (idx === 2 && !confirmed)) && (
        <BrandForm form={form} setForm={setForm} busy={busy} onAnalyze={analyzeSite} onSave={(confirm) => saveBrand(confirm)} />
      )}

      {confirmed && (view.stage === "domain" || view.stage === "dns" || view.stage === "tls" || view.stage === "error") && (
        <section style={card}>
          <h2 style={{ margin: "0 0 8px" }}>Conecta tu dominio</h2>
          <label htmlFor="hostname" style={label}>Subdominio de tu blog</label>
          <input id="hostname" style={input} value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="blog.tuempresa.com" autoCapitalize="none" autoCorrect="off" />
          <p style={hint}>Te recomendamos <strong>blog.</strong> seguido de tu dominio. No pedimos credenciales de tu DNS.</p>
          <button style={{ ...primary, marginTop: 12 }} disabled={busy || !hostname.trim()} onClick={() => call("/api/blog-ia/domain", "PUT", { hostname })}>Guardar dominio</button>

          {view.dns && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Crea este registro en tu proveedor de dominio</h3>
              <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
                <tbody>
                  <tr><th align="left" style={{ padding: 6 }}>Tipo</th><td>{view.dns.type}</td></tr>
                  <tr><th align="left" style={{ padding: 6 }}>Host</th><td><code>{view.dns.host}</code> <CopyButton text={view.dns.host} /></td></tr>
                  <tr><th align="left" style={{ padding: 6 }}>Destino</th><td><code>{view.dns.target}</code> <CopyButton text={view.dns.target} /></td></tr>
                </tbody>
              </table>
              <p style={hint}>Estado: <strong>{view.stage === "dns" ? "Pendiente" : view.stage === "tls" ? "Certificado en proceso" : view.stage === "error" ? "Necesita corrección" : "Pendiente"}</strong>. Los cambios de DNS pueden tardar en propagarse; no podemos prometer un tiempo exacto.</p>
              <button style={primary} disabled={busy} onClick={() => call("/api/blog-ia/verify", "POST")}>Verificar conexión</button>
              <DnsHelp hostname={view.dns.host} target={view.dns.target} />
            </div>
          )}
        </section>
      )}

      {view.stage === "ready_to_activate" && (
        <section style={card}>
          <h2 style={{ margin: "0 0 8px" }}>Todo listo</h2>
          <p style={hint}>Tu dominio <strong>{view.hostname}</strong> apunta bien y tiene HTTPS. Al activar, los artículos de esta cuenta se publicarán solo en tu blog y dejarán de publicarse en 10minutesWebsite.</p>
          <button style={{ ...primary, marginTop: 12 }} disabled={busy} onClick={() => call("/api/blog-ia/activate", "POST")}>Activar BLOG IA</button>
        </section>
      )}

      {view.stage === "active" && (
        <section style={card}>
          <h2 style={{ margin: "0 0 8px" }}>Activo</h2>
          <p style={hint}>Tu blog está publicado en <a href={view.publicUrl ?? "#"} target="_blank" rel="noreferrer">{view.publicUrl}</a>. Agrega ese enlace manualmente a tu página principal; no hace falta tocar su código.</p>
        </section>
      )}

      {view.stage === "active" && (
        <section style={card}>
          <h2 style={{ margin: "0 0 8px" }}>Desactivar BLOG IA</h2>
          <p style={hint}>Tu blog dejará de mostrarse (los visitantes verán «temporalmente fuera de servicio») y los buscadores lo irán sacando de sus resultados. Tus artículos y tu configuración se conservan y tus publicaciones se detienen hasta que lo reactives.</p>
          <button style={{ ...primary, background: "#fff", color: "#8a1c14", border: "1px solid #f5b5b0", marginTop: 10 }} disabled={busy} onClick={() => { if (window.confirm("¿Desactivar tu BLOG IA? Tus publicaciones se detendrán hasta que lo reactives.")) call("/api/blog-ia/deactivate", "POST"); }}>Desactivar BLOG IA</button>
        </section>
      )}

      {view.stage === "deactivated" && (
        <section style={card}>
          <h2 style={{ margin: "0 0 8px" }}>Desactivado</h2>
          <p style={hint}>Tu blog está fuera de servicio y tus publicaciones están detenidas. Tu contenido se conserva: al reactivarlo recuperas todo lo que tenías.</p>
          <button style={{ ...primary, marginTop: 10 }} disabled={busy} onClick={() => call("/api/blog-ia/reactivate", "POST")}>Reactivar BLOG IA</button>
        </section>
      )}

      {view.stage === "active" && (
        <>
          {!editing ? (
            <button style={{ ...primary, background: "#fff", color: "#1d1d1f", border: "1px solid #d2d2d7" }} onClick={() => setEditing(true)}>Editar marca, menú y pie</button>
          ) : (
            <BrandForm form={form} setForm={setForm} busy={busy} confirmOnly onAnalyze={analyzeSite} onSave={async (c) => { if (await saveBrand(c)) setEditing(false); }} />
          )}
        </>
      )}

      {view.stage === "suspended" && (
        <section style={card}>
          <h2 style={{ margin: "0 0 8px" }}>Suspendido</h2>
          <p style={hint}>Tu blog está temporalmente fuera de servicio. Se conservan tu contenido y tu configuración.</p>
        </section>
      )}
    </div>
  );
}

/** Pasos para crear el registro en el proveedor del cliente, con detección automática. */
function DnsHelp({ hostname, target }: { hostname: string; target: string }) {
  const [info, setInfo] = useState<{ providerId: string | null; providerName: string | null; label: string; full: string } | null>(null);
  const [providerId, setProviderId] = useState("generic");
  useEffect(() => {
    let alive = true;
    fetch("/api/blog-ia/dns-help", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hostname }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        setInfo(d);
        if (d.providerId) setProviderId(d.providerId);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [hostname]);

  const label = info?.label ?? hostname.split(".")[0];
  const full = info?.full ?? hostname;
  const guide = guideById(providerId);
  const steps = renderSteps(guide, { label, full, target });
  const message = `Hola, necesito que crees este registro DNS en el proveedor de mi dominio:\n\nTipo: CNAME\nNombre: ${label} (o ${full})\nDestino: ${target}\n\nEs para conectar mi blog en ${full}. Gracias.`;

  return (
    <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #e8e8ed" }}>
      <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>¿Cómo lo hago en mi proveedor?</h3>
      {info?.providerName ? (
        <p style={hint}>Detectamos que tu dominio usa <strong>{info.providerName}</strong>. Si no es así, elige otro:</p>
      ) : (
        <p style={hint}>Elige dónde administras tu dominio. Si no sabes cuál es, deja «Otro proveedor» y sigue la guía general.</p>
      )}
      <select aria-label="Proveedor de tu dominio" style={{ ...input, marginTop: 8, maxWidth: 360 }} value={providerId} onChange={(e) => setProviderId(e.target.value)}>
        {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        <option value={GENERIC_GUIDE.id}>{GENERIC_GUIDE.name}</option>
      </select>
      <ol style={{ ...hint, paddingLeft: 20, marginTop: 12 }}>
        {steps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
      </ol>
      {guide.tip && <p style={hint}><strong>Ojo:</strong> {guide.tip}</p>}
      <details style={{ marginTop: 8 }}>
        <summary style={{ ...hint, cursor: "pointer" }}>Errores frecuentes</summary>
        <ul style={{ ...hint, paddingLeft: 20 }}>{COMMON_MISTAKES.map((m, i) => <li key={i}>{m.replaceAll("{label}", label)}</li>)}</ul>
      </details>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <CopyButton text={message} label="Copiar instrucciones" />
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" style={{ padding: "2px 10px", fontSize: 12, border: "1px solid #d2d2d7", borderRadius: 8, background: "#fff", color: "#1d1d1f", textDecoration: "none" }}>Enviar por WhatsApp</a>
        <a href={`mailto:?subject=${encodeURIComponent("Registro DNS para mi blog")}&body=${encodeURIComponent(message)}`} style={{ padding: "2px 10px", fontSize: 12, border: "1px solid #d2d2d7", borderRadius: 8, background: "#fff", color: "#1d1d1f", textDecoration: "none" }}>Enviar por correo</a>
      </div>
      <p style={hint}>¿Lo administra otra persona? Envíale estas instrucciones y listo.</p>
    </div>
  );
}

function CopyButton({ text, label: buttonLabel }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={() => navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {})} style={{ marginLeft: 6, padding: "2px 10px", fontSize: 12, border: "1px solid #d2d2d7", borderRadius: 8, background: "#fff", color: "#1d1d1f", cursor: "pointer" }}>
      {done ? "Copiado" : (buttonLabel ?? "Copiar")}
    </button>
  );
}

function BrandForm({ form, setForm, busy, confirmOnly, onAnalyze, onSave }: {
  form: { siteUrl: string; name: string; accentColor: string; language: string; whatsapp: string; tagline: string; logoUrl: string; navText: string; footerText: string };
  setForm: (f: typeof form) => void;
  busy: boolean;
  confirmOnly?: boolean;
  onAnalyze?: () => void;
  onSave: (confirm: boolean) => unknown;
}) {
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <section style={card}>
      <h2 style={{ margin: "0 0 8px" }}>Tu sitio y tu marca</h2>
      <p style={hint}>Revisa cada dato: es lo que verán tus visitantes. Puedes cambiarlo después.</p>
      <label htmlFor="siteUrl" style={label}>Sitio web principal (https://)</label>
      <input id="siteUrl" style={input} value={form.siteUrl} onChange={set("siteUrl")} placeholder="https://tuempresa.com" />
      {onAnalyze && (
        <>
          <button type="button" style={{ ...primary, background: "#fff", color: "#1d1d1f", border: "1px solid #d2d2d7", marginTop: 8 }} disabled={busy || !form.siteUrl.trim()} onClick={onAnalyze}>Analizar mi sitio</button>
          <p style={hint}>Leemos solo la portada pública de tu sitio para sugerirte el nombre, el logo, los colores y los enlaces. Tú decides qué conservar.</p>
        </>
      )}
      <label htmlFor="name" style={label}>Nombre comercial</label>
      <input id="name" style={input} value={form.name} onChange={set("name")} maxLength={80} />
      <label htmlFor="tagline" style={label}>Eslogan (opcional)</label>
      <input id="tagline" style={input} value={form.tagline} onChange={set("tagline")} maxLength={160} />
      <label htmlFor="logoUrl" style={label}>Dirección del logo (opcional, https)</label>
      <input id="logoUrl" style={input} value={form.logoUrl} onChange={set("logoUrl")} placeholder="https://tuempresa.com/logo.png" />
      <label htmlFor="accent" style={label}>Color principal</label>
      <input id="accent" type="color" value={form.accentColor} onChange={set("accentColor")} style={{ width: 60, height: 36, border: "1px solid #d2d2d7", borderRadius: 8 }} />
      <label htmlFor="language" style={label}>Idioma del blog</label>
      <select id="language" style={input} value={form.language} onChange={set("language")}>
        <option value="es">Español</option><option value="en">English</option><option value="pt">Português</option><option value="fr">Français</option><option value="it">Italiano</option><option value="de">Deutsch</option>
      </select>
      <label htmlFor="whatsapp" style={label}>WhatsApp (opcional, con código de país)</label>
      <input id="whatsapp" style={input} value={form.whatsapp} onChange={set("whatsapp")} placeholder="+57 300 123 4567" inputMode="tel" />
      <label htmlFor="navText" style={label}>Menú del encabezado (opcional, hasta 8)</label>
      <textarea id="navText" style={{ ...input, minHeight: 84, fontFamily: "inherit" }} value={form.navText} onChange={set("navText")} placeholder={"Inicio | https://tuempresa.com\nServicios | https://tuempresa.com/servicios"} />
      <p style={hint}>Un enlace por línea: texto, una barra vertical y la dirección https.</p>
      <label htmlFor="footerText" style={label}>Enlaces del pie de página (opcional, hasta 10)</label>
      <textarea id="footerText" style={{ ...input, minHeight: 84, fontFamily: "inherit" }} value={form.footerText} onChange={set("footerText")} placeholder={"Privacidad | https://tuempresa.com/privacidad"} />
      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        {!confirmOnly && <button style={{ ...primary, background: "#fff", color: "#1d1d1f", border: "1px solid #d2d2d7" }} disabled={busy} onClick={() => onSave(false)}>Guardar borrador</button>}
        <button style={primary} disabled={busy} onClick={() => onSave(true)}>{confirmOnly ? "Guardar cambios" : "Confirmar y continuar"}</button>
      </div>
    </section>
  );
}
