"use client";

import { MENU_LABELS_NUMBERED, MENU_NAMES, PRODUCT_NAMES } from "@/lib/menu-names";
import { HUB_URL, isProductViewEnabled, isVisibleInProduct, productOfHost, productOfPath, type HostProductScope } from "@/lib/product-routes";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import LogoutButton from "@/components/LogoutButton";
import type { ProductsInfo } from "@/lib/product-page-gate";

interface TabItem {
  id?: string;
  href: string;
  label: string;
}

interface TabGroup {
  /** Identificador del grupo, no de un módulo: no se oculta por permisos. */
  group: string;
  label: string;
  items: TabItem[];
}

type NavEntry = TabItem | TabGroup;

function isGroup(entry: NavEntry): entry is TabGroup {
  return "group" in entry;
}

/** Ruta de un enlace sin su query (los enlaces de producto llevan `?producto=`). */
function hrefPath(href: string): string {
  return href.split("?")[0];
}

// Orden del menú definido por Milton (18/8/2026). Todo lo que tiene que ver
// con publicar e historial vive dentro de PUBLICACIONES para que la barra
// principal quede corta. Actualizaciones vive dentro de CONFIGURACIÓN.
const BASE_ENTRIES: NavEntry[] = [
  { href: "/dashboard", label: "Inicio" },
  {
    group: "publicaciones",
    label: "Publicaciones",
    items: [
      { id: "publicar", href: "/dashboard/publicar", label: MENU_LABELS_NUMBERED.propios },
      { id: "oportunidades", href: "/dashboard/oportunidades", label: MENU_LABELS_NUMBERED.ia },
      {
        id: "oportunidades-redes",
        href: "/dashboard/oportunidades-redes",
        label: MENU_LABELS_NUMBERED.redes,
      },
      {
        id: "publicaciones-en-curso",
        href: "/dashboard/publicaciones-en-curso",
        label: "Progreso de las publicaciones",
      },
      { id: "historial", href: "/dashboard/historial", label: "Historial" },
      { id: "estadisticas", href: "/dashboard/estadisticas", label: "Estadísticas" },
    ],
  },
  {
    group: "configuracion",
    label: "Configuración",
    items: [
      { id: "configuracion", href: "/dashboard/configuracion", label: "Configuración general" },
      { id: "como-funciona", href: "/dashboard/como-funciona", label: "Cómo funciona esta aplicación" },
      { id: "actualizaciones", href: "/dashboard/actualizaciones", label: "Actualizaciones" },
    ],
  },
];

const HUB_ENTRY: TabItem = { href: HUB_URL, label: "Volver al HUB" };

// VISTA POR PRODUCTOS (proyecto «SEPARACION DE SEO TOTAL», Lote 2). Cuando la
// cuenta tiene activo el módulo opt-in «vista-productos» (hoy: administradores
// como vista previa), el grupo único «Publicaciones» se reemplaza por UN GRUPO
// POR PRODUCTO. Ninguna ruta cambia: son las mismas pantallas, agrupadas de
// otra forma. Historial y Progreso aparecen en ambos porque hoy mezclan los
// dos productos en la misma página (se filtrarán por producto más adelante).
// La entrada de Redes se muestra siempre (pedido de Milton, 1/10/2026): el
// derecho al producto y las autorizaciones de publicación se comprueban por
// separado; la pantalla puede abrirse aunque aún no haya redes configuradas.
// CONTRATO con Historial y Progreso: los enlaces llevan `?producto=articulos|redes`
// para que esas pantallas muestren solo su mitad. Mientras no lo implementen, lo
// ignoran y siguen mostrando todo, como hoy (ver CONTROL, C-016, punto 4b).
const PRODUCT_ENTRIES: NavEntry[] = [
  { href: "/dashboard", label: "Inicio" },
  {
    group: "articulos",
    label: PRODUCT_NAMES.ARTICULOS,
    items: [
      { href: "/dashboard/articulos", label: "Inicio de Artículos" },
      { id: "publicar", href: "/dashboard/publicar", label: MENU_NAMES.propios },
      { id: "oportunidades", href: "/dashboard/oportunidades", label: MENU_NAMES.ia },
      { id: "publicaciones-en-curso", href: "/dashboard/publicaciones-en-curso?producto=articulos", label: "Progreso de las publicaciones" },
      { id: "historial", href: "/dashboard/historial?producto=articulos", label: "Historial" },
      { id: "estadisticas", href: "/dashboard/estadisticas", label: "Estadísticas" },
    ],
  },
  {
    group: "redes",
    label: PRODUCT_NAMES.REDES,
    items: [
      { href: "/dashboard/redes", label: "Inicio de Redes" },
      { id: "oportunidades-redes", href: "/dashboard/oportunidades-redes", label: MENU_NAMES.redes },
      { id: "publicaciones-en-curso", href: "/dashboard/publicaciones-en-curso?producto=redes", label: "Progreso de las publicaciones" },
      { id: "historial", href: "/dashboard/historial?producto=redes", label: "Historial" },
    ],
  },
  // Configuración con «Mi acceso» (qué productos tiene la cuenta, solo lectura).
  {
    ...(BASE_ENTRIES[2] as TabGroup),
    items: [...(BASE_ENTRIES[2] as TabGroup).items, { href: "/dashboard/mi-acceso", label: "Mi acceso" }],
  },
];

