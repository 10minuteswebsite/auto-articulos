"use client";

import { useEffect, useState } from "react";
import { startOfSocialDay } from "@auto-articulos/shared/src/social-day";
import { MENU_NAMES } from "@/lib/menu-names";
import MobileInstructions from "@/components/MobileInstructions";
import { useRouter } from "next/navigation";
import {
  buttonStyle,
  disabledStyle,
  h2Style,
  secondaryButtonStyle,
} from "@/components/dashboard-ui";
import type { CSSProperties } from "react";

// Pedido explícito de Milton (7/9/2026): esta pantalla había acumulado
// botones con tamaños, radios y tipografías distintas entre sí (pill de
// radio 20 en los de red, radio 10 en el resto, fuentes 12/13/14 mezcladas).
// Un único tamaño estándar para TODOS los botones de esta página, sobre las
// variantes ya existentes (buttonStyle/secondaryButtonStyle), en vez de que
// cada botón traiga su propio ajuste suelto.
const uniformButtonSize: CSSProperties = {
  padding: "9px 16px",
  borderRadius: 10,
  fontSize: 13,
};

interface SocialOpportunity {
  id: string;
  articleTitle: string;
  articleUrl: string;
  platform: string;
  suggestedText: string;
  status: string;
  postId: string | null;
  errorLog: string | null;
  skipReason: string | null;
  createdAt: string;
  publishedAt: string | null;
  finishedAt?: string | null;
}

const SKIP_REASONS = [
  "El tema no es relevante para mi audiencia",
  "El copy no me gusta / no representa mi voz",
  "El formato no es adecuado para este tema",
  "Ya publiqué algo similar recientemente",
  "Prefiero programarlo para después",
];

const gscStages = [
  "Consultando Google Search Console",
  "Analizando mejores temas por rendimiento",
  "Generando copy con IA",
  "Guardando propuestas",
];

const fallbackStages = [
  "Buscando artículos recientes sin usar",
  "Generando copy con IA",
  "Guardando propuestas",
];

type NetworkGroup = "meta" | "otras";

/** Redes de la pantalla, agrupadas: META (Instagram, Threads, Facebook) y el resto. */
const NETWORK_ROWS = [
  { key: "instagram", platform: "instagram", label: "Instagram", conexionId: "instagram", group: "meta" },
  { key: "threads", platform: "threads", label: "Threads", conexionId: "threads", group: "meta" },
  { key: "facebookPage", platform: "facebook-page", label: "Facebook", conexionId: "facebook", group: "meta" },
  { key: "linkedin", platform: "linkedin", label: "LinkedIn", conexionId: "linkedin", group: "otras" },
  { key: "pinterest", platform: "pinterest", label: "Pinterest", conexionId: "pinterest", group: "otras" },
  { key: "tumblr", platform: "tumblr", label: "Tumblr", conexionId: "tumblr", group: "otras" },
  { key: "bluesky", platform: "bluesky", label: "Bluesky", conexionId: "bluesky", group: "otras" },
  { key: "googleBusiness", platform: "google-business", label: "Google Business Profile", conexionId: "business-profile", group: "otras" },
  { key: "x", platform: "x", label: "X (Twitter)", conexionId: null, group: "otras" },
] as const;

/** A qué grupo pertenece una propuesta según su red (instagram-post, facebook-story, threads…). */
function groupOfPlatform(platform: string): NetworkGroup {
  const value = platform.trim().toLowerCase();
  return value === "threads" || value.startsWith("instagram") || value.startsWith("facebook") ? "meta" : "otras";
}

