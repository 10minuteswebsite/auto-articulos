import ProductHome from "@/components/ProductHome";
import { MENU_NAMES, PRODUCT_NAMES } from "@/lib/menu-names";

// Inicio de SEO Total Artículos (proyecto «SEPARACION DE SEO TOTAL», Lote 2).
// Es una portada que lista las pantallas del producto; no mueve ninguna ruta.
export default function ArticulosHomePage() {
  return (
    <ProductHome
      title={PRODUCT_NAMES.ARTICULOS}
      intro="Crea artículos con tus propios títulos o con ayuda de la IA, publícalos en tu página web y sigue su progreso, su historial y sus estadísticas."
      items={[
        { id: "publicar", href: "/dashboard/publicar", title: MENU_NAMES.propios, description: "Escribe tus títulos y publícalos directamente en tu página web." },
        { id: "oportunidades", href: "/dashboard/oportunidades", title: MENU_NAMES.ia, description: "Encuentra temas con posibilidades reales y crea artículos para tu página web." },
        { id: "publicaciones-en-curso", href: "/dashboard/publicaciones-en-curso", title: "Progreso de las publicaciones", description: "Consulta cómo avanzan tus artículos y lotes en proceso." },
        { id: "historial", href: "/dashboard/historial", title: "Historial", description: "Revisa todo lo que se ha publicado y lo que ocurrió con cada publicación." },
        { id: "estadisticas", href: "/dashboard/estadisticas", title: "Estadísticas", description: "Mide el rendimiento de tus artículos y tu ritmo de trabajo." },
        { href: "/dashboard/configuracion/contenido", title: "Contenido y firma", description: "Cómo se escriben tus artículos, el texto que firma cada uno y tus datos de contacto." },
        { href: "/dashboard/configuracion/indexacion", title: "Indexación", description: "Controla cómo se envían tus artículos a los buscadores." },
      ]}
    />
  );
}
