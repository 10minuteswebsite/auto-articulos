"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRODUCT_NAMES } from "@/lib/menu-names";
import { productOfPath } from "@/lib/product-routes";
import {
  evaluatePageGate,
  graceNotices,
  type ProductsInfo,
} from "@/lib/product-page-gate";

/*
 * PUERTA VISUAL DE ACCESO POR PRODUCTO (proyecto «SEPARACION DE SEO TOTAL»,
 * flujos F5 y F6). Es solo EXPERIENCIA DE USUARIO: la barrera real está en el
 * servidor (APIs y worker). Con el interruptor en «off» (hoy) NO hace nada y
 * no se nota. Se activa únicamente cuando Administración lo pasa a «shadow»
 * (solo el aviso de gracia) o «enforce» (aviso y pantalla de acceso terminado).
 *
 * Nunca bloquea mientras carga ni si /api/me falla: ante la duda, deja pasar.
 */
export default function ProductAccessGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mode, setMode] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductsInfo | null>(null);

  useEffect(() => {
    fetch(`/api/me?_t=${Date.now()}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setMode(typeof data?.productEnforcement === "string" ? data.productEnforcement : null);
        setProducts(data?.products ?? null);
      })
      .catch(() => {
        setMode(null);
        setProducts(null);
      });
  }, []);

  const gate = evaluatePageGate({ mode, scope: productOfPath(pathname), products });

  if (gate.block) {
    const name = PRODUCT_NAMES[gate.product];
    const venció = gate.reason === "GRACE_EXPIRED";
    return (
      <div style={{ marginTop: 24, padding: "36px 24px", background: "#ffffff", borderRadius: 22, border: "1px solid rgba(0, 0, 0, 0.07)", textAlign: "center", maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
        <h2 style={{ fontSize: 22, color: "#1d1d1f", margin: "0 0 10px" }}>
          {venció ? `Tu acceso a ${name} terminó` : `No tienes acceso a ${name}`}
        </h2>
        <p style={{ fontSize: 14, color: "#6e6e73", lineHeight: 1.5, margin: "0 0 20px" }}>
          {venció
            ? `Tu periodo de gracia de ${name} ya terminó. `
            : `Tu cuenta no tiene ${name} activo. `}
          Para volver a usarlo, contacta al administrador. No se ha perdido ninguno de tus datos.
        </p>
        <Link href="/dashboard" style={{ display: "inline-block", padding: "10px 20px", background: "#1d1d1f", color: "#ffffff", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
          Volver a Inicio
        </Link>
      </div>
    );
  }

  const notices = graceNotices({ mode, products });
  return (
    <>
      {notices.map((n) => (
        <div
          key={n.product}
          role="status"
          style={{ margin: "0 0 16px", padding: "12px 16px", borderRadius: 12, background: "#fff7ed", border: "1px solid rgba(180, 83, 9, 0.25)", color: "#92400e", fontSize: 14, lineHeight: 1.45 }}
        >
          Tu acceso gratuito a <strong>{PRODUCT_NAMES[n.product]}</strong> termina
          {n.until ? ` el ${new Date(n.until).toLocaleDateString("es", { day: "2-digit", month: "2-digit", year: "numeric" })}` : ""}
          {` (${n.daysLeft} ${n.daysLeft === 1 ? "día" : "días"})`}. Para seguir usándolo, contacta al administrador.
        </div>
      ))}
      {children}
    </>
  );
}
