/**
 * «Cómo hacerlo paso a paso» de cada red, con el mismo formato de 5 pasos que Search Console
 * y Analytics. Lenguaje neutro para el cliente: sin jerga técnica ni nombres de proveedores.
 */
export interface ConnectionGuideContent {
  steps: string[];
  ifFails?: string;
  signupUrl?: string;
  signupLabel?: string;
}

const PROBAR = "Pulsa Probar conexión y comprueba el mensaje verde.";

const SI_FALLA = "revisa que estés dentro de la cuenta correcta y que hayas aceptado todos los permisos; luego pulsa «Nueva conexión» otra vez. Si sigue igual, avisa a soporte.";

/**
 * PLANTILLA ÚNICA de conexión (pedido de Milton, 2026-10-12): todas las redes y blogs muestran la misma
 * caja, la misma introducción y los mismos 6 pasos; solo cambian el nombre de la red, la cuenta que hay
 * que confirmar y el paso de «destino» (elegir tablero/blog/Página o ver la conexión exitosa).
 */
function oauthGuide(red: string, cuenta: string, cuartoPaso: string, signupUrl?: string, ifFails: string = SI_FALLA): ConnectionGuideContent {
  return {
    steps: [
      `Antes de empezar, asegúrate de tener una cuenta activa de ${red}. Si todavía no la tienes, puedes crearla con el enlace que aparece debajo.`,
      `Abre ${red} en otra pestaña del mismo navegador (o en la aplicación móvil) e inicia sesión con tranquilidad.`,
      `Mira que estás dentro de ${cuenta} y que puedes usarla normalmente. Si tienes varias cuentas, elige ahora la que quieres conectar.`,
      `Cuando estés listo, vuelve a esta pantalla y pulsa «Nueva conexión». ${red} te mostrará una ventana para pedirte permiso.`,
      `Lee los permisos y acéptalos si todo está correcto. ${cuartoPaso}`,
      `Para terminar, pulsa «Probar conexión». Si ves el mensaje verde, ya está: SEO TOTAL podrá usar esta conexión.`,
    ],
    ifFails,
    signupUrl,
    signupLabel: `Crear una cuenta de ${red}`,
  };
}

export const CONNECTION_GUIDES: Record<string, ConnectionGuideContent> = {
  threads: oauthGuide("Threads", "la cuenta de Threads que quieres usar", "Vuelve aquí y comprueba la pantalla de Conexión exitosa.", "https://www.threads.net/signup"),
  linkedin: oauthGuide("LinkedIn", "la cuenta de LinkedIn que quieres usar", "Vuelve aquí y comprueba la pantalla de Conexión exitosa.", "https://www.linkedin.com/signup"),
  pinterest: oauthGuide("Pinterest", "la cuenta de Pinterest que quieres usar", "Elige el tablero donde se publicarán los Pins y pulsa Aprobar y guardar.", "https://www.pinterest.com/business/create/"),
  tumblr: oauthGuide("Tumblr", "la cuenta de Tumblr que quieres usar", "Elige el blog donde se publicará y pulsa Aprobar y guardar.", "https://www.tumblr.com/register"),
  blogger: oauthGuide("Blogger", "la cuenta de Google que administra tu blog", "Elige el blog donde se publicará y pulsa Aprobar y guardar.", "https://accounts.google.com/signup"),
  "bing-webmaster": {
    steps: [
      "Abre Bing Webmaster Tools en otra pestaña del mismo navegador.",
      "Confirma que estás dentro de la cuenta de Microsoft que administra tu sitio.",
      "Pulsa Nueva conexión y autoriza el acceso solicitado.",
      "Elige tu sitio verificado, revisa la dirección del sitemap y pulsa Aprobar y guardar.",
      PROBAR,
    ],
    ifFails: "revisa que tu sitio esté verificado en Bing Webmaster Tools y vuelve a intentarlo.",
  },
  "business-profile": oauthGuide("Google Business Profile", "la cuenta de Google que administra tu Perfil de Negocio (con la ficha verificada)", "Vuelve aquí y comprueba la pantalla de Conexión exitosa.", "https://www.google.com/business/", "una ficha sin verificar no puede recibir publicaciones; verifícala en Google y vuelve a intentarlo."),
  instagram: oauthGuide("Instagram", "tu cuenta profesional de Instagram (Business o Creator) vinculada a tu Página de Facebook", "Elige la cuenta de Instagram correcta y pulsa Aprobar y guardar.", "https://www.instagram.com/accounts/emailsignup/"),
  facebook: oauthGuide("Facebook", "la cuenta personal que administra tu Página de negocio", "Elige la Página correcta (no tu perfil personal) y pulsa Aprobar y guardar.", "https://www.facebook.com/pages/create"),
  bluesky: {
    steps: [
      "Abre Bluesky en otra pestaña del mismo navegador y entra en Configuración → Privacidad y seguridad → Contraseñas de aplicación.",
      "Pulsa Crear nueva contraseña, ponle el nombre SEO TOTAL y copia la contraseña que Bluesky te muestra. No uses tu contraseña normal.",
      "Escribe tu usuario completo (por ejemplo, nombre.bsky.social) y pega la contraseña de aplicación aquí abajo.",
      "Pulsa Conectar y comprueba la pantalla de Conexión exitosa.",
      PROBAR,
    ],
    ifFails: "revisa que no hayas copiado espacios, que el usuario incluya el dominio y que sea una contraseña de aplicación.",
    signupUrl: "https://bsky.app/",
    signupLabel: "Crear una cuenta de Bluesky",
  },
};
