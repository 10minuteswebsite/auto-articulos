"use client";

import { useEffect, useState } from "react";
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

  if (state === "loading" || state === "hidden") return null;

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "8px 0 48px" }}>
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
    </main>
  );
}