// Administración pasó de ser un solo enlace a un grupo para alojar módulos de
// plataforma como Composio sin tocar la página de usuarios.
const ADMIN_GROUP: TabGroup = {
  group: "administracion",
  label: "Admin Artículos",
  items: [
    { href: "/dashboard/usuarios", label: "Usuarios" },
    { href: "/dashboard/composio", label: "Composio" },
    { href: "/dashboard/postpeer", label: "PostPeer" },
  ],
};

export default function DashboardNav({ showHubNavigation = false, initialIsAdmin = false }: { showHubNavigation?: boolean; initialIsAdmin?: boolean }) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const [globalDisabledModules, setGlobalDisabledModules] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductsInfo | null>(null);
  const [hostProduct, setHostProduct] = useState<HostProductScope>("COMPARTIDO");
  // Vista por productos: empieza APAGADA hasta que /api/me confirme que está activa.
  const [productView, setProductView] = useState(false);
  // Último producto visitado: decide qué grupo se resalta en las pantallas
  // compartidas (Historial, Progreso), que existen en los dos.
  const [lastProduct, setLastProduct] = useState<"articulos" | "redes" | null>(null);
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const groupRef = useRef<HTMLDivElement | null>(null);

  // El menú se oculta mientras la cuenta está en el asistente de
  // configuración inicial (pedido de Milton, 16/9/2026): esa pantalla debe
  // verse sola, sin navegación a secciones que todavía están bloqueadas.
  // Solo aplica en /dashboard, que es donde vive el asistente.
  const [hideForSetup, setHideForSetup] = useState(false);
  useEffect(() => {
    setHostProduct(productOfHost(window.location.hostname));
  }, []);

  useEffect(() => {
    if (pathname !== "/dashboard") {
      setHideForSetup(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      fetch("/api/credentials", { cache: "no-store" }),
      fetch("/api/categories", { cache: "no-store" }),
      fetch("/api/me", { cache: "no-store" }),
      fetch("/api/search-integrations/google", { cache: "no-store" }),
    ])
      .then(async ([credRes, catRes, meRes, googleRes]) => {
        const credData = credRes.ok ? await credRes.json() : {};
        const catData = catRes.ok ? await catRes.json() : {};
        const meData = meRes.ok ? await meRes.json() : {};
        const googleData = googleRes.ok ? await googleRes.json() : {};
        const step1 = Boolean(credData.configured);
        const step2 = Array.isArray(catData.categories) && catData.categories.length > 0;
        const step3 =
          typeof meData.contentLanguage === "string" && meData.contentLanguage.trim().length > 0;
        const step4 = Boolean(googleData.connected && googleData.siteUrl);
        if (!cancelled) {
          // Los administradores necesitan conservar el menú para supervisar y
          // configurar el sistema aunque su propia cuenta esté incompleta.
          setIsAdmin(initialIsAdmin || meData?.role === "admin" || Boolean(meData?.isActingAdmin));
          const localDemo = process.env.NEXT_PUBLIC_LOCAL_DEMO === "true";
          const isRedesHost = productOfHost(window.location.hostname) === "REDES";
          setHideForSetup(!isRedesHost && !localDemo && !(step1 && step2 && step3 && step4));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAdmin(initialIsAdmin);
          setHideForSetup(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    fetch(`/api/me?_t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setIsAdmin(initialIsAdmin || data?.role === "admin" || Boolean(data?.isActingAdmin));
        setProductView(isProductViewEnabled(data?.disabledModules));
        setProducts(data?.products ?? null);
        if (Array.isArray(data?.disabledModules)) {
          setDisabledModules(data.disabledModules);
        }
        if (Array.isArray(data?.globalDisabledModules)) {
          setGlobalDisabledModules(data.globalDisabledModules);
        }
      })
      .catch(() => {
        setIsAdmin(initialIsAdmin);
        setDisabledModules([]);
        setGlobalDisabledModules([]);
        setProducts(null);
        setProductView(false);
      });
  }, []);

  // Recuerda el último producto visitado (solo en esta pestaña). Si el
  // navegador no deja usar sessionStorage, simplemente no se recuerda.
  useEffect(() => {
    try {
      const scope = productOfPath(pathname);
      if (scope === "ARTICULOS") window.sessionStorage.setItem("seototal_producto", "articulos");
      else if (scope === "REDES") window.sessionStorage.setItem("seototal_producto", "redes");
      const saved = window.sessionStorage.getItem("seototal_producto");
      setLastProduct(saved === "articulos" || saved === "redes" ? saved : null);
    } catch {
      setLastProduct(null);
    }
  }, [pathname, initialIsAdmin]);

  useEffect(() => {
    setOpen(false);
    setOpenGroup(null);
  }, [pathname]);

  // Cerrar el desplegable al pulsar fuera o con Escape, como cualquier menú
  // del sistema.
  useEffect(() => {
    if (!openGroup) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (groupRef.current && !groupRef.current.contains(event.target as Node)) {
        setOpenGroup(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenGroup(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openGroup]);

  function isVisible(tab: TabItem): boolean {
    // La administración es transversal al producto alojado. En un host de
    // Artículos/Redes no debe desaparecer por el filtro de pantallas de
    // producto; solo se controla por la identidad administrativa.
    if (isAdmin && productOfPath(hrefPath(tab.href)) === "ADMIN") return true;
    if (hostProduct !== "COMPARTIDO" && !isVisibleInProduct(productOfPath(hrefPath(tab.href)), hostProduct)) return false;
    if (isAdmin) return true;
    if (tab.id && disabledModules.includes(tab.id)) return false;
    if (!products) return true;
    const scope = productOfPath(hrefPath(tab.href));
    if (scope === "ARTICULOS") return products.articulos?.allowed !== false;
    if (scope === "REDES") {
      return products.redes?.allowed !== false || products.redes?.reason === "NO_NETWORK_APPROVED";
    }
    return true;
  }

  function displayLabel(tab: TabItem): string {
    if (
      tab.id === "oportunidades-redes" &&
      (hostProduct === "REDES" || products?.articulos?.allowed === false) &&
      (products?.redes?.allowed !== false || products?.redes?.reason === "NO_NETWORK_APPROVED")
    ) {
      return tab.label.replace(/^3\)/, "1)");
    }
    return tab.label;
  }

  const baseEntries = productView ? PRODUCT_ENTRIES : BASE_ENTRIES;
  const rawEntries: NavEntry[] = [
    ...baseEntries,
    ...(isAdmin ? [ADMIN_GROUP] : []),
    ...(!showHubNavigation ? [HUB_ENTRY] : []),
  ];

  // Un grupo cuyos módulos están todos ocultos desaparece entero, en vez de
  // quedar como un desplegable vacío.
  const entries = rawEntries
    .map((entry) => {
      if (!isGroup(entry)) return entry;
      const items = entry.items.filter(isVisible);
      return items.length ? { ...entry, items } : null;
    })
    .filter((entry): entry is NavEntry => entry !== null)
    .filter((entry) => (isGroup(entry) ? true : isVisible(entry)));

  // En la vista por productos, una pantalla propia de un producto resalta SU
  // grupo; una compartida (Historial, Progreso) resalta el último producto
  // visitado en vez de quedarse siempre con el primero.
  const pathProduct = productOfPath(pathname);
  const preferredGroup = !productView
    ? null
    : pathProduct === "ARTICULOS"
      ? "articulos"
      : pathProduct === "REDES"
        ? "redes"
        : lastProduct;
  const activeGroup =
    (preferredGroup
      ? entries.find(
          (entry) =>
            isGroup(entry) && entry.group === preferredGroup && entry.items.some((item) => hrefPath(item.href) === pathname),
        )
      : undefined) ??
    entries.find((entry) => isGroup(entry) && entry.items.some((item) => hrefPath(item.href) === pathname));

  function hiddenGlobally(tab: TabItem): boolean {
    return isAdmin && Boolean(tab.id && globalDisabledModules.includes(tab.id));
  }

  const linkStyle = (active: boolean): CSSProperties => ({
    padding: "8px 10px",
    fontSize: 11,
    fontWeight: 650,
    textDecoration: "none",
    color: active ? "#1d1d1f" : "#526579",
    background: active ? "#dceafb" : "transparent",
    borderRadius: 9,
    boxShadow: "none",
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: "background 0.15s ease, color 0.15s ease",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
  });

  const hiddenBadge = (small: boolean) => (
    <span
      style={{
        fontSize: small ? 9 : 10,
        fontWeight: 700,
        padding: small ? "1px 6px" : "2px 8px",
        borderRadius: 9999,
        background: "rgba(255, 149, 0, 0.12)",
        color: "#ff9500",
        border: "1px solid rgba(255, 149, 0, 0.25)",
      }}
    >
      Oculto
    </span>
  );

  // El wizard oculta la navegación a usuarios normales; los administradores
  // siempre conservan el menú inicial para poder administrar la plataforma.
  if (hideForSetup && !isAdmin) return null;

  const appName = hostProduct === "REDES" ? "SEO Total Redes" : "SEO Total Artículos";
  const appContext = hostProduct === "REDES" ? "Difusión social" : "Artículos con IA";

  return (
    <nav
      className="dashboard-nav app-subbar"
      aria-label="Navegación de la aplicación"
      style={{ position: "relative", margin: 0 }}
    >
      <style>{`
        .dashboard-nav.app-subbar {
          min-height: 52px;
          border-bottom: 1px solid #d8e4f2 !important;
          background: #eef5ff !important;
        }
        .dashboard-nav .app-subbar-inner {
          width: min(100% - 40px, 1160px);
          min-height: 52px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 12px;
          box-sizing: border-box;
        }
        .dashboard-nav .app-identity {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex-shrink: 0;
        }
        .dashboard-nav .app-brand {
          color: #1d1d1f;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: -0.02em;
          text-decoration: none;
          white-space: nowrap;
        }
        .dashboard-nav .app-context {
          padding-left: 12px;
          border-left: 1px solid #b9cde3;
          color: #60758e;
          font-size: 11px;
          white-space: nowrap;
        }
        .dashboard-nav .nav-desktop-row {
          flex: 1 1 auto;
          justify-content: flex-end;
          min-width: 0;
          margin: 0;
          padding: 0;
          border: 0;
          background: transparent;
        }
        .dashboard-nav .nav-link,
        .dashboard-nav .nav-group-button {
          padding: 8px 10px !important;
          color: #526579 !important;
          font-size: 11px !important;
          font-weight: 650 !important;
          border-radius: 9px !important;
        }
        .dashboard-nav .nav-link:hover,
        .dashboard-nav .nav-group-button:hover {
          background: #dceafb !important;
          color: #1d1d1f !important;
        }
        .dashboard-nav .nav-link[aria-current="page"],
        .dashboard-nav .nav-group-button[aria-expanded="true"] {
          background: #dceafb !important;
          color: #1d1d1f !important;
        }
        .dashboard-nav .nav-admin-button {
          border: 1px solid #d1d5db !important;
          background: #ffffff !important;
          color: #6e6e73 !important;
          font-size: 12px !important;
          font-weight: 600 !important;
        }
        .dashboard-nav .nav-admin-button:hover,
        .dashboard-nav .nav-admin-button[aria-expanded="true"] {
          border-color: #d1d5db !important;
          background: #f2f2f4 !important;
          color: #1d1d1f !important;
        }
        .dashboard-nav .nav-dropdown {
          border-radius: 10px !important;
          border-color: #e5e7eb !important;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.12) !important;
        }
        .dashboard-nav .nav-dropdown-link {
          border-radius: 8px !important;
        }
        .dashboard-nav .nav-mobile-toggle {
          border-radius: 9px !important;
        }
        @media (min-width: 1180px) {
          .nav-mobile-toggle { display: none !important; }
          .nav-mobile-menu { display: none !important; }
          .nav-desktop-row { display: flex !important; }
        }
        @media (max-width: 420px) {
          .nav-mobile-toggle { padding: 11px 12px !important; }
          .nav-mobile-menu { border-radius: 12px !important; }
        }
        @media (max-width: 1179px) {
          .dashboard-nav .app-subbar-inner { flex-wrap: wrap; padding: 10px 0; }
          .dashboard-nav .app-identity { flex: 1 1 auto; }
          .nav-mobile-toggle { width: 48px !important; margin-left: auto; }
          .nav-mobile-menu { left: auto !important; right: 0 !important; width: min(320px, calc(100vw - 32px)); }
        }
        @media (max-width: 420px) {
          .dashboard-nav .app-subbar-inner { width: min(100% - 28px, 620px); }
          .dashboard-nav .app-context { display: none; }
        }
      `}</style>

      <div className="app-subbar-inner">
        <div className="app-identity">
          <Link className="app-brand" href="/dashboard">{appName}</Link>
          <span className="app-context">{appContext}</span>
        </div>

        <button
        type="button"
        className="nav-mobile-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          fontSize: 14,
          fontWeight: 600,
          color: "#1d1d1f",
          background: "#ffffff",
          border: "1px solid rgba(0, 0, 0, 0.08)",
          borderRadius: 12,
          cursor: "pointer",
          boxShadow: "none",
          transition: "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
          fontFamily: "inherit",
        }}
        >
        <span
          style={{ fontSize: 22, lineHeight: 1, opacity: 0.75, flexShrink: 0 }}
          aria-hidden="true"
        >
          {open ? "×" : "☰"}
        </span>
        </button>

      {open && (
        <div
          className="nav-mobile-menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 30,
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(0, 0, 0, 0.08)",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.12)",
            padding: 4,
            maxHeight: "min(70svh, 520px)",
            overflowY: "auto",
          }}
        >
          {entries.map((entry) => {
            // En móvil el grupo no se despliega: se muestra como encabezado con
            // sus opciones debajo. Un desplegable dentro de otro desplegable es
            // incómodo en un teléfono.
            if (isGroup(entry)) {
              return (
                <div key={entry.group}>
                  <p
                    style={{
                      margin: "10px 14px 4px",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#86868b",
                    }}
                  >
                    {entry.label}
                  </p>
                  {entry.items.map((tab) => (
                    <MobileLink
                      key={tab.href}
                      tab={tab}
                      label={displayLabel(tab)}
                      active={pathname === hrefPath(tab.href)}
                      hidden={hiddenGlobally(tab)}
                      onNavigate={() => setOpen(false)}
                      indented
                      separatorAfter={tab.id === "oportunidades-redes"}
                    />
                  ))}
                </div>
              );
            }
            return (
              <MobileLink
                key={entry.href}
                tab={entry}
                label={displayLabel(entry)}
                active={pathname === hrefPath(entry.href)}
                hidden={hiddenGlobally(entry)}
                onNavigate={() => setOpen(false)}
              />
            );
          })}
          <div className="mobile-menu-logout" style={{ marginTop: 8, padding: "8px 10px", borderTop: "1px solid rgba(0, 0, 0, 0.08)" }}>
            <LogoutButton />
          </div>
        </div>
      )}

      <div
        className="nav-desktop-row app-nav"
        style={{
          display: "none",
          gap: 3,
          background: "transparent",
          border: "none",
          borderRadius: 0,
          padding: 0,
          flexWrap: "wrap",
          alignItems: "center",
          // Sin `overflow` aquí: por regla de CSS, poner overflow-x en hidden
          // convierte el eje vertical en auto, y eso recortaba el desplegable
          // de Publicaciones, que cae por debajo de la barra. La fila envuelve
          // con flexWrap, así que no necesita recorte horizontal.
        }}
      >
        {entries.map((entry) => {
          if (isGroup(entry)) {
            const groupActive = entry === activeGroup;
            const expanded = openGroup === entry.group;
            return (
              <div
                key={entry.group}
                ref={expanded ? groupRef : undefined}
                style={{ position: "relative" }}
              >
                <button
                  type="button"
                  className={`nav-group-button ${entry.group === "administracion" ? "nav-admin-button" : ""}`}
                  onClick={() => setOpenGroup((prev) => (prev === entry.group ? null : entry.group))}
                  aria-expanded={expanded}
                  aria-haspopup="menu"
                  style={{
                    ...linkStyle(groupActive || expanded),
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{entry.label}</span>
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: 9,
                      opacity: 0.55,
                      transform: expanded ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    ▼
                  </span>
                </button>

                {expanded && (
                  <div
                    role="menu"
                    className="nav-dropdown"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      ...(entry.group === "administracion" ? { right: 0 } : { left: 0 }),
                      zIndex: 40,
                      minWidth: 196,
                      background: "rgba(255, 255, 255, 0.98)",
                      backdropFilter: "blur(24px) saturate(180%)",
                      WebkitBackdropFilter: "blur(24px) saturate(180%)",
                      border: "1px solid #d8e4f2",
                      borderRadius: 10,
                      boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
                      padding: 4,
                    }}
                  >
                    {entry.items.map((tab) => {
                      const active = pathname === hrefPath(tab.href);
                      return (
                        <Link
                          key={tab.href}
                          href={tab.href}
                          role="menuitem"
                          className="nav-dropdown-link"
                          onClick={() => setOpenGroup(null)}
                          title={
                            hiddenGlobally(tab)
                              ? "Módulo en mantenimiento / oculto globalmente para usuarios"
                              : undefined
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            padding: "8px 10px",
                            fontSize: 12,
                            fontWeight: active ? 650 : 600,
                            textDecoration: "none",
                            color: "#1d1d1f",
                            background: active ? "#f2f2f4" : "transparent",
                            borderRadius: 9,
                            whiteSpace: "nowrap",
                            borderBottom: tab.id === "oportunidades-redes" ? "1px solid #d2d2d7" : undefined,
                            marginBottom: tab.id === "oportunidades-redes" ? 6 : undefined,
                          }}
                        >
                          <span>{displayLabel(tab)}</span>
                          {hiddenGlobally(tab) && hiddenBadge(true)}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = pathname === hrefPath(entry.href);
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className="nav-link"
              title={
                hiddenGlobally(entry)
                  ? "Módulo en mantenimiento / oculto globalmente para usuarios"
                  : undefined
              }
              style={{
                ...linkStyle(active),
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>{entry.label}</span>
              {hiddenGlobally(entry) && hiddenBadge(true)}
            </Link>
          );
        })}
      </div>
      </div>
    </nav>
  );
}

function MobileLink({
  tab,
  label,
  active,
  hidden,
  onNavigate,
  indented = false,
  separatorAfter = false,
}: {
  tab: TabItem;
  label: string;
  active: boolean;
  hidden: boolean;
  onNavigate: () => void;
  indented?: boolean;
  separatorAfter?: boolean;
}) {
  return (
    <Link
      href={tab.href}
      onClick={onNavigate}
      title={hidden ? "Módulo en mantenimiento / oculto globalmente para usuarios" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: indented ? "11px 14px 11px 26px" : "12px 14px",
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        textDecoration: "none",
        color: "#1d1d1f",
        background: active ? "rgba(0, 0, 0, 0.05)" : "transparent",
        borderRadius: 10,
        transition: "all 0.15s ease",
        borderBottom: separatorAfter ? "1px solid #d2d2d7" : undefined,
        marginBottom: separatorAfter ? 6 : undefined,
      }}
    >
      <span>{label}</span>
      {hidden && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 9999,
            background: "rgba(255, 149, 0, 0.12)",
            color: "#ff9500",
            border: "1px solid rgba(255, 149, 0, 0.25)",
          }}
        >
          Oculto
        </span>
      )}
    </Link>
  );
}
