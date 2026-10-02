"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PRODUCT_NAMES } from "@/lib/menu-names";
import { isProductViewEnabled } from "@/lib/product-routes";
import { accessStatusText, type AccessStatus } from "@/lib/mi-acceso-status";

type Products = { articulos?: AccessStatus | null; redes?: AccessStatus | null } | null;

export default function MiAccesoPage() {
  const [state, setState] = useState<"loading" | "hidden" | "ready">("loading");
  const [products, setProducts] = useState<Products>(null);

  useEffect(() => {
    fetch("/api/me?_t=" + Date.now(), { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!isProductViewEnabled(data?.disabledModules)) {
          setState("hidden");
          return;
        }
        setProducts(data?.products ?? null);
        setState("ready");
      })
      .catch(() => setState("hidden"));
  }, []);

  if (state === "loading") return null;

  // Sin la vista por productos activa NO se deja la pantalla en blanco: se avisa
  // y se devuelve al Inicio (mismo criterio que las portadas de producto).
  if (state === "hidden") {
    return (
      <div style={{ marginTop: 24, padding: "36px 24px", background: "#ffffff", borderRadius: 22, border: "1px solid rgba(0, 0, 0, 0.07)", textAlign: "center", maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
        <h2 style={{ fontSize: 22, color: "#1d1d1f", margin: "0 0 10px" }}>Esta vista aún no está disponible</h2>
        <p style={{ fontSize: 14, color: "#6e6e73", lineHeight: 1.5, margin: "0 0 20px" }}>
          Estamos preparando «Mi acceso» para tu cuenta. Mientras tanto puedes seguir trabajando desde el Inicio como siempre.
        </p>
        <Link href="/dashboard" style={{ display: "inline-block", padding: "10px 20px", background: "#1d1d1f", color: "#ffffff", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
          Volver a Inicio
        </Link>
      </div>
    );
  }

  // `div` y no `main`: el layout del dashboard ya tiene su propio <main>.
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "8px 0 48px" }}>
      <p className="eyebrow" style={{ margin: "0 0 4px" }}>Cuenta</p>
      <h1 style={{ margin: 0, fontSize: 32, color: "#1d1d1f" }}>Mi acceso</h1>
      <p style={{ margin: "10px 0 24px", color: "#6e6e73", lineHeight: 1.5 }}>
        Consulta qué productos están disponibles para tu cuenta. Si necesitas un cambio, contacta al administrador de tu organización.
      </p>
      <div style={{ display: "grid", gap: 12 }}>
        {(["ARTICULOS", "REDES"] as const).map((product) => {
          const status = product === "ARTICULOS" ? products?.articulos : products?.redes;
          return (
            <section key={product} style={{ padding: 20, border: "1px solid #d2d2d7", borderRadius: 14, background: "#fff" }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>{PRODUCT_NAMES[product]}</h2>
              <p style={{ margin: 0, color: status?.allowed ? "#1d6b45" : "#6e6e73", fontWeight: 600 }}>{accessStatusText(status)}</p>
            </section>
          );
        })}
      </div>
    </div>
  );
}