/** Redacta lo que publica el sistema: «1 publicación por día» o «por día: Instagram 5, Threads 5 y Facebook 1». */
function describeDailyLimits(rows: ReadonlyArray<{ key: string; label: string }>, limits: Record<string, number>): string {
  const items = rows.map((row) => ({ label: row.label, limit: limits[row.key] ?? 1 }));
  if (items.length === 0) return "1 publicación por día";
  const first = items[0].limit;
  if (items.every((item) => item.limit === first)) {
    return first === 0 ? "ninguna publicación (Administración la tiene en 0)" : `${first} ${first === 1 ? "publicación" : "publicaciones"} por día en cada red`;
  }
  const parts = items.map((item) => `${item.label} ${item.limit}`);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}` : parts[0];
  return `por día: ${list}`;
}

/** Botones compactos de esta pantalla (los estándar de la plataforma son demasiado grandes aquí). */
const compactPrimary: CSSProperties = { height: 34, padding: "0 16px", borderRadius: 8, border: "1px solid #1d1d1f", background: "#1d1d1f", color: "#ffffff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", margin: 0, minHeight: 0 };
const compactSecondary: CSSProperties = { ...compactPrimary, border: "1px solid #d2d2d7", background: "#ffffff", color: "#1d1d1f" };
const compactDanger: CSSProperties = { ...compactPrimary, border: "1px solid transparent", background: "transparent", color: "#ff3b30", padding: "0 8px" };

/** Nombre legible de la red de una propuesta (instagram-post → «Instagram · Post»). */
function platformLabel(platform: string): string {
  const labels: Record<string, string> = {
    threads: "Threads",
    x: "X",
    linkedin: "LinkedIn",
    pinterest: "Pinterest",
    tumblr: "Tumblr",
    bluesky: "Bluesky",
    blogger: "Blogger",
    "google-business": "Google Business",
    "facebook-page": "Facebook",
    "facebook-story": "Facebook · Story",
    "instagram-post": "Instagram · Post",
    "instagram-story": "Instagram · Story",
    "instagram-reel-image": "Instagram · Reel",
    "instagram-carousel": "Instagram · Carrusel",
    "instagram-infografia": "Instagram · Infografía",
  };
  return labels[platform.trim().toLowerCase()] ?? platform;
}

/**
 * Formato cuyo cupo muestra la tarjeta de cada red: el mismo que Administración controla como
 * «principal» (Instagram → publicación, Facebook → publicación en la Página). «Hoy X de N» cuenta
 * solo ese formato para que X y N hablen de lo mismo.
 */
function limitFormatOf(rowKey: string, rowPlatform: string): string {
  if (rowKey === "instagram") return "instagram-post";
  if (rowKey === "facebookPage") return "facebook-page";
  return rowPlatform;
}

const GROUP_CARDS: ReadonlyArray<{ id: NetworkGroup; title: string; hint: string }> = [
  { id: "meta", title: "META", hint: "Instagram, Threads y Facebook" },
  { id: "otras", title: "Otras redes y blogs", hint: "LinkedIn, Pinterest, Tumblr, Bluesky y Google Business" },
];

export default function OportunidadesRedesPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<SocialOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingNetwork, setGeneratingNetwork] = useState<"threads" | "x" | "linkedin" | "instagram" | "facebook-page" | "pinterest" | "tumblr" | "bluesky" | "blogger" | "google-business" | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [connectedNetworks, setConnectedNetworks] = useState({ threads: false, x: false, linkedin: false, instagram: false, facebookPage: false, pinterest: false, tumblr: false, bluesky: false, blogger: false, googleBusiness: false });
  const [activeNetworks, setActiveNetworks] = useState({ threads: false, x: false, linkedin: false, instagram: false, facebookPage: false, pinterest: false, tumblr: false, bluesky: false, blogger: false, googleBusiness: false });
  const [storiesUnavailable, setStoriesUnavailable] = useState({ instagram: false, facebook: false });
  const [generateSeconds, setGenerateSeconds] = useState(0);
  const [usedGsc, setUsedGsc] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishingAll, setPublishingAll] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  const [skipModal, setSkipModal] = useState<{ opp: SocialOpportunity; reason: string; customReason: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dailyLimits, setDailyLimits] = useState<Record<string, number>>({});
  const [openGroup, setOpenGroup] = useState<NetworkGroup | null>(null);
  // Las tarjetas del Inicio enlazan aquí con ?grupo=meta|otras para abrir ese grupo directo.
  useEffect(() => {
    const grupo = new URLSearchParams(window.location.search).get("grupo");
    if (grupo === "meta" || grupo === "otras") setOpenGroup(grupo);
  }, []);
  // Entrada directa por enlace antiguo o marcador: /dashboard/oportunidades-redes?grupo=meta|otras
  useEffect(() => {
    const grupo = new URLSearchParams(window.location.search).get("grupo");
    if (grupo === "meta" || grupo === "otras") {
      setOpenGroup(grupo);
    }
  }, []);
  const [previewModal, setPreviewModal] = useState<{ loading: boolean; imageUrl: string | null; imageBase64: string | null; platform: string; title: string } | null>(null);

  useEffect(() => {
    loadOpportunities(true);
    loadConnectedNetworks();
  }, []);

  useEffect(() => {
    const hasActiveItems = opportunities.some(
      (o) => o.status === "queued" || o.status === "processing",
    );
    if (!hasActiveItems) return;
    const interval = setInterval(() => {
      loadOpportunities();
    }, 3000);
    return () => clearInterval(interval);
  }, [opportunities]);

  useEffect(() => {
    if (!generating && !generatingAll) return;
    setGenerateSeconds(0);
    const timer = window.setInterval(
      () => setGenerateSeconds((s) => s + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [generating, generatingAll]);

  async function loadOpportunities(showLoading = false) {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/social-opportunities", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setOpportunities(data.opportunities || []);
      }
    } catch (err: any) {
      setMessage({ kind: "error", text: "Error al cargar propuestas: " + err.message });
    } finally {
      setLoading(false);
    }
  }

  async function loadConnectedNetworks() {
    setConnectionsLoading(true);
    try {
      const response = await fetch("/api/social-opportunities/generate", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const effectiveConnections = { threads: Boolean(data.threads), x: Boolean(data.x), linkedin: Boolean(data.linkedin), instagram: Boolean(data.instagram), facebookPage: Boolean(data.facebookPage), pinterest: Boolean(data.pinterest), tumblr: Boolean(data.tumblr), bluesky: Boolean(data.bluesky), blogger: Boolean(data.blogger), googleBusiness: Boolean(data.googleBusiness) };
        setConnectedNetworks(effectiveConnections);
        setActiveNetworks(data.activeNetworks ?? effectiveConnections);
        setDailyLimits(data.dailyLimits ?? {});
        setStoriesUnavailable({ instagram: Boolean(data.hideInstagramStories), facebook: Boolean(data.hideFacebookStories) });
      }
    } catch {
        const none = { threads: false, x: false, linkedin: false, instagram: false, facebookPage: false, pinterest: false, tumblr: false, bluesky: false, blogger: false, googleBusiness: false };
      setConnectedNetworks(none);
      setActiveNetworks(none);
      setStoriesUnavailable({ instagram: false, facebook: false });
    } finally {
      setConnectionsLoading(false);
    }
  }

  const stages = usedGsc ? gscStages : fallbackStages;
  const currentStage = Math.min(
    stages.length - 1,
    Math.floor(generateSeconds / 6),
  );
  const progress = Math.min(92, 8 + generateSeconds * 4);
  const elapsed = `${Math.floor(generateSeconds / 60)}:${String(generateSeconds % 60).padStart(2, "0")}`;

  async function handleGenerate(network: "threads" | "x" | "linkedin" | "instagram" | "facebook-page" | "pinterest" | "tumblr" | "bluesky" | "blogger" | "google-business") {
    setGenerating(true);
    setGeneratingNetwork(network);
    setMessage(null);
    setUsedGsc(false);
    try {
      const res = await fetch("/api/social-opportunities/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ networks: [network] }),
      });
      const data = await res.json();
      if (res.ok) {
        const gscUsed = data.message?.includes("Google Search Console") ?? false;
        setUsedGsc(gscUsed);
        setMessage({ kind: "success", text: data.message || "Propuestas generadas con éxito." });
        loadOpportunities();
      } else {
        setMessage({ kind: "error", text: data.error || "Error al generar propuestas." });
      }
    } catch (err: any) {
      setMessage({ kind: "error", text: err.message });
    } finally {
      setGenerating(false);
      setGeneratingNetwork(null);
    }
  }

  /** Crea propuestas para todas las redes conectadas del grupo abierto (una por red). */
  async function handleGenerateGroup() {
    if (!openGroup) return;
    const networks = NETWORK_ROWS.filter((row) => row.group === openGroup && row.key !== "x" && activeNetworks[row.key] && connectedNetworks[row.key]).map((row) => row.platform);
    if (networks.length === 0) {
      setMessage({ kind: "info", text: "Todavía no hay ninguna red conectada en este grupo. Usa «Configurar» en la red que quieras activar." });
      return;
    }
    setGeneratingAll(true);
    setMessage(null);
    try {
      const res = await fetch("/api/social-opportunities/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ networks }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ kind: "success", text: data.message || "Propuestas generadas con éxito." });
        loadOpportunities();
      } else {
        setMessage({ kind: "error", text: data.error || "Error al generar propuestas." });
      }
    } catch (err: any) {
      setMessage({ kind: "error", text: err.message });
    } finally {
      setGeneratingAll(false);
    }
  }

  function handleTextChange(id: string, newText: string) {
    setOpportunities((prev) =>
      prev.map((o) => (o.id === id ? { ...o, suggestedText: newText } : o)),
    );
  }

  async function handleSaveText(opp: SocialOpportunity) {
    try {
      const res = await fetch("/api/social-opportunities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: opp.id, suggestedText: opp.suggestedText }),
      });
      if (res.ok) {
        setMessage({ kind: "success", text: "Borrador guardado correctamente." });
      } else {
        setMessage({ kind: "error", text: "No se pudo guardar el borrador." });
      }
    } catch {
      setMessage({ kind: "error", text: "Error de conexión." });
    }
  }

  async function handlePublishOne(opp: SocialOpportunity) {
    setPublishingId(opp.id);
    setMessage(null);
    try {
      const res = await fetch("/api/social-opportunities/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: opp.id }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/dashboard/publicaciones-en-curso");
      } else {
        setMessage({ kind: "error", text: data.error || "Error al publicar." });
      }
    } catch (err: any) {
      setMessage({ kind: "error", text: err.message });
    } finally {
      setPublishingId(null);
    }
  }

  async function handlePublishAll() {
    const pendingOpps = opportunities.filter((o) => o.status === "pending" && (!openGroup || groupOfPlatform(o.platform) === openGroup));
    if (pendingOpps.length === 0) {
      setMessage({ kind: "info", text: "No hay publicaciones pendientes para procesar." });
      return;
    }

    setPublishingAll(true);
    setMessage({ kind: "info", text: `Publicando ${pendingOpps.length} propuestas en lote...` });

    let successCount = 0;
    let failCount = 0;

    for (const opp of pendingOpps) {
      try {
        const res = await fetch("/api/social-opportunities/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: opp.id }),
        });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setMessage({
      kind: failCount === 0 ? "success" : "info",
      text: `Publicación en lote completada: ${successCount} exitosas, ${failCount} fallidas.`,
    });
    router.push("/dashboard/publicaciones-en-curso");
    loadOpportunities();
    setPublishingAll(false);
  }

  async function handleSkipOne(opp: SocialOpportunity) {
    setSkipModal({ opp, reason: "", customReason: "" });
  }

  async function handleConfirmSkip() {
    if (!skipModal) return;
    const finalReason = skipModal.reason === "__custom__"
      ? skipModal.customReason.trim() || "Otro"
      : skipModal.reason;

    if (!finalReason) return;

    try {
      const res = await fetch("/api/social-opportunities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: skipModal.opp.id,
          skip: true,
          skipReason: finalReason,
        }),
      });

      if (res.ok) {
        setMessage({ kind: "info", text: "Propuesta descartada." });
        setSkipModal(null);
        loadOpportunities();
      } else {
        const data = await res.json();
        setMessage({ kind: "error", text: data.error || "Error al descartar." });
      }
    } catch {
      setMessage({ kind: "error", text: "Error de conexión al descartar." });
    }
  }

  const [deletingAll, setDeletingAll] = useState(false);

  async function handleDeleteAll() {
    const groupTitle = GROUP_CARDS.find((card) => card.id === openGroup)?.title;
    if (!window.confirm(`¿Borrar todas las publicaciones pendientes${groupTitle ? ` de ${groupTitle}` : ""}? Esta acción no se puede deshacer.`)) return;
    setDeletingAll(true);
    setMessage(null);
    try {
      const platforms = Array.from(new Set(opportunities.filter((o) => o.status === "pending" && (!openGroup || groupOfPlatform(o.platform) === openGroup)).map((o) => o.platform)));
      const res = await fetch(`/api/social-opportunities?scope=pending${openGroup ? `&platforms=${encodeURIComponent(platforms.join(","))}` : ""}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ kind: "info", text: "Se borraron todas las propuestas pendientes." });
        loadOpportunities();
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ kind: "error", text: data.error || "No se pudieron borrar las propuestas." });
      }
    } catch (err: any) {
      setMessage({ kind: "error", text: err.message });
    } finally {
      setDeletingAll(false);
    }
  }

  async function handlePreview(opp: SocialOpportunity) {
    setPreviewModal({ loading: true, imageUrl: null, imageBase64: null, platform: opp.platform, title: opp.articleTitle });
    try {
      const res = await fetch("/api/social-opportunities/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: opp.articleTitle, platform: opp.platform }),
      });
      const data = await res.json();
      setPreviewModal({
        loading: false,
        imageUrl: data.imageUrl || null,
        imageBase64: data.imageBase64 || null,
        platform: opp.platform,
        title: opp.articleTitle,
      });
    } catch {
      setPreviewModal({ loading: false, imageUrl: null, imageBase64: null, platform: opp.platform, title: opp.articleTitle });
    }
  }

  const pendingList = opportunities.filter((o) => o.status === "pending" && !(storiesUnavailable.instagram && o.platform === "instagram-story") && !(storiesUnavailable.facebook && o.platform === "facebook-story"));

  if (loading || connectionsLoading) return null;

  const groupPending = openGroup ? pendingList.filter((o) => groupOfPlatform(o.platform) === openGroup) : pendingList;
  const openCard = GROUP_CARDS.find((card) => card.id === openGroup);
  const groupRows = NETWORK_ROWS.filter((row) => row.group === openGroup && activeNetworks[row.key]);
  const groupConnectedCount = groupRows.filter((row) => connectedNetworks[row.key]).length;

  // Pantalla inicial: solo las tarjetas (mismo estándar que las de Inicio). El resto aparece al entrar.
  if (!openGroup) {
    return (
      <div className="oportunidades-redes-page" style={{ maxWidth: "none", margin: 0 }}>
        <div style={{ marginTop: 20, marginBottom: 20 }}>
          <h1 style={{ fontSize: 30, fontWeight: 600, color: "#1d1d1f", margin: "0 0 6px", letterSpacing: "-0.03em", lineHeight: 1.15 }}>{MENU_NAMES.redes}</h1>
          <p style={{ margin: "0 0 16px", fontSize: 15, color: "#6e6e73" }}>Elige dónde publicar.</p>
          <div className="inicio-actions-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, 320px)", gap: 16, justifyContent: "start" }}>
            {GROUP_CARDS.map((card, i) => {
              const rows = NETWORK_ROWS.filter((row) => row.group === card.id && activeNetworks[row.key]);
              if (rows.length === 0) return null;
              const connectedCount = rows.filter((row) => connectedNetworks[row.key]).length;
              const pendingCount = pendingList.filter((o) => groupOfPlatform(o.platform) === card.id).length;
              return (
                <button
                  key={card.id}
                  type="button"
                  className="inicio-action-card"
                  onClick={() => { setMessage(null); setOpenGroup(card.id); }}
                  style={{ display: "flex", width: 320, height: 320, boxSizing: "border-box", padding: 22, flexDirection: "column", justifyContent: "space-between", textAlign: "left", fontFamily: "inherit", cursor: "pointer", color: "#1d1d1f", background: "#ffffff", border: "1px solid #d2d2d7", borderRadius: 6 }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, lineHeight: 1.2, color: "#6e6e73", letterSpacing: "0.02em" }}>{String(i + 1).padStart(2, "0")}</p>
                    <p style={{ margin: "20px 0 0", fontSize: 18, fontWeight: 700, color: "#1d1d1f", lineHeight: 1.3, textTransform: "uppercase" }}>{card.title}</p>
                    <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: 1.5, color: "#6e6e73" }}>{card.hint}</p>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: "#6e6e73" }}>
                    {connectedCount} de {rows.length} conectadas{pendingCount > 0 ? ` · ${pendingCount} propuesta${pendingCount === 1 ? "" : "s"} pendiente${pendingCount === 1 ? "" : "s"}` : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const dayStart = startOfSocialDay().getTime();
  const publishedTodayFor = (rowKey: string, rowPlatform: string) =>
    opportunities.filter((o) => o.status === "published" && o.publishedAt && new Date(o.publishedAt).getTime() >= dayStart && o.platform.trim().toLowerCase() === limitFormatOf(rowKey, rowPlatform)).length;

  return (
    <div className="oportunidades-redes-page" style={{ maxWidth: "none", margin: 0, paddingBottom: 40 }}>
      {/* Cabecera */}
      <div style={{ padding: "8px 0 24px" }}>
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setOpenGroup(null);
          }}
          style={{ border: "none", background: "transparent", padding: 0, margin: "0 0 14px", fontSize: 14, color: "#0066cc", cursor: "pointer", fontFamily: "inherit" }}
        >
          ‹ Volver
        </button>
        <div className="rg-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 30, fontWeight: 600, color: "#1d1d1f", margin: 0, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
              {openCard?.title ?? MENU_NAMES.redes}
            </h1>
          </div>
          <button
            type="button"
            className="rg-create"
            onClick={handleGenerateGroup}
            disabled={generatingAll || generatingNetwork !== null || groupConnectedCount === 0}
            title={groupConnectedCount === 0 ? "Conecta una red para empezar" : undefined}
            style={disabledStyle(compactPrimary, generatingAll || generatingNetwork !== null || groupConnectedCount === 0)}
          >
            {generatingAll ? "Creando propuestas..." : "Crear propuestas"}
          </button>
        </div>
        <div style={{ marginTop: 14 }}>
        <MobileInstructions>
          <p style={{ margin: "0", fontSize: 15, lineHeight: 1.55, color: "#1d1d1f", textAlign: "justify" }}>
            Aquí configuras las redes que difunden de forma inteligente el contenido de tu página web: el sistema
            toma tus artículos, prepara la publicación para cada red y publica{" "}
            <strong>{describeDailyLimits(groupRows, dailyLimits)}</strong>.
          </p>
          {groupConnectedCount === 0 ? (
            <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.55, color: "#1d1d1f", textAlign: "justify" }}>
              Aún no hay ninguna red conectada aquí. Pulsa <strong>Conectar</strong> en la que quieras activar y,
              al terminar, volverás a esta pantalla.
            </p>
          ) : (
            <>
              <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.55, color: "#1d1d1f", textAlign: "justify" }}>
                Pulsa <strong>Crear propuesta</strong> en una red conectada, revisa la propuesta y decide si sale.
              </p>
              {groupConnectedCount < groupRows.length && (
                <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.55, color: "#6e6e73", textAlign: "justify" }}>
                  Las redes sin conectar aún no están activas: pulsa <strong>Conectar</strong> para activarlas.
                </p>
              )}
            </>
          )}
        </MobileInstructions>
        </div>
      </div>

      {/* Redes del grupo */}
      <div className="rn-grid" style={{ marginBottom: 28 }}>
        {groupRows.map((row) => {
          const connected = connectedNetworks[row.key];
          const limit = dailyLimits[row.key] ?? 1;
          const used = publishedTodayFor(row.key, row.platform);
          const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;
          const busy = Boolean(generatingNetwork);
          return (
            <div key={row.key} className="rn-card" style={{ background: connected ? "#ffffff" : "#fafafa" }}>
              <div className="rn-main">
                <span className="rn-name" style={{ color: connected ? "#1d1d1f" : "#86868b" }}>{row.label}</span>
                <span className="rn-status" style={{ color: connected ? "#16803c" : "#86868b" }}>
                  <span aria-hidden="true" className="rn-dot" style={{ background: connected ? "#16803c" : "#c7c7cc" }} />
                  {connected ? "Conectada" : "Sin conectar"}
                </span>
              </div>
              <div className="rn-quota">
                <div className="rn-quota-text">
                  <span className="rn-quota-label">Hoy</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{used} de {limit}</span>
                </div>
                <div className="rn-bar"><div style={{ width: `${percent}%`, height: "100%", background: connected ? "#1d1d1f" : "#c7c7cc" }} /></div>
              </div>
              <div className="rn-action">
                {connected ? (
                  <button type="button" disabled={busy} onClick={() => handleGenerate(row.platform)} style={disabledStyle({ ...compactSecondary }, busy)}>
                    {generatingNetwork === row.platform ? "Analizando..." : "Crear propuesta"}
                  </button>
                ) : row.conexionId ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      try { sessionStorage.setItem("volverA", "/dashboard/oportunidades-redes"); } catch {}
                      router.push(`/dashboard/configuracion/conexiones?vista=difusion&conexion=${row.conexionId}`);
                    }}
                    style={disabledStyle({ ...compactSecondary, color: "#0066cc" }, busy)}
                  >
                    Conectar
                  </button>
                ) : (
                  <span style={{ fontSize: 13, color: "#86868b" }}>No disponible</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(generating || generatingAll) && (
        <div
          role="status"
          aria-live="polite"
          style={{ marginTop: 16, marginBottom: 16, padding: 16, border: "1px solid #b8caf7", borderRadius: 10, background: "#f3f6ff" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 10 }}>
            <strong style={{ fontSize: 14, color: "#24458f" }}>{stages[currentStage]}</strong>
            <span style={{ minWidth: 52, textAlign: "center", padding: "4px 8px", borderRadius: 999, background: "#dfe8ff", color: "#24458f", fontSize: 12, fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
              {elapsed}
            </span>
          </div>
          <div aria-hidden="true" style={{ height: 8, borderRadius: 999, background: "#dfe5f2", overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #2f5fdb, #4dd8e8)", transition: "width 1s linear" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, marginTop: 12 }}>
            {stages.map((stage, index) => (
              <div key={stage} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: index < currentStage ? "#15803d" : index === currentStage ? "#24458f" : "#8a97ab", fontWeight: index === currentStage ? 600 : 400 }}>
                <span aria-hidden="true">{index < currentStage ? "✓" : index === currentStage ? "●" : "○"}</span>
                <span>{stage}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "#6e6e73" }}>
            El tiempo depende de la cantidad de datos. No cierres esta página mientras termina el análisis.
          </p>
        </div>
      )}

      {message && (
        <div style={{ padding: "0 0 16px", fontSize: 13, fontWeight: 500, color: message.kind === "success" ? "#16803c" : message.kind === "error" ? "#ff3b30" : "#6e6e73" }}>
          {message.text}
        </div>
      )}

      {/* Propuestas */}
      {loading ? (
        <div className="muted" style={{ textAlign: "center", padding: 40 }}>Cargando propuestas...</div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 4 }}>
            <h2 style={{ ...h2Style, margin: 0, fontSize: 18 }}>
              Propuestas <span style={{ color: "#6e6e73", fontWeight: 500 }}>({groupPending.length})</span>
            </h2>
            {groupPending.length > 0 && (
              <div className="rp-batch" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button type="button" onClick={handleDeleteAll} disabled={deletingAll || publishingAll} style={disabledStyle(compactDanger, deletingAll || publishingAll)}>
                  {deletingAll ? "Borrando..." : "Borrar todas"}
                </button>
                <button type="button" onClick={handlePublishAll} disabled={publishingAll || deletingAll} style={disabledStyle(compactPrimary, publishingAll || deletingAll)}>
                  {publishingAll ? "Publicando..." : "Publicar todas"}
                </button>
              </div>
            )}
          </div>

          {groupPending.length === 0 ? (
            <div style={{ borderTop: "1px solid #e5e5ea", padding: "28px 0", color: "#6e6e73", fontSize: 14 }}>
              Aún no hay propuestas. Pulsa <strong style={{ color: "#1d1d1f" }}>Crear propuestas</strong> y el sistema las prepara a partir de tus artículos.
              <div style={{ marginTop: 12 }}>
                <button type="button" onClick={() => router.push("/dashboard/publicaciones-en-curso")} style={compactSecondary}>
                  Ver progreso de las publicaciones
                </button>
              </div>
            </div>
          ) : (
            <div>
              {groupPending.map((opp) => {
                const editing = editingId === opp.id;
                const canPreview = opp.platform.startsWith("instagram") || opp.platform === "threads" || opp.platform === "linkedin";
                return (
                  <div key={opp.id} className="rp-item" style={{ borderTop: "1px solid #e5e5ea", padding: "18px 0", display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: "1 1 340px", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#1d1d1f", background: "#f5f5f7", borderRadius: 999, padding: "3px 10px" }}>
                          {platformLabel(opp.platform)}
                        </span>
                        <a href={opp.articleUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#0066cc", textDecoration: "none" }}>Ver artículo ↗</a>
                      </div>
                      <h4 style={{ color: "#1d1d1f", margin: "0 0 6px", fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>{opp.articleTitle}</h4>
                      {editing ? (
                        <textarea
                          value={opp.suggestedText}
                          onChange={(e) => handleTextChange(opp.id, e.target.value)}
                          style={{ width: "100%", minHeight: 110, padding: 10, borderRadius: 8, background: "#ffffff", color: "#1d1d1f", border: "1px solid #d2d2d7", fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                        />
                      ) : (
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#424245", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "pre-line" }}>
                          {opp.suggestedText}
                        </p>
                      )}
                    </div>
                    <div className="rp-actions" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <button type="button" className="rp-publish" onClick={() => handlePublishOne(opp)} disabled={publishingId === opp.id} style={disabledStyle(compactPrimary, publishingId === opp.id)}>
                        {publishingId === opp.id ? "Publicando..." : "Publicar"}
                      </button>
                      {editing ? (
                        <button type="button" onClick={async () => { await handleSaveText(opp); setEditingId(null); }} style={compactSecondary}>Guardar</button>
                      ) : (
                        <button type="button" onClick={() => setEditingId(opp.id)} style={compactSecondary}>Editar</button>
                      )}
                      {canPreview && <button type="button" onClick={() => handlePreview(opp)} style={compactSecondary}>Vista previa</button>}
                      <button type="button" onClick={() => handleSkipOne(opp)} style={compactDanger}>Descartar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Descarte */}
      {skipModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setSkipModal(null)}
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.96)",
              borderRadius: 22,
              padding: 24,
              maxWidth: 440,
              width: "100%",
              boxShadow: "0 24px 80px rgba(0, 0, 0, 0.15)",
              border: "1px solid rgba(0, 0, 0, 0.08)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="eyebrow" style={{ margin: "0 0 4px" }}>Descartar</p>
            <h3 style={{ color: "#1d1d1f", margin: "0 0 6px 0", fontSize: 18, fontWeight: 600 }}>
              ¿Por qué descartas esta propuesta?
            </h3>
            <p className="lead-copy" style={{ fontSize: 13, margin: "0 0 16px 0" }}>
              Tu respuesta nos ayuda a optimizar futuras recomendaciones.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SKIP_REASONS.map((reason) => (
                <label
                  key={reason}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: skipModal.reason === reason ? "#f5f5f7" : "#ffffff",
                    border: `1px solid ${skipModal.reason === reason ? "#1d1d1f" : "#e5e5ea"}`,
                    cursor: "pointer",
                    color: "#1d1d1f",
                    fontSize: 13,
                  }}
                >
                  <input
                    type="radio"
                    name="skipReason"
                    value={reason}
                    checked={skipModal.reason === reason}
                    onChange={() => setSkipModal({ ...skipModal, reason })}
                  />
                  {reason}
                </label>
              ))}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
              <button
                onClick={() => setSkipModal(null)}
                className="secondary"
                style={{ ...secondaryButtonStyle, ...uniformButtonSize }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSkip}
                disabled={!skipModal.reason}
                style={{
                  ...buttonStyle,
                  ...uniformButtonSize,
                  background: "#ff3b30",
                  marginTop: 0,
                }}
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Preview */}
      {previewModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setPreviewModal(null)}
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.96)",
              borderRadius: 22,
              padding: 24,
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 24px 80px rgba(0, 0, 0, 0.15)",
              border: "1px solid rgba(0, 0, 0, 0.08)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="eyebrow" style={{ margin: "0 0 4px" }}>Vista Previa</p>
            <h3 style={{ color: "#1d1d1f", margin: "0 0 12px 0", fontSize: 18, fontWeight: 600 }}>
              {previewModal.title}
            </h3>

            <div style={{ background: "#f5f5f7", borderRadius: 12, overflow: "hidden", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {previewModal.loading ? (
                <div className="muted" style={{ textAlign: "center", padding: 30, fontSize: 13 }}>
                  Generando preview...
                </div>
              ) : previewModal.imageUrl || previewModal.imageBase64 ? (
                <img
                  src={previewModal.imageBase64 ? `data:image/png;base64,${previewModal.imageBase64}` : previewModal.imageUrl!}
                  alt="Preview"
                  style={{ width: "100%", maxHeight: 380, objectFit: "contain" }}
                />
              ) : (
                <div style={{ color: "#ff3b30", textAlign: "center", padding: 30, fontSize: 13 }}>
                  No se pudo generar el preview
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button
                onClick={() => setPreviewModal(null)}
                className="secondary"
                style={{ ...secondaryButtonStyle, ...uniformButtonSize }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
