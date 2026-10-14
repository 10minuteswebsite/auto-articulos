import { LegacyLoginPage } from "@/app/login/page";

/**
 * Entrada reservada para la administración local de SEO TOTAL.
 * Los usuarios normales deben entrar desde el Hub, usando /login como puerta
 * de transición.
 */
export default function AdminLoginPage() {
  return <LegacyLoginPage />;
}
