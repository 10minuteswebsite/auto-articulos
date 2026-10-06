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

function oauthGuide(red: string, cuenta: string, cuartoPaso: string, signupUrl?: string): ConnectionGuideContent {
  return {
    steps: [
      `Antes de empezar, asegúrate de tener una cuenta activa de ${red}. Si todavía no la tienes, puedes crearla con el enlace que aparece debajo.`,
      `Abre ${red} en otra pestaña del mismo navegador (o en la aplicación móvil) e inicia sesión con tranquilidad.`,
      `Mira que estás dentro de ${cuenta} y que puedes usarla normalmente. Si tienes varias cuentas, elige ahora la que quieres conectar.`,
      `Cuando estés listo, vuelve a esta pantalla y pulsa «Nueva conexión». ${red} te mostrará una ventana para pedirte permiso.`,
      `Lee los permisos y acéptalos si todo está correcto. ${cuartoPaso}`,
      `Para terminar, pulsa «Probar conexión». Si ves el mensaje verde, ya está: SEO TOTAL podrá usar esta conexión.`,
    ],
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
  "business-profile": {
    steps: [
      "Abre Google en otra pestaña del mismo navegador.",
      "Confirma que estás dentro de la cuenta de Google que administra tu Perfil de Negocio y que tu ficha está verificada.",
      "Pulsa Nueva conexión y autoriza el acceso solicitado.",
      "Vuelve aquí y comprueba la pantalla de Conexión exitosa.",
      PROBAR,
    ],
    ifFails: "una ficha sin verificar no puede recibir publicaciones; verifícala en Google y vuelve a intentarlo.",
  },
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
