import { redirect } from "next/navigation";

/**
 * La página «Redes Sociales» se retiró: todas las redes y Google Business Profile se
 * conectan ahora en Configuración → Conexiones → Difusión. Se conserva esta dirección
 * para que los enlaces, marcadores y retornos antiguos sigan funcionando.
 */
export default function ConfiguracionRedesSocialesPage() {
  redirect("/dashboard/configuracion/conexiones?vista=difusion");
}
