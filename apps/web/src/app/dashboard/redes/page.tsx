import ProductHome from "@/components/ProductHome";
import { MENU_NAMES, PRODUCT_NAMES } from "@/lib/menu-names";

// Inicio de SEO Total Redes (proyecto «SEPARACION DE SEO TOTAL», Lote 2). Se
// muestra siempre aunque la cuenta no tenga redes activas (pedido de Milton,
// 1/10/2026): el acceso al producto no depende de una red conectada. Las
// funciones de publicación siguen comprobando sus permisos por red.
export default function RedesHomePage() {
  return (
    <ProductHome
      title={PRODUCT_NAMES.REDES}
      intro="Lleva tu contenido a redes sociales y blogs públicos con ayuda de la IA, y conecta tus cuentas desde un solo lugar."
      items={[
        { id: "oportunidades-redes", href: "/dashboard/oportunidades-redes", title: MENU_NAMES.redes, description: "Crea y difunde publicaciones en tus redes sociales y blogs públicos." },
        { id: "publicaciones-en-curso", href: "/dashboard/publicaciones-en-curso", title: "Progreso de las publicaciones", description: "Consulta cómo avanzan tus publicaciones en proceso." },
        { id: "historial", href: "/dashboard/historial", title: "Historial", description: "Revisa lo que se ha publicado y lo que ocurrió con cada publicación." },
        { href: "/dashboard/configuracion/redes-sociales", title: "Redes sociales", description: "Qué redes y blogs tienes disponibles y cómo se publica en cada una." },
        { href: "/dashboard/configuracion/conexiones", title: "Conexiones", description: "Conecta y revisa tus cuentas de redes sociales y blogs." },
      ]}
    />
  );
}
