"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PRODUCT_NAMES } from "@/lib/menu-names";

/*
 * PANEL «PRODUCTOS» DE LA FICHA DE USUARIO (proyecto «SEPARACION DE SEO TOTAL»,
 * Lote 1). Muestra qué producto tiene la cuenta (SEO Total Artículos / SEO
 * Total Redes) y permite activarlo, desactivarlo y dar o quitar el tiempo de
 * gracia. Cada botón guarda al instante (no depende del botón «Guardar» de la
 * ficha) porque cada cambio deja su propia fila en la bitácora de derechos.
 *
 * Mientras el interruptor de aplicación esté apagado («off»), estos cambios
 * solo preparan los datos: no bloquean a nadie.
 */

type ProductKey = "ARTICULOS" | "REDES";
type Status = "ACTIVE" | "GRACE" | "INACTIVE";

interface EntitlementRow {
  product: ProductKey;
  status: Status;
  graceUntil: string | null;
}

interface Effective {
  allowed: boolean;
  reason: string;
  graceDaysLeft: number | null;
}

interface Payload {
  entitlements: EntitlementRow[];
  effective: { articulos: Effective; redes: Effective };
}

const DEFAULT_GRACE_DAYS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

const REASON_TEXT: Record<string, string> = {
  ADMIN: "Administrador: siempre tiene acceso",
  ACTIVE: "Activo",
  GRACE: "En gracia",
  NO_RECORD_LEGACY: "Sin registro: se mantiene el acceso de siempre",
  GRACE_EXPIRED: "Gracia vencida",
  INACTIVE: "Sin acceso",
  NO_NETWORK_APPROVED: "Sin redes aprobadas",
};

const buttonStyle = {
  fontSize: 12,
  fontWeight: 600,
  padding: "6px 12px",
  minHeight: 32,
  borderRadius: 8,
  border: "1px solid #d2d2d7",
  background: "#ffffff",
  color: "#1d1d1f",
  cursor: "pointer",
} as const;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("es", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function UserProductsPanel({ userId }: { userId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<ProductKey | null>(null);
  const [days, setDays] = useState<Record<ProductKey, string>>({
    ARTICULOS: String(DEFAULT_GRACE_DAYS),
    REDES: String(DEFAULT_GRACE_DAYS),
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/entitlements`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "No se pudieron leer los productos.");
      setData(json as Payload);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron leer los productos.");
    }
  }, [userId]);

  // CARGA PEREZOSA: la pantalla de usuarios dibuja las fichas de TODAS las
  // cuentas (aunque estén plegadas). Si cada panel consultara al montarse, abrir
  // la pantalla dispararía una petición por usuario. Solo se consulta cuando la
  // ficha es visible (una ficha plegada no es visible, así que no consulta).
  const rootRef = useRef<HTMLDivElement | null>(null);
  const startedRef = useRef(false);
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const start = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      void load();
    };
    // Sin IntersectionObserver (navegador muy viejo) se consulta de inmediato.
    if (typeof IntersectionObserver === "undefined") {
      start();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        start();
        observer.disconnect();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [load]);

  async function send(product: ProductKey, body: Record<string, unknown>) {
    setBusy(product);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/entitlements`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, ...body }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo guardar el cambio.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el cambio.");
    } finally {
      setBusy(null);
    }
  }

  function renderProduct(product: ProductKey) {
    const row = data?.entitlements.find((e) => e.product === product) ?? null;
    const effective = product === "ARTICULOS" ? data?.effective.articulos : data?.effective.redes;
    const inGrace = row?.status === "GRACE";
    const label = PRODUCT_NAMES[product];
    const disabled = busy !== null || !data;

    let state = "Sin registro (se mantiene el acceso de siempre)";
    if (row?.status === "ACTIVE") state = "Activo";
    if (row?.status === "INACTIVE") state = "Sin acceso";
    if (inGrace) {
      // Los días se calculan desde la FECHA de la gracia, no desde el resultado
      // de acceso: ese resultado no trae días cuando otra regla (por ejemplo
      // «sin redes aprobadas» en Redes) deniega el acceso aunque la gracia siga
      // vigente, y la pantalla decía «vencida» por error.
      const msLeft = row.graceUntil ? new Date(row.graceUntil).getTime() - Date.now() : 0;
      const daysLeft = msLeft > 0 ? Math.max(1, Math.ceil(msLeft / DAY_MS)) : null;
      state = `En gracia hasta el ${formatDate(row.graceUntil)}${
        daysLeft ? ` (${daysLeft} ${daysLeft === 1 ? "día" : "días"})` : " (vencida)"
      }`;
    }

    return (
      <div key={product} style={{ borderBottom: "1px solid #e5e5ea", padding: "12px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
          <strong style={{ fontSize: 14 }}>{label}</strong>
          <span style={{ fontSize: 12, color: "#6e6e73" }}>
            {state}
            {effective ? ` · Hoy: ${effective.allowed ? "con acceso" : "sin acceso"} — ${REASON_TEXT[effective.reason] ?? effective.reason}` : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
          <button type="button" style={buttonStyle} disabled={disabled} onClick={() => send(product, { action: "set_status", status: "ACTIVE" })}>
            Activar
          </button>
          <button type="button" style={buttonStyle} disabled={disabled} onClick={() => send(product, { action: "set_status", status: "INACTIVE" })}>
            Desactivar
          </button>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input
              type="number"
              min={1}
              max={365}
              step={1}
              value={days[product]}
              onChange={(e) => setDays((prev) => ({ ...prev, [product]: e.target.value }))}
              aria-label={`Días de gracia para ${label}`}
              style={{ width: 64, fontSize: 13, padding: "6px 8px", minHeight: 32 }}
            />
            <button
              type="button"
              style={buttonStyle}
              disabled={disabled}
              onClick={() => {
                const n = Number(days[product]);
                if (!Number.isInteger(n) || n < 1 || n > 365) {
                  setError("Los días de gracia deben ser un número entero entre 1 y 365.");
                  return;
                }
                void send(product, { action: "grant_grace", days: n });
              }}
            >
              Dar gracia
            </button>
          </span>
          {inGrace && (
            <button type="button" style={buttonStyle} disabled={disabled} onClick={() => send(product, { action: "remove_grace" })}>
              Quitar gracia
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef}>
      {error && (
        <p role="alert" style={{ margin: "10px 0 0", fontSize: 13, color: "#b00020" }}>
          {error}
        </p>
      )}
      {!data && !error && <p style={{ margin: "10px 0 0", fontSize: 13, color: "#6e6e73", minHeight: 20 }}>Cargando productos…</p>}
      {data && (
        <>
          {renderProduct("ARTICULOS")}
          {renderProduct("REDES")}
        </>
      )}
    </div>
  );
}
