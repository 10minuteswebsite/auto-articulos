import type { ReactNode } from "react";
import DashboardNav from "@/components/DashboardNav";
import FloatingAssistant from "@/components/FloatingAssistant";
import ModuleGuard from "@/components/ModuleGuard";
import TrialBlockedScreen from "@/components/TrialBlockedScreen";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import EcosystemHeader from "@/components/EcosystemHeader";
import AppBreadcrumbs from "@/components/AppBreadcrumbs";
import { displayName, getSessionContext } from "@/lib/current-user";
import { hasTrialAccess } from "@/lib/trial";
import { getMaintenanceMode } from "@/lib/maintenance";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, actingAdmin } = await getSessionContext();
  const requestHeaders = await headers();
  const host = requestHeaders.get("host")?.split(":")[0].toLowerCase() ?? "";
  const showHubNavigation = requestHeaders.get("x-auth-source") === "hub";
  const product = host.startsWith("redes.")
    ? { hubLabel: "Redes Totales", appLabel: "SEO TOTAL" }
    : { hubLabel: "Auto Artículos", appLabel: "SEO TOTAL" };
  const blocked = !actingAdmin && user.role !== "admin" && !hasTrialAccess(user);
  const maintenance = await getMaintenanceMode();

  if (maintenance && !actingAdmin && user.role !== "admin") {
    return <MaintenanceScreen />;
  }

  return (
    <>
      {showHubNavigation && (
        <EcosystemHeader
          email={user.email}
          isAdmin={user.role === "admin" || Boolean(actingAdmin)}
          actingAdminName={actingAdmin ? displayName(actingAdmin) : undefined}
          actingUserName={actingAdmin ? displayName(user) : undefined}
          product={product}
        />
      )}
      <main
        className="dashboard-main shell"
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "18px 24px 64px",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
      <style>{`
        @media (max-width: 639px) {
          .dashboard-nav { position: absolute !important; top: 18px; right: 16px; margin: 0 !important; z-index: 20; }
          .dashboard-main > nav { margin-top: 0 !important; margin-bottom: 22px !important; }
          .dashboard-main {
            padding: 20px 16px 44px !important;
          }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .dashboard-main { padding-bottom: 48px !important; }
        }
        @media (min-width: 1024px) {
          .mobile-notice { display: none; }
        }
        @media (min-width: 1180px) {
          .dashboard-nav { position: relative !important; top: auto; right: auto; }
        }
        /*
         * Tablas anchas: vista apilada en tarjetas estilo Apple en pantallas pequeñas
         */
        @media (max-width: 1023px) {
          table.responsive-table {
            min-width: 0 !important;
            width: 100% !important;
          }
          table.responsive-table thead { display: none; }
          table.responsive-table,
          table.responsive-table tbody,
          table.responsive-table tr,
          table.responsive-table td {
            display: block;
            width: 100%;
          }
          table.responsive-table tr {
            border-top: none !important;
            border: 1px solid rgba(0, 0, 0, 0.08) !important;
            background: #ffffff;
            border-radius: 12px;
            padding: 12px 14px;
            margin-bottom: 12px;
            box-sizing: border-box;
            box-shadow: none;
          }
          table.responsive-table td {
            padding: 6px 0;
            border: none !important;
          }
          table.responsive-table td[data-label]::before {
            content: attr(data-label);
            display: block;
            font-size: 11px;
            font-weight: 600;
            color: #6e6e73;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-bottom: 3px;
          }
        }
      `}</style>
      {blocked ? (
        <TrialBlockedScreen />
      ) : (
        <>
          <DashboardNav />
          <AppBreadcrumbs productLabel={product.hubLabel} />
          <ModuleGuard>{children}</ModuleGuard>
          <FloatingAssistant />
        </>
      )}
      </main>
    </>
  );
}
