"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ModuleIntro, { IntroP } from "@/components/ModuleIntro";
import { isProductViewEnabled } from "@/lib/product-routes";

/*
 * INICIO DE UN PRODUCTO (proyecto «SEPARACION DE SEO TOTAL», Lote 2): la
 * portada de SEO Total Artículos o de SEO Total Redes. Es un índice de las
 * pantallas del producto, con el mismo estilo que el índice de Configuración.
 *
 * Solo se muestra si la cuenta tiene activo el módulo opt-in «vista-productos»
 * (hoy, administradores como vista previa). Si no, avisa y devuelve al Inicio:
 * así nadie llega a una pantalla nueva por escribir la dirección.
 *
 * Cada entrada respeta los módulos que Administración haya ocultado para la
 * cuenta (`disabledModules`); los administradores lo ven todo.
 */

export interface ProductHomeItem {
  /** Id del módulo (SYSTEM_MODULES) para respetar «ocultar módulo»; opcional. */
  id?: string;
  href: string;
  title: string;
  description: string;
}

export default function ProductHome({
  title,
  intro,
  items,
}: {
  title: string;
  intro: string;
  items: ProductHomeItem[];
}) {
  const [state, setState] = useState<"loading" | "enabled" | "disabled">("loading");
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch(`/api/me?_t=${Date.now()}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setIsAdmin(data?.role === "admin" || Boolean(data?.isActingAdmin));
        setDisabledModules(Array.isArray(data?.disabledModules) ? data.disabledModules : []);
        setState(isProductViewEnabled(data?.disabledModules) ? "enabled" : "disabled");
      })
      .catch(() => setState("disabled"));
  }, []);

  if (state === "loading") {
    return (
      <p role="status" style={{ marginTop: 24, color: "#6e6e73", fontSize: 15 }}>
        Cargando esta sección…
      </p>
    );
  }

  if (state === "disabled") {
    return (
      <div style={{ marginTop: 24, padding: "36px 24px", background: "#ffffff", borderRadius: 22, border: "1px solid rgba(0, 0, 0, 0.07)", textAlign: "center", maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
        <h2 style={{ fontSize: 22, color: "#1d1d1f", margin: "0 0 10px" }}>Esta vista aún no está disponible</h2>
        <p style={{ fontSize: 14, color: "#6e6e73", lineHeight: 1.5, margin: "0 0 20px" }}>
          Estamos preparando la vista por productos para tu cuenta. Mientras tanto puedes seguir trabajando desde el Inicio como siempre.
        </p>
        <Link href="/dashboard" style={{ display: "inline-block", padding: "10px 20px", background: "#1d1d1f", color: "#ffffff", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
          Volver a Inicio
        </Link>
      </div>
    );
  }

  const visible = items.filter((item) => isAdmin || !item.id || !disabledModules.includes(item.id));

  return (
    <div>
      <ModuleIntro titulo={title}>
        <IntroP>{intro}</IntroP>
      </ModuleIntro>
      <div style={{ marginTop: 24, borderTop: "1px solid #d2d2d7" }}>
        {visible.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            style={{ display: "grid", gridTemplateColumns: "42px minmax(0, 1fr) auto", alignItems: "center", gap: 16, padding: "20px 4px", textDecoration: "none", borderBottom: "1px solid #e5e5ea", color: "#1d1d1f" }}
          >
            <span style={{ color: "#8e8e93", fontSize: 12, letterSpacing: "0.06em" }}>{String(i + 1).padStart(2, "0")}</span>
            <span>
              <strong style={{ display: "block", fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>{item.title}</strong>
              <span style={{ display: "block", marginTop: 5, color: "#6e6e73", fontSize: 13, lineHeight: 1.45 }}>{item.description}</span>
            </span>
            <span aria-hidden="true" style={{ color: "#6e6e73", fontSize: 22, lineHeight: 1 }}>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
