// Textos fijos de la interfaz pública (la plantilla es única; el idioma lo fija el blog).
const ES = {
  skip: "Saltar al contenido", search: "Buscar", searchPlaceholder: "Buscar artículos", menu: "Menú", categories: "Categorías",
  home: "Blog", recent: "Artículos recientes", featured: "Destacado", readMore: "Leer artículo", updated: "Actualizado",
  published: "Publicado", by: "Por", contents: "Contenido", share: "Compartir", related: "Artículos relacionados",
  next: "Siguiente", prev: "Anterior", page: "Página", noArticles: "Todavía no hay artículos publicados.",
  noResults: "No encontramos resultados para tu búsqueda.", results: "Resultados para", needHelp: "¿Necesitas ayuda?",
  whatsapp: "Escribir por WhatsApp", whatsappHint: "Conversa con nosotros por WhatsApp", scanWhatsapp: "Escanea para conversar por WhatsApp", notFound: "Página no encontrada",
  notFoundText: "La página que buscas no existe o fue movida.", backHome: "Volver al blog",
  suspended: "Este blog se encuentra temporalmente fuera de servicio", suspendedText: "Volveremos pronto.",
  articles: "artículos", article: "artículo", mainSite: "Sitio principal", pageNav: "Paginación", breadcrumb: "Ruta de navegación",
  defaultHero: "Guías y consejos", defaultHeroText: "Artículos para ayudarte a tomar mejores decisiones.",
};
const EN: typeof ES = {
  skip: "Skip to content", search: "Search", searchPlaceholder: "Search articles", menu: "Menu", categories: "Categories",
  home: "Blog", recent: "Recent articles", featured: "Featured", readMore: "Read article", updated: "Updated",
  published: "Published", by: "By", contents: "Contents", share: "Share", related: "Related articles",
  next: "Next", prev: "Previous", page: "Page", noArticles: "No articles published yet.",
  noResults: "No results found for your search.", results: "Results for", needHelp: "Need help?",
  whatsapp: "Message us on WhatsApp", whatsappHint: "Chat with us on WhatsApp", scanWhatsapp: "Scan to chat on WhatsApp", notFound: "Page not found",
  notFoundText: "The page you are looking for does not exist or was moved.", backHome: "Back to the blog",
  suspended: "This blog is temporarily out of service", suspendedText: "We will be back soon.",
  articles: "articles", article: "article", mainSite: "Main site", pageNav: "Pagination", breadcrumb: "Breadcrumb",
  defaultHero: "Guides and tips", defaultHeroText: "Articles to help you make better decisions.",
};
export type Strings = typeof ES;
export const t = (lang: string): Strings => (lang.toLowerCase().startsWith("en") ? EN : ES);
