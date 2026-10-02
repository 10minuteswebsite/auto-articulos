"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SYSTEM_MODULES } from "@/lib/modules";
import { fetchMe } from "@/lib/me-client";

export default function ModuleGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [socialPublishingApproved, setSocialPublishingApproved] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetchMe()
      .then((data) => {
        setIsAdmin(data?.role === "admin" || Boolean(data?.isActingAdmin));
        setSocialPublishingApproved(Boolean(data?.socialPublishingApproved));
        if (Array.isArray(data?.disabledModules)) {
          setDisabledModules(data.disabledModules);
        }
        setChecked(true);
      })
      .catch(() => {
        setIsAdmin(false);
        setChecked(true);
      });
  }, []);

  if (!checked || isAdmin) {
    return <>{children}</>;
  }

  /*
   * Coincidencia por segmento de ruta, no por prefijo de texto.
   *
   * Con startsWith, "/dashboard/oportunidades-redes" empezaba por
   * "/dashboard/oportunidades", así que el guard resolvía la pantalla de redes
   * como si fuera el módulo de Oportunidades: apagar uno apagaba el otro, y
   * apagar redes no protegía nada. Se elige además la coincidencia más larga,
   * para que gane siempre el módulo más específico.
   */
  const matchingModule = SYSTEM_MODULES.filter(
    (m) => pathname === m.href || pathname?.startsWith(`${m.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];

  /*
   * Redes (oportunidades-redes) se revisa primero y aparte, con un solo
   * mensaje: no importa si la razón es que está apagado para todos, que
   * Administración lo deshabilitó para esta cuenta en particular, o que
   * todavía no tiene ninguna red aprobada — `socialPublishingApproved`
   * (hasSocialModuleAccess en el servidor) ya resume las tres en un booleano.
   * Pedido explícito de Milton (1/10/2026): el botón del Inicio se ve
   * siempre; esta pantalla es la que explica por qué no se puede entrar.
   */
  if (matchingModule?.id === "oportunidades-redes") {
    if (!socialPublishingApproved) {
      return (
        <div
          style={{
            marginTop: 24,
            padding: "36px 24px",
            textAlign: "center",
            maxWidth: 600,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <h2 style={{ fontSize: 22, color: "#1d1d1f", margin: "0 0 10px" }}>
            Esta sección todavía no está disponible para tu cuenta
          </h2>
          <p style={{ fontSize: 14, color: "#6e6e73", lineHeight: 1.5, margin: "0 0 20px" }}>
            Puede estar en mantenimiento o que el administrador todavía no te haya dado acceso. Pídele que
            la habilite desde Administración.
          </p>
          <Link
            href="/dashboard"
            style={{
              display: "inline-block",
              padding: "10px 20px",
              background: "#1d1d1f",
              color: "#ffffff",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Volver a Inicio
          </Link>
        </div>
      );
    }
    return <>{children}</>;
  }

  if (matchingModule && disabledModules.includes(matchingModule.id)) {
    return (
      <div
        style={{
          marginTop: 24,
          padding: "36px 24px",
          background: "#ffffff",
          borderRadius: 22,
          border: "1px solid rgba(0, 0, 0, 0.07)",
          boxShadow: "none",
          textAlign: "center",
          maxWidth: 600,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}></div>
        <h2 style={{ fontSize: 22, color: "#1d1d1f", margin: "0 0 10px" }}>
          Módulo en mantenimiento
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "#6e6e73",
            lineHeight: 1.5,
            margin: "0 0 20px",
          }}
        >
          La sección <strong>{matchingModule.label}</strong> se encuentra
          temporalmente en desarrollo o mantenimiento para tu cuenta. Vuelve a
          intentarlo más tarde o contacta al administrador.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            padding: "10px 20px",
            background: "#1d1d1f",
            color: "#ffffff",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Volver a Inicio
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
