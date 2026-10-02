import { MENU_NAMES, MENU_NAMES_ANTERIORES as ANTES, PRODUCT_NAMES } from "../lib/menu-names";

/**
 * Manual base de uso. Se revisa cuando cambia una función estable del sistema.
 * Las novedades y arreglos recientes se agregan en tiempo real desde
 * ProductUpdate mediante getUserManualKnowledge().
 */
export const BASE_USER_MANUAL = `
# Manual de uso de SEO TOTAL

Este manual explica cómo usar la plataforma desde la perspectiva de una persona usuaria. No describe contraseñas internas, programación ni configuración técnica del sistema.

## Antes de empezar (Asistente de Configuración Inicial)

Cuando ingresas a tu cuenta por primera vez y la configuración aún no está completa, Inicio te muestra únicamente el **Asistente de Configuración Inicial Paso a Paso**: el banner de bienvenida, los 4 pasos en orden y la guía paso a paso. Mientras esto no esté completo, el menú y las acciones principales permanecen ocultos para que no te distraigas con secciones que todavía están bloqueadas.

1. **Paso 1 (Cuenta de la plataforma):** Guarda tu usuario y contraseña de la plataforma. Puedes mostrar u ocultar la contraseña que escribes con el ícono de ojo dentro del campo. Si no recuerdas esa clave, puedes restablecerla o crear una nueva en segundos desde el enlace directo de recuperación de la plataforma incluido en el asistente. Al guardar, el paso queda en **"Pendiente de verificar"**: tus datos se guardan cifrados, pero todavía no se ha comprobado que sirvan para entrar. Se pone verde en cuanto un login real funciona — ya sea porque la detección de tu sitio lo confirma, o porque la sincronización del Paso 2 logra entrar de verdad a tu cuenta. Si el login falla en cualquiera de los dos casos, el sistema nunca te deja con un error sin explicación: siempre te dice que debes resetear tu contraseña de la plataforma y te da el enlace exacto para hacerlo.
2. **Confirmar el sitio:** Si tu cuenta de la plataforma da acceso a más de un sitio, se detecta en vivo cuál eliges — esta cuenta trabajará únicamente con ese sitio para siempre; para el otro, se crea otra cuenta. La comprobación de acceso debe responder en unos 5 segundos. Si no responde, cambia o restablece la contraseña de la plataforma y vuelve a guardarla en SEO TOTAL.
3. **Paso 2 (Sincronizar categorías):** Descarga en vivo las categorías reales de tu web para clasificar tus artículos. Mientras corre verás una **barra de progreso con las etapas** (En cola → Entrando a tu plataforma → Guardando categorías), un cronómetro y un **Detalle del proceso** desplegable que registra con hora exacta qué fue pasando: cuándo se envió la solicitud, cuándo un procesador la tomó y cómo terminó. Si algo falla, ahí aparece el motivo real. Puede tardar varios minutos según la cola de trabajo; la pantalla se actualiza sola y no hace falta recargar ni volver a pulsar. Verás lo mismo si sincronizas desde Configuración.
4. **Paso 3 (Idioma de redacción):** Confirma el idioma principal en el que la Inteligencia Artificial redactará tus contenidos.
5. **Paso 4 (Google Search Console):** Google Search Console le dice a la plataforma qué está buscando de verdad la gente que llega a tu sitio en Google, para que la Inteligencia Artificial elija y escriba sobre esos temas reales en vez de adivinar — es obligatorio, sin esta conexión no se pueden posicionar tus artículos. Abre Search Console en una pestaña contigua de tu navegador para comprobar que esté activo con la cuenta de Google dueña de tu web, y luego conéctalo mediante Google OAuth seleccionando tu sitio.
6. **Meta final:** Al completar los 4 pasos ves una pantalla de "¡Felicitaciones!" con tres caminos: **Cómo funciona**, **${MENU_NAMES.ia}** y **${MENU_NAMES.propios}**. Se recomienda revisar primero Cómo funciona. Esa pantalla se queda visible durante toda esa visita — no desaparece de golpe apenas terminas el último paso. En la siguiente visita a Inicio, ya con todo listo, entras directamente a las tres acciones principales.

Después del Paso 4, el Asistente te confirma que ya estás listo para publicar y muestra tres opciones: **Cómo funciona**, **${MENU_NAMES.ia}** y **${MENU_NAMES.propios}**. Bing Webmaster Tools es opcional y se conecta, si lo deseas, desde Configuración → Indexación; no forma parte del Asistente.

También puedes volver a abrir el Asistente en cualquier momento desde **Configuración** (/dashboard/configuracion/inicial); si ya completaste los 4 pasos, esa pantalla no vuelve a mostrar el asistente, solo una confirmación corta con acceso directo a **${MENU_NAMES.ia}**.

## Inicio

Ruta: /dashboard

Inicio es tu centro de operaciones. **Si tu cuenta tiene activa la vista por productos** (ver «El menú»), Inicio muestra en cambio dos tarjetas, **${PRODUCT_NAMES.ARTICULOS}** y **${PRODUCT_NAMES.REDES}**; lo que sigue describe el Inicio estándar:
- **Para cuentas nuevas (sin artículos aún):** Muestra de forma exclusiva el Asistente de Configuración Inicial, sin menú ni accesos directos, para que completes tu puesta a punto sin distracciones.
- **Para cuentas ya configuradas:** Muestra únicamente el título **Acciones posibles** y tres tarjetas: **${MENU_NAMES.propios}**, **${MENU_NAMES.ia}** y **${MENU_NAMES.redes}**. En móvil se muestran en una sola columna para que cada acción sea fácil de pulsar.
- La tarjeta de **${MENU_NAMES.redes}** se muestra **siempre**, tanto en Inicio como en el menú y en **Comienza Aquí**. Si tu cuenta todavía no tiene activada esa sección (Administración debe aprobar al menos una red social o blog), al pulsarla verás un aviso claro de que aún no está disponible para tu cuenta, en lugar de que el botón desaparezca. Los administradores, y los administradores que están usando una cuenta ajena para dar soporte, siempre la tienen.
- Las estadísticas no ocupan espacio en Inicio: se consultan desde **Publicaciones → Estadísticas**, junto al historial.
- Desde el menú superior tienes acceso a: Cómo funciona esta aplicación, Publicaciones y Configuración. Historial está dentro de Publicaciones y Actualizaciones dentro de Configuración.

## Cada módulo se explica solo

Al principio de cada pantalla hay un recuadro que empieza con "Antes de avanzar, lee esto". Ahí se explica en pocas líneas qué sucede en ese módulo, para qué sirve y qué se espera de ti, en lenguaje llano y sin dar por supuesto ningún conocimiento previo.

Dentro de esas explicaciones, el nombre de cualquier módulo aparece en MAYÚSCULAS y en negrita, y además es un enlace: al pulsarlo vas directo a esa pantalla. Así, si un texto te manda a otro módulo, no tienes que buscarlo en el menú.

En el teléfono, ese recuadro de explicación aparece plegado por defecto en las pantallas operativas (por ejemplo Actualizaciones, Difusión Social y los módulos de publicar): primero ves los controles para trabajar, y pulsando "Ver instrucciones" despliegas el texto completo cuando lo necesites. En computadora, la explicación se ve siempre completa, sin necesidad de pulsar nada.

## El menú

El menú superior tiene, en este orden: **Inicio**, **Cómo funciona esta aplicación**, **Publicaciones** y **Configuración**. Dentro de **Publicaciones** están **${MENU_NAMES.propios}**, **${MENU_NAMES.ia}**, **${MENU_NAMES.redes}**, el progreso y el historial. Dentro de **Configuración** están la configuración general y las actualizaciones. Los administradores ven además **Administración**, que también se despliega y contiene **Usuarios** (/dashboard/usuarios) y **Composio** (/dashboard/composio). En la ficha de cada usuario, los administradores tienen la sección **Productos**: ahí ven los dos productos en que se separa SEO TOTAL (**${PRODUCT_NAMES.ARTICULOS}** y **${PRODUCT_NAMES.REDES}**), pueden activarlos o desactivarlos y dar o quitar días de gracia. Por ahora ese control solo prepara los datos: no cambia lo que ve ningún usuario. Debajo de los productos hay un **Historial** plegable con los últimos cambios de derechos de esa cuenta (fecha, producto, de qué estado a cuál, quién y el motivo). Además, en **Administración → Usuarios**, arriba, está el **interruptor de derechos por producto** con tres modos: **Apagado** (no se aplica nada, como hoy), **Sombra** (solo se registra lo que se bloquearía) y **Activo** (bloquea de verdad a las cuentas sin derecho). Para pasar a Activo hay que estar antes en Sombra y escribir la palabra ACTIVAR; volver a Sombra o Apagado es siempre inmediato. **Vista por productos (vista previa):** los administradores, y las cuentas a las que Administración active el módulo «Vista por productos», ven el menú y el Inicio organizados en dos productos, **${PRODUCT_NAMES.ARTICULOS}** y **${PRODUCT_NAMES.REDES}**, cada uno con su propio inicio (/dashboard/articulos y /dashboard/redes), en lugar del grupo único Publicaciones. Las pantallas y sus direcciones son las mismas de siempre; el resto de las cuentas sigue viendo el menú de siempre. **Acceso por producto:** cuando Administración lo activa, si tu acceso gratuito a un producto está por terminar verás un aviso con la fecha de fin, y si ya terminó, esa sección te lo explicará y te indicará que contactes al administrador; tus datos no se pierden. Mientras Administración no lo active, no verás ningún aviso ni bloqueo. **Mi acceso:** con la vista por productos activa, en **Configuración → Mi acceso** (/dashboard/mi-acceso) puedes consultar, solo para leer, qué productos tiene tu cuenta (**${PRODUCT_NAMES.ARTICULOS}** y **${PRODUCT_NAMES.REDES}**) y su estado: activo, en gracia hasta una fecha, o sin acceso. Los cambios de acceso los realiza siempre el administrador; si necesitas uno, contáctalo.

**Publicaciones** no es una pantalla: es un grupo que se despliega. Dentro están cinco accesos relacionados con publicar y revisar tus resultados:

- **${MENU_NAMES.propios}** (/dashboard/publicar): escribe tus títulos y publícalos directamente en tu página web. Es la opción recomendada si estás comenzando y todavía no tienes registros de indexación en Google, o si quieres publicar contenido propio.
- **${MENU_NAMES.ia}** (/dashboard/oportunidades): SEO TOTAL analiza Google, Bing, Analytics y otras herramientas para encontrar temas con posibilidades reales y ayudarte a crear artículos para tu página web.
- **${MENU_NAMES.redes}** (/dashboard/oportunidades-redes): lleva tus artículos ya publicados a microblogs, blogs externos y redes sociales en lote, y crea tu avatar de autoridad en internet.
- **Progreso de las publicaciones** (/dashboard/publicaciones-en-curso): consulta qué artículos se están generando, publicando o esperando. Este acceso permanece en el menú.
- **Historial** (/dashboard/historial): revisa las publicaciones anteriores, sus resultados, errores e intentos.

En computadora, Publicaciones se abre al pulsarlo y se cierra al elegir una opción, al pulsar fuera o con la tecla Escape. En teléfono y tableta se abre desde el menú de hamburguesa situado arriba a la derecha; ahí aparecen las opciones de publicación, progreso, historial y estadísticas. El menú también contiene Configuración y Cerrar sesión.

En el menú, los tres primeros accesos aparecen numerados como «1) ${MENU_NAMES.propios}», «2) ${MENU_NAMES.ia}» y «3) ${MENU_NAMES.redes}», para reflejar el orden recomendado del flujo de trabajo.

Nombres anteriores: si una novedad antigua o una explicación vieja usa otro nombre, se refiere a la misma opción. **${MENU_NAMES.propios}** se llamó antes «${ANTES.propios[0]}» o «${ANTES.propios[1]}»; **${MENU_NAMES.ia}** se llamó «${ANTES.ia[0]}» u «${ANTES.ia[1]}»; y **${MENU_NAMES.redes}** se llamó «${ANTES.redes[0]}» u «${ANTES.redes[1]}». Al responder, usa siempre el nombre actual.

Si el administrador te oculta algún módulo, simplemente no aparece en el menú. Si te oculta los cuatro, el grupo Publicaciones desaparece entero.

## Configuración

### Día Cero

En Administración, el botón Día Cero muestra primero una simulación. Si todo es correcto, escribe DIA CERO y pulsa Activar Día Cero. Después crea la variable DIA_CERO con valor on en Vercel y vuelve a desplegar. Si algo sale mal, pulsa Revertir y borra la variable.

Ruta: /dashboard/configuracion

Configuración es un índice con tarjetas, cada una con su propia página. Elige
la que corresponda a lo que quieres cambiar. **Cómo funciona esta aplicación**
se encuentra dentro de Configuración y no debe aparecer como una barra de
pestañas dentro de las páginas de configuración.

### Configuración Inicial (Asistente Paso a Paso)

Ruta: /dashboard/configuracion/inicial

Repite el asistente de 4 pasos cuando quieras: cuenta de la plataforma,
categorías, idioma y Google Search Console.

### Cuenta

Ruta: /dashboard/configuracion/cuenta

Guarda el usuario y contraseña de tu cuenta de la plataforma (el sistema los
usa para publicar artículos en tu sitio; si no recuerdas esa contraseña, usa
el enlace de recuperación de la plataforma, no uses aquí la contraseña de
SEO TOTAL), sincroniza tus categorías con “Sincronizar categorías ahora” y
elige el idioma en que se redactan tus artículos con “Sincronizar idiomas de
tu cuenta”.

### Contenido

Ruta: /dashboard/configuracion/contenido

Aquí defines el estilo editorial de tus artículos: el estilo de redacción
por defecto, la firma que se agrega al final de cada artículo nuevo, tu
teléfono de contacto (para los botones de WhatsApp y llamada), hasta 3 fotos
tuyas y hasta 2 logos (solo la primera foto y el primer logo son
obligatorios; el resto es opcional y le da al sistema más variedad para
elegir — se usan cuando el generador de imágenes con IA para redes sociales
está activo en tu cuenta, lo activa el administrador).

**Firma y disclosure:** el campo de firma ahora se llama "Firma al Final del Artículo y Disclosure". Además de firmar profesionalmente, se recomienda incluir una aclaración legal (disclosure) indicando que no eres asesor en materias legales, fiscales, financieras o de seguros, con un ejemplo genérico como guía (con placeholders de nombre, profesión y estado/país, sin datos de personas reales).

**Ubicaciones para títulos geolocalizados:** escribe, separadas por comas,
las ciudades o países de donde son tus clientes reales (ej. "Colombia,
Bogotá, Ecuador, Caracas") y por separado dónde está u opera tu negocio (ej.
"Miami, Orlando, Homestead"). La publicación inteligente puede combinar ambos datos para
crear títulos ultra segmentados como "Cómo invertir en propiedades en
Homestead si vives en Colombia". Dejar los campos vacíos no cambia nada de
tu cuenta.

**Segmento de No Publicar:** escribe, separados por comas, los temas o
palabras que no quieres que la publicación inteligente tome en cuenta al proponer
títulos nuevos (ej. "seguros de vida, criptomonedas, política"). Cualquier
título que toque uno de esos temas se descarta automáticamente antes de
mostrarse, sin importar cuánta demanda real tenga. Dejarlo vacío no cambia
nada de tu cuenta.

### Buscadores

Puedes conectar Google Search Console y Bing Webmaster. Selecciona la propiedad o sitio correcto después de conectar la cuenta. Si Oportunidades te muestra «Falta conectar» en Google Search Console, el botón **Conectar GSC** te lleva directo a esa tarjeta en Conexiones. Estas conexiones permiten analizar contenido inteligente y, cuando la indexación está activada, enviar artículos a buscadores según la configuración disponible.

### Redes sociales

Desde Configuración puedes vincular los servicios disponibles, como Google Business Profile, Threads, X, LinkedIn, Instagram, Pinterest, Tumblr, Bluesky, DEV.to y Blogger. Algunas redes pueden requerir que el administrador habilite tu permiso de publicación. Conectar una red no obliga a publicar en ella: sirve para que puedas utilizarla cuando corresponda.

### Cómo conectar cada red social, explicado para cualquier persona

Si una red no aparece, primero pide al administrador que active el permiso correspondiente para tu usuario. Después sigue únicamente las instrucciones de esa red. Nunca escribas aquí tu contraseña de la red: cuando una conexión use OAuth, se abrirá la red para que autorices; cuando use una credencial manual, debes copiar solo el dato que se indica.

**Threads, Instagram, Facebook, LinkedIn, Pinterest y Tumblr:** abre la red en otra pestaña con la cuenta correcta iniciada, vuelve a SEO TOTAL y pulsa el botón de conexión. Sigue las pantallas de autorización y acepta los permisos. Si hay varias cuentas abiertas, cierra las que no quieras conectar. Pinterest te pide elegir el tablero donde se publicarán tus Pins (con imagen y enlace al artículo) y luego pulsar Aprobar y guardar; Tumblr puede pedirte elegir un blog. LinkedIn conecta el perfil que autorices. Instagram debe ser una cuenta profesional asociada a Facebook.

**X (Twitter):** el administrador configura primero el Client ID y Client Secret de la aplicación de X. Luego abre X con la cuenta correcta iniciada, vuelve a SEO TOTAL y pulsa “Conectar X (Twitter)”. Acepta los permisos y espera a volver a SEO TOTAL. No copies aquí tu contraseña.

**Bluesky:** entra en Bluesky y ve a Configuración → Privacidad y seguridad → Contraseñas de aplicación → Crear nueva App Password. Ponle “SEO TOTAL”, copia la App Password y escribe tu usuario completo, por ejemplo “nombre.bsky.social”. En SEO TOTAL pega ambos datos. No uses la contraseña principal de Bluesky.

**DEV.to:** entra en DEV.to → Settings → Extensions → API Keys. Crea una clave con un nombre como “SEO TOTAL”, copia la API key y pégala en la configuración de tu cuenta. Cada usuario debe conectar su propia cuenta de DEV.to; no se comparte la clave del administrador.

**Blogger:** conecta con la misma cuenta de Google que administra tu blog y, cuando se te pida, elige el blog donde quieres publicar. A diferencia de las demás redes, Blogger no recibe el artículo completo: recibe el título, la imagen destacada y un resumen breve escrito especialmente para ese lector, con un enlace para leer el artículo completo en tu sitio.

**Si aparece un error:** revisa primero que el permiso esté activado por el administrador, que estés usando la cuenta correcta y que no hayas copiado espacios al principio o al final. En Bluesky debe ser una App Password. Si sigue fallando, copia el mensaje exacto del aviso y envíalo al administrador; no envíes contraseñas ni tokens.

### Personalización del contenido

Puedes elegir tu idioma habitual de redacción, agregar una firma al final de los artículos y guardar teléfono de contacto para los botones de llamada o WhatsApp dentro de tus artículos. También puedes subir tu foto y logo para piezas de redes sociales y definir instrucciones para el estilo de imágenes e infografías. Además puedes indicar en dónde están tus clientes y en dónde está tu negocio para que la publicación inteligente cree títulos ultra geolocalizados combinando ambos datos, y escribir un Segmento de No Publicar con los temas que la publicación inteligente debe descartar siempre.

Consejo: escribe instrucciones de imagen sencillas y concretas; por ejemplo, el estilo visual, colores o tipo de público. Si las dejas vacías, se usa el estilo predeterminado.

## ${MENU_NAMES.propios}

Ruta: /dashboard/publicar

Usa **${MENU_NAMES.propios}** para convertir tus títulos en artículos. Los títulos los puedes poner de dos maneras, y las dos llegan al mismo lugar: la caja **Títulos**.

1. Elige una categoría. Es la sección de tu sitio donde se publicarán los artículos.
2. Elige el idioma del lote. Solo afecta ese lote; no modifica tu configuración general.
3. En la sección **Títulos** elige cómo quieres tenerlos:
   - **Poner títulos a mano:** escribe o pega un título por línea (por ejemplo, los que preparaste en otra herramienta).
   - **Crear con la IA del sistema:** pensada para quien empieza y todavía no tiene datos de Search Console, Analytics ni Bing. Escribe a quién le quieres escribir (cliente tipo), sobre qué tema, qué desea ese cliente, en dónde están tus clientes y en dónde está tu negocio. La IA propone hasta 9 títulos. Marca los que quieras (puedes marcar hasta tu cupo disponible), pulsa **Usar seleccionados** y se agregan a la caja Títulos para que los revises antes de publicar.
4. Revisa el contador. No puedes superar el máximo de títulos permitido para tu cuenta en un solo lote; divide la lista si es necesario.
5. Deja activada la indexación si quieres que los artículos se consideren para buscadores. Márcala como desactivada solo si no quieres indexar ese lote.
6. Pulsa “Iniciar”.

Sobre "Crear con la IA del sistema":
- Puedes hacer **3 solicitudes por día**; la pantalla te muestra cuántas te quedan ("Te quedan X de 3 solicitudes hoy") y se renuevan cada día.
- Lo que escribes en ese formulario solo sirve para esos títulos: **no cambia tu configuración** ni lo que guardaste en Configuración → Contenido.
- Los títulos que no marques se descartan y **no se te volverán a proponer**; tampoco se repiten los que ya creaste antes.
- La categoría es una de las que ya sincronizaste desde tu sitio. Si necesitas una nueva, créala primero en tu propia página o plataforma y luego sincroniza tus categorías.
- Si la IA no encuentra títulos nuevos, no se descuenta ninguna solicitud: prueba cambiando el tema o el tipo de cliente.
- Si ves "Esta función aún no está disponible", todavía no está activada en tu cuenta; mientras tanto puedes pegar tus títulos a mano.

Solo puede haber una ejecución activa a la vez. Si ya hay una, abre Progreso de las publicaciones y espera a que termine antes de iniciar otra.

## Progreso de las publicaciones

Ruta: /dashboard/publicaciones-en-curso

Esta pantalla muestra el avance de la ejecución actual. Úsala para saber si los artículos continúan procesándose. Si no hay una ejecución activa, puedes volver a **${MENU_NAMES.propios}** para iniciar una nueva.

## ${MENU_NAMES.ia}

Ruta: /dashboard/oportunidades

En este módulo el sistema te propone títulos de artículos. No se los inventa: los deduce de lo que Google ya te está mostrando. Google Search Console guarda lo que escribió la gente en el buscador antes de llegar a tu página, y de ahí salen las propuestas: de búsquedas reales, hechas por personas reales que ya llegaron a tu sitio.

Con eso se arman títulos de cola larga. Es más sencillo de lo que suena: en vez de pelear por una palabra corta y muy disputada como "seguros", donde compites contra empresas enormes, se apunta a la búsqueda larga y concreta de alguien con una duda real, del estilo "cuánto cuesta un seguro dental para mayores de 60 en Miami". Esas búsquedas las hace menos gente, pero casi nadie escribe sobre ellas, así que es mucho más fácil salir de primero, y quien busca así llega más decidido. Cada artículo que se posiciona atrae visitas nuevas, y esas visitas le dan más señales a Google sobre tu sitio. Es un efecto bola de nieve: empieza pequeño y va creciendo solo.

La pantalla está separada en tres pasos.

Paso 1, pide el análisis. Si tienes más de un sitio, eliges para cuál generar contenido y pulsas Analizar. Tarda unos minutos y no debes cerrar la página. Si te falta conectar Google Search Console, elegir la propiedad, sincronizar categorías o configurar el idioma, la propia pantalla te lo dice con un enlace directo a donde se arregla.

Paso 2, elige cómo se escribirán. Seleccionas el idioma de los artículos y el estilo de escritura. También puedes desactivar la indexación en buscadores, aunque por defecto queda activada, que es lo normal si quieres que Google los encuentre. Estas opciones solo afectan a lo que publiques desde esta pantalla; no cambian tu configuración general.

Paso 3, revisa y publica. Aparecen las propuestas agrupadas por categoría, con su explicación, impresiones y clics. Puedes eliminar los títulos que no te convenzan, publicar un título suelto, una categoría completa o todas de una vez. Respeta el máximo de títulos por lote: si una categoría lo supera, publícala en partes o elimina títulos antes. Si prefieres empezar de cero, el botón **Borrar todo el contenido pendiente** elimina de una vez todas las propuestas (pide confirmación antes de borrar y no se puede deshacer).

Nada se publica sin que tú lo mandes. Las sugerencias ayudan a decidir, pero la decisión es tuya: revisa que cada título sea adecuado para tu negocio y tu audiencia.

**Publicar en lote mixto de varias categorías a la vez:** cada título tiene una casilla de selección. Puedes marcar títulos de distintas categorías al mismo tiempo; en cuanto marcas alguno aparece el botón verde "Publicar selección" con un contador, que agrupa automáticamente por categoría y publica solo lo que elegiste, respetando los mismos cupos de siempre. Los títulos que no marques quedan sin tocar en el contenido inteligente.

## ${MENU_NAMES.redes}

**Este módulo está en prueba.** Todavía no está disponible para todas las cuentas: se está activando poco a poco. Si no aparece en tu menú, no es que te falte algo por configurar.

Ruta: /dashboard/oportunidades-redes

Aquí puedes revisar propuestas de contenido para redes sociales. Las propuestas pendientes se pueden aprobar, editar o descartar explicando el motivo. Si algo falla, abre el detalle del error para ver qué ocurrió antes de intentarlo otra vez. El botón **Borrar todas las oportunidades**, junto a "Publicar todo el lote", elimina de una vez todas las propuestas pendientes (pide confirmación antes de borrar y no se puede deshacer).

Consejo: edita el texto si necesitas adaptar el tono a tu marca antes de aprobarlo.

**Generar 1 propuesta por cada red conectada de una vez:** el botón "📲 Generar 1 por cada red (Todas)" crea, en un solo paso, una propuesta para cada red social que tengas conectada (en vez de generar red por red con los botones individuales, que siguen funcionando igual).

## Historial

Ruta: /dashboard/historial

Historial conserva las ejecuciones anteriores y el estado de los títulos. Puedes revisar cuáles se publicaron, cuáles tuvieron error y los mensajes asociados. También muestra información disponible sobre publicaciones en redes e intentos de indexación.

Si un artículo muestra un error, lee el mensaje antes de repetir la acción. Si el problema indica una conexión, revisa primero Configuración.

## Cómo funciona esta aplicación

Ruta: /dashboard/como-funciona

Explica en texto, sin gráficas, para qué sirve la plataforma y en qué orden ocurre todo. Sus instrucciones son informativas y no sustituyen las tres acciones principales de Inicio.

El objetivo es que te encuentren: en Google, en Bing y dentro de la inteligencia artificial, en tiempo récord.

Explica por qué ya no basta con salir en Google: hoy mucha gente le pregunta directamente a una inteligencia artificial y se queda con esa respuesta, que se construye con lo que la IA encontró indexado. Si tu sitio no está ahí, no aparece en la conversación.

También explica por qué las redes sociales cuentan para el posicionamiento: quien busca en Google es la misma persona que luego abre Instagram o LinkedIn. Por eso el sistema lleva a tus redes los temas que esa gente ya está buscando, y cada visita que vuelve desde ahí refuerza tu posición en el buscador.

Lo explica en tres pasos:

1. **Configura tu cuenta.** Es lo primero y lo único que no se puede saltar. Si no estás seguro de haberlo dejado todo listo, entra en Configuración y revísalo. Si algo no queda claro, la burbuja de ayuda está en la esquina de las pantallas.
2. **Usa una de las tres acciones de Inicio.** Desde **${MENU_NAMES.propios}** publicas tus propios títulos; desde **${MENU_NAMES.ia}** dejas que la IA proponga contenido basado en oportunidades de búsqueda; y desde **${MENU_NAMES.redes}** preparas publicaciones para redes sociales y blogs públicos.
3. **Revisa el resultado.** El progreso se consulta en Publicaciones → Progreso de las publicaciones, los artículos terminados en Historial y las métricas en Estadísticas.

Cierra explicando para qué sirve todo esto: posicionarte con autoridad en internet. Aparecer en los resultados de la inteligencia artificial, de Google y de Bing es lo más importante que le puede pasar a tu negocio en internet.

## Actualizaciones

Ruta: /dashboard/actualizaciones

Actualizaciones muestra las nuevas herramientas y correcciones explicadas sin tecnicismos. Puedes filtrar entre “Nuevas herramientas” y “Arreglos”. Cuando veas “Ir al módulo”, ese botón te lleva directamente al lugar donde puedes usar o comprobar el cambio.

Esta sección se actualiza con los cambios visibles para usuarios y es parte del conocimiento que usa el asistente de ayuda.

## Guía detallada de Configuración

Ruta: /dashboard/configuracion

Configuración es un índice de páginas independientes. Una barra de
navegación visible en todo momento, con la sección actual resaltada, te
permite moverte entre ellas sin volver primero al índice. Las redes sociales
y Google Business Profile se conectan en **Conexiones** (pestaña Difusión);
si una red no aparece allí, puede estar deshabilitada para tu cuenta por el
administrador.

### Configuración inicial

Ruta: /dashboard/configuracion/inicial

Puedes repetir el asistente de cuatro pasos cuando quieras: cuenta de la plataforma, categorías, idioma y Google Search Console. Es la forma más rápida de preparar una cuenta nueva.

### Google Search Console

Ruta: /dashboard/configuracion/indexacion

1. Pulsa **Conectar Google Search Console** e inicia sesión con la cuenta de Google que tiene acceso a tu sitio.
2. Cuando vuelvas a la plataforma, elige la propiedad verificada correcta en la lista y pulsa **Guardar propiedad**.
3. El sitemap se detecta automáticamente cuando es posible. Si no se encuentra, escribe su URL y guarda la configuración.
4. Puedes pulsar **Enviar sitemap ahora** para un envío inmediato. Después, SEO TOTAL lo envía automáticamente cada noche.

Google Search Console permite usar ${MENU_NAMES.ia}, consultar el estado de indexación y enviar el sitemap. Si no ves tu sitio en la lista, revisa que la misma cuenta de Google sea propietaria o usuaria autorizada de esa propiedad.

### Bing Webmaster Tools

Ruta: /dashboard/configuracion/indexacion

Abre Bing Webmaster Tools con tu sesión iniciada, vuelve a SEO TOTAL y pulsa **Nueva conexión**. Acepta los permisos y elige o guarda el sitio correcto. Al terminar de aceptar los permisos, Bing te devuelve automáticamente a esta misma pantalla (Configuración → Indexación). Si la conexión venció, usa **Nueva conexión** una sola vez y espera la redirección. Desde esta sección también puedes enviar el sitemap y enviar a Bing los artículos publicados que todavía estén pendientes de indexación.

### Redes sociales

Esta página se retiró: si entras a la dirección antigua (/dashboard/configuracion/redes-sociales) te lleva automáticamente a **Configuración → Conexiones → Difusión**. Allí conectas Google Business Profile y todas las redes, cada una con su tarjeta, sus pasos y las mismas acciones (Nueva conexión, Probar conexión, Desconectar). Las redes son opcionales: solo conéctalas si quieres publicar allí. Instagram necesita una cuenta profesional vinculada a una página de Facebook. Algunas redes requieren que el administrador active tu permiso; si ves un aviso de que no está disponible, pide acceso al administrador.

### Cuenta

Ruta: /dashboard/configuracion/cuenta

Guarda las credenciales de la plataforma, sincroniza categorías e idiomas y elige el idioma habitual de redacción.

### Contenido

Ruta: /dashboard/configuracion/contenido

Define la firma de los artículos, teléfono de contacto, hasta 3 fotos tuyas y hasta 2 logos, el estilo de redacción por defecto, las ubicaciones para títulos geolocalizados, y el Segmento de No Publicar. Solo la primera foto y el primer logo son obligatorios; el resto es opcional y le da al sistema más variedad para elegir. Estas imágenes se usan cuando el generador de imágenes con IA para redes sociales está activo en tu cuenta (lo activa el administrador).

El campo de firma se llama "Firma al Final del Artículo y Disclosure": además de tu firma, se sugiere agregar una aclaración legal (disclosure) que indique que no eres asesor en materias legales, fiscales, financieras o de seguros.

**Ubicaciones para títulos geolocalizados:** escribe, separadas por comas, las ciudades o países de donde son tus clientes reales (ej. "Colombia, Bogotá, Ecuador, Caracas") y por separado dónde está u opera tu negocio (ej. "Miami, Orlando, Homestead"). La publicación inteligente puede combinar ambos datos para crear títulos ultra segmentados como "Cómo invertir en propiedades en Homestead si vives en Colombia". Dejar los campos vacíos no cambia nada de tu cuenta.

Paso a paso para usarlo:
1. Entra a Configuración → Contenido (esta sección).
2. En "¿En dónde están tus clientes?" escribe las ciudades o países de tus clientes reales, separados por comas.
3. En "¿En dónde está tu negocio?" escribe las ciudades donde operas o vendes, separadas por comas.
4. Presiona "Guardar ubicaciones".
5. Ve a ${MENU_NAMES.ia}. Si ya tenés propuestas pendientes de antes, publícalas o elimínalas primero (el sistema no deja analizar de nuevo con pendientes sin resolver).
6. Presiona "Analizar contenido" (o "Actualizar análisis" si ya corriste uno antes).
7. Revisa los resultados: los títulos geolocalizados aparecen mezclados con el resto de las propuestas, organizados por categoría, combinando explícitamente una ubicación de cliente con una de negocio (ej. "si vivo en Colombia").

Si dejás cualquiera de los dos campos vacío, esta combinación no se genera — necesita ambas listas llenas. Cuantas más ubicaciones pongas en cada campo, más combinaciones intenta cubrir el sistema (por ejemplo, 4 ciudades de clientes × 3 de negocio = hasta 12 combinaciones), siempre que tengan sentido real para tus categorías.

**Segmento de No Publicar:** en el campo "Temas a excluir" escribe, separados por comas, los temas o palabras que no quieres que la publicación inteligente tome en cuenta al proponer títulos (ej. "seguros de vida, criptomonedas, política") y presiona "Guardar segmento de no publicar". Cualquier título nuevo que toque uno de esos temas se descarta automáticamente antes de mostrarse en el contenido inteligente, sin importar cuánta demanda real tenga. Dejarlo vacío no cambia nada de tu cuenta.

### Asistentes IA

Ruta: /dashboard/configuracion/mcp

Conecta cualquier asistente de inteligencia artificial (Claude, ChatGPT, Meta MUSE, u otro) directamente a tu cuenta, para consultar tu información, crear títulos con IA y publicar artículos hablando o escribiendo con él. La pantalla muestra la lista actualizada de todo lo que el asistente puede hacer hoy.

1. Pulsa **Generar token** (o **Regenerar token** si ya tenías uno; el anterior deja de funcionar de inmediato).
2. El valor del token solo se muestra una vez, en el momento de generarlo — cópialo con el botón **Copiar token**. Si lo pierdes, genera uno nuevo.
3. Copia también el bloque de **Prompt para tu asistente** con el botón **Copiar prompt**, y pégalo como instrucciones (o primer mensaje) de tu asistente de IA. Ese texto ya incluye la dirección del servidor, el token, la lista de herramientas disponibles y las reglas de seguridad: nunca publica nada sin mostrarte antes qué va a hacer y pedirte confirmación explícita.
4. Pulsa **Revocar** si quieres desconectar todos los asistentes sin generar uno nuevo.

La protección de publicación no depende solo de las instrucciones del asistente:
cada vista previa genera un comprobante temporal, ligado a tu cuenta y a la
operación exacta. Para publicar, el asistente debe presentar ese comprobante;
vence a los 10 minutos y solo puede usarse una vez. Las acciones de borrar,
cancelar o reintentar siguen el mismo patrón.

Entre lo que puede hacer un asistente conectado: consultar oportunidades,
categorías, idiomas, integraciones, límites, historial, detalles de
publicaciones, preferencias, indexación y propuestas sociales; usar "Crear con
la IA del sistema" para proponer títulos nuevos; publicar, descartar,
cancelar, reintentar y publicar propuestas sociales con tu confirmación
explícita; y darte el enlace real de cada artículo ya publicado.

Desde que conectas tu token, el asistente abre la conversación ofreciéndote directamente el mismo menú numerado de opciones que ves en Inicio, en vez de empezar con una pregunta abierta. Además, siempre te explica las cosas en lenguaje cotidiano: nunca te va a hablar de nombres técnicos de herramientas, tokens, APIs ni del estado interno de su conexión — si algo le falta a tu cuenta, te dice qué botón tocar en la web. Si no sabe cómo guiarte en algo puntual, consulta el manual real de la plataforma (el mismo que usa este bot de ayuda) antes de inventar una respuesta.

### Estado de configuración

Inicio muestra una lista de progreso con lo obligatorio y opcional. Para publicar necesitas credenciales de la plataforma, categorías sincronizadas e idioma. Google, Bing y redes sociales amplían lo que puedes hacer, pero no impiden publicar artículos.

## Publicaciones, progreso e historial

### Mientras se publica

Ruta: /dashboard/publicaciones-en-curso

Aquí ves cada lote activo y el estado de cada título. Puedes cancelar el lote completo si ya no deseas continuarlo. Cuando un título muestra un error, usa **Reintentar** solo después de leer el mensaje y corregir la causa, por ejemplo una conexión vencida o una configuración incompleta.

### Historial

Ruta: /dashboard/historial

Historial agrupa las ejecuciones por categoría y conserva los resultados de publicación, errores, reintentos, indexación y redes cuando están disponibles. Puedes borrar el historial terminado si ya no lo necesitas; esa acción no se puede deshacer y no cancela un lote que esté en curso.

Sobre publicaciones en redes sociales, Historial tiene además dos botones separados, ambos con confirmación previa y sin poder deshacerse: **Borrar descartadas** elimina solo las publicaciones sociales que marcaste como descartadas, y **Borrar sin confirmar** elimina solo las que quedaron sin confirmar (no toca las pendientes, publicadas ni descartadas).

## ${MENU_NAMES.redes}

Ruta: /dashboard/oportunidades-redes

Este módulo propone textos para publicar en las redes que tengas conectadas. Puede usar datos de Google Search Console cuando está conectado; si no, trabaja con artículos recientes. Revisa cada propuesta, edítala si quieres, guarda los cambios y luego apruébala o descártala explicando el motivo. Antes de publicar, puedes revisar una vista previa cuando esté disponible.

Para Instagram puedes proponer Story, Post (imagen normal de feed), Reel-image, Carrusel e Infografía. Para Facebook Page, además del post normal, también hay Historia (Story). Si tu cuenta tiene activado el generador de imágenes con IA (lo activa el administrador), la imagen de Story/Post/Historia se genera a partir de la imagen del artículo, tu logo y tu foto de perfil en vez de usar la imagen del artículo tal cual.

## Interfaz y Diseño Estilo Apple

La plataforma cuenta con un diseño minimalista y limpio en blanco impecable, siguiendo los estándares de Apple Human Interface Guidelines (HIG):
- **Tipografía y Legibilidad:** Textos de alto contraste con tipografía nativa San Francisco para una lectura cómoda.
- **Navegación Fluida:** Menú superior tipo cápsula *Segmented Control* en computadoras y selector táctil optimizado en celulares y tabletas.
- **Full Responsivo:** Todas las tablas, formularios y tarjetas se adaptan automáticamente a cualquier tamaño de pantalla sin desbordes.

## Pre-Validación Inteligente antes de Publicar

Tanto en **${MENU_NAMES.propios}** (/dashboard/publicar) como en **${MENU_NAMES.ia}** (/dashboard/oportunidades), el sistema cuenta con un panel de protección preventiva (**PreValidationGuard**):
- Si falta algún requisito previo (credenciales de la plataforma, categorías sincronizadas, idioma de redacción o Search Console), la plataforma te muestra una tarjeta clara con un checklist interactivo indicando exactamente qué falta y un botón directo para resolverlo.
- **Créditos de imagen:** Si ya recibiste créditos, pulsa **Ya recibí mis créditos** para intentar publicar de inmediato y para que el sistema deje de mostrarte el aviso. Esa confirmación queda guardada en tu cuenta (no solo en la pantalla actual), así que no debería reaparecer al refrescar, ni en otra pestaña o dispositivo. El aviso solo vuelve a aparecer cuando una creación de artículo comprueba, tras agotar los reintentos, que 10minutesWebsite realmente se quedó sin créditos — nunca por errores pasajeros o visitas a la pantalla.

## Administración

Ruta: /dashboard/usuarios

Solo los administradores tienen acceso a este módulo:
- **Orden alfabético A-Z:** La lista de usuarios se organiza de forma clara y ordenada alfabéticamente por nombre.
- **Filtros por Tipo de Cuenta:** Permite filtrar instantáneamente entre *Todos los tipos*, *Usuarios comunes*, *Administradores* y usuarios en periodo de *Free Trial (Prueba Gratuita)*, combinándose con la barra de búsqueda en tiempo real.
- **Visibilidad de Módulos:** Permite ocultar o activar módulos específicos de forma individual por usuario o de manera global para mantenimiento.
- **Prompts:** además de los estilos de redacción de artículos, incluye el prompt del generador de imágenes con IA para redes sociales — es global (aplica a todas las cuentas), se edita ahí mismo y no necesita ningún cambio de código para actualizarse.
- **PROMPT PUBLICACIONES PROPIAS:** en la misma pestaña Prompts está el prompt maestro con el que la IA crea títulos cuando un usuario elige "Crear con la IA del sistema" en **${MENU_NAMES.propios}**. Solo el administrador lo ve y lo edita; los usuarios no. Mientras esté vacío, esa opción aparece desactivada. Debajo de la caja se listan las variables que se pueden usar (por ejemplo, la del cliente tipo, el tema o las ubicaciones) y, al guardar, se avisa si escribiste alguna que no existe.
- **Cifras clicables:** debajo del título hay una fila con 5 cifras (Usuarios totales, En prueba, Activos, Conectados ahora, Publicaciones totales). Al hacer clic en cualquiera, la lista de la pestaña "Accesos a usuarios" se filtra automáticamente por ese criterio.
- **Pestañas:** Accesos a usuarios, Creación de usuarios, Uso de la base de datos, Visibilidad de módulos y Prompts.
- **Ficha de cada usuario:** al abrir una cuenta se ve en secciones: *Cuenta* (teléfono, dominio, servidor, credenciales, foto y logo), *Acceso* (rol, prueba gratuita y módulos), *Difusión: redes sociales y blogs*, *Imágenes con IA*, *Límites de artículos*, *Acciones de la cuenta* (Acceder como, Copiar credenciales, Editar, Eliminar) e *Historial*.
- **Guardar cambios:** los permisos, la prueba gratuita, los créditos de imagen, los módulos y los límites de las redes se guardan juntos con la barra **Guardar cambios** que aparece abajo de la ficha cuando hay algo sin guardar. **Descartar** devuelve todo a como estaba. Los límites de artículos, el rol y el servidor tienen su propio botón Guardar junto al campo.
- **Dos controles de cantidad, separados:** *Límites de artículos* (cuántos artículos puede crear la cuenta: por mes, por día y por lote) y *Difusión* (cuántas publicaciones por día en cada red y blog).
- **Límites diarios de difusión (redes sociales y blogs):** en la sección *Difusión: redes sociales y blogs* cada red tiene su aprobación y, por cada formato (por ejemplo Instagram: Publicación, Carrusel, Reel, Story e Infografía), cuántas publicaciones puede hacer la cuenta por día. Si no hay un valor guardado, el límite es 1 por día; 0 bloquea ese formato. Junto a cada número se ve cuántas se han publicado hoy y avisa cuando el cupo del día está completo.
- **Módulo de Redes (interruptor superior, 1/10/2026):** arriba de la lista de redes, en la misma sección *Difusión: redes sociales y blogs*, hay un selector que controla el acceso de la cuenta a la pantalla DIFUSIÓN SOCIAL completa, antes de decidir qué redes concretas puede usar. **Heredar** (el valor de siempre) da acceso en cuanto la cuenta tenga al menos una red aprobada abajo. **Habilitado para esta cuenta** da acceso aunque todavía no haya ninguna red aprobada — útil para aprobar el módulo primero y elegir las redes después. **Deshabilitado para esta cuenta** quita el acceso aunque tenga redes aprobadas. Se guarda con el mismo **Guardar cambios** de la ficha. El botón **${MENU_NAMES.redes}** del Inicio y de Configuración se ve siempre, tenga o no acceso la cuenta (pedido explícito de Milton, 1/10/2026, para no confundir con un botón que aparece y desaparece); si no tiene acceso, al pulsarlo ve el aviso "Esta sección todavía no está disponible para tu cuenta" en vez de la pantalla.
- **Botones "Configurar" dentro de DIFUSIÓN SOCIAL (1/10/2026):** cuando la cuenta ya tiene acceso al módulo pero todavía no conectó una red, esa red aparece en gris con el texto "Configurar [red]" en vez del botón normal de crear propuesta. Al pulsarlo, lleva directo a la tarjeta de esa red en Conexiones; ahí aparece un botón **"← Volver a ${MENU_NAMES.redes}"** que trae de regreso a esta pantalla, incluso después de completar la autorización de la red (Pinterest, Facebook, etc.).
- **Composio (/dashboard/composio):** conecta la plataforma con Composio, un servicio que más adelante permitirá a los clientes conectar sus cuentas de Google y Meta sin las restricciones de una app en prueba. Por ahora el módulo solo prepara la conexión: se pega la clave de API de proyecto de Composio (se comprueba con Composio antes de guardarse, se guarda cifrada y nunca se vuelve a mostrar completa), se registra el "auth config" de cada app (Search Console, Analytics, Facebook, Instagram y Pinterest, cada uno se comprueba antes de guardarse) y se pueden consultar las cuentas conectadas en el proyecto. Todavía no cambia la forma en que se conectan los clientes: sus conexiones actuales siguen funcionando igual. Al eliminar la clave también se eliminan los auth configs. También muestra **Vía de conexión por app**: una tabla con Search Console, Analytics, Facebook e Instagram, el interruptor Propia / Composio de cada una y cuántos clientes están conectados por cada vía. Por ahora el interruptor está bloqueado en «Propia» y no cambia nada para los clientes; el cambio de vía se activará en una fase posterior. La pantalla **Conexiones** (Configuración → Conexiones, /dashboard/configuracion/conexiones) reúne en un solo lugar todas las conexiones, con dos botones: **ANALÍTICAS** (Search Console, Analytics y Bing) y **DIFUSIÓN** (Business Profile, Facebook, Instagram, Threads, LinkedIn, Pinterest, Bluesky, Tumblr, Blogger y Dev.to). Es opt-in: aparece solo para los administradores y para las personas a las que se les ponga «Habilitado» en Administración → Usuarios → módulos («Conexión por Composio»); las demás siguen con «Indexación y SEO» y «Redes Sociales» sin cambios. Dentro de cada red conectable por Composio (Search Console, Analytics, Facebook, Instagram y Pinterest; Pinterest se prueba solo con las personas del piloto hasta abrirla a todos) se puede conectar, elegir y aprobar el sitio, la propiedad, la Página o la cuenta, probar la conexión y desconectarla; sus conexiones actuales no cambian. Composio no publica Stories de Facebook; las de Instagram están en prueba.

Actualización (2026-09-25): si una cuenta ya tenía conectados Google Search
Console o Google Analytics por la vía anterior (no por la nueva conexión), en Inicio
puede aparecer un aviso rojo pidiendo reconectar: primero «PASO 1 DE 2 ·
Google Search Console» («SOLICITUD DE ACTUALIZACIÓN: Debes reconectar Google
Search Console mediante Conexiones») y, solo si esa cuenta también tenía
Google Analytics conectado por la vía anterior, después «PASO 2 DE 2 ·
Google Analytics» con el mismo tipo de aviso. El aviso incluye un botón
**Reconectar ahora** que lleva directo a la pantalla de esa conexión dentro
de Conexiones, donde además se indica «Debes reconectar ahora. Pulsa «Nueva
conexión» y autoriza el acceso.». Mientras no se complete la reconexión, la
conexión anterior sigue funcionando como respaldo. Al terminar la
reconexión aparece una pantalla estática de **Conexión exitosa** con un
único botón **Volver al Inicio**; una vez reconectada esa red, su aviso
desaparece de Inicio. Además, ni Facebook ni Instagram con la nueva conexión generan
o muestran Stories (ya no es solo Instagram "en prueba": ninguna de las dos
las ofrece por esta vía, para evitar errores de publicación).

Actualización (2026-09-26): en las pantallas de conexión de Search Console,
Analytics, Facebook e Instagram, cuando hay que elegir el sitio, la propiedad,
la Página o la cuenta, ahora se elige de una lista desplegable ordenada (solo
se puede elegir una; la recomendada aparece primero y las que no se pueden
elegir aparecen al final con el motivo). La pantalla de **Conexión exitosa**
muestra el nombre y el código de lo que elegiste. En Search Console, al
guardar, SEO TOTAL revisa si Google ya tiene el sitemap de tu sitio: si ya
está, te lo indica; si no, lo envía y te lo confirma en esa misma pantalla (si
no se pudo enviar en ese momento, se enviará en el envío diario). Con una
conexión ya activa se ocultan los pasos de "Cómo hacerlo" y **Probar conexión**
responde con un mensaje corto con tu propiedad, sin mostrar otras cuentas.
Todas las pantallas de una conexión tienen el botón **Volver al menú de
Conexiones**. Si algo falla, los mensajes se muestran en español y explican qué
hacer; por ejemplo, si al conectar Google desmarcaste un permiso, se te pide
volver a conectar y dejar marcadas todas las casillas.

Actualización (2026-09-26, 2): las pantallas de Facebook e Instagram dentro de
Conexiones funcionan igual que las de Search Console y Analytics: una tarjeta
con los pasos para conectar, la elección de la Página o de la cuenta en una
lista desplegable, la pantalla de **Conexión exitosa** con el nombre y el
código de lo que elegiste, **Probar conexión** y **Volver al menú de
Conexiones**. Instagram publica imágenes con texto y Facebook publica en la
Página que elijas; ninguna de las dos publica Stories. En **Historial**, el
enlace **Ver en la red social** solo aparece cuando la publicación tiene un
enlace público; si no lo tiene, no se muestra. En Instagram, las publicaciones
nuevas guardan su enlace al publicarse y las antiguas lo consultan la primera
vez que pulsas **Ver en la red social**. El aviso rojo de reconexión
solo aparece para cuentas que ya tenían Search Console o Analytics conectados
por la vía anterior; una cuenta nueva conecta desde el asistente inicial.

Actualización (2026-09-26, 3): al volver de autorizar Threads, LinkedIn,
Pinterest, Tumblr o Blogger, ahora regresas a la pantalla de esa conexión
dentro de Conexiones. Si salió bien, en Threads y LinkedIn verás la pantalla
de **Conexión exitosa** con el botón **Volver al Inicio**; en Pinterest,
Tumblr y Blogger verás un aviso para elegir dónde se publicará. Si algo falla,
aparece un aviso claro que te dice qué hacer. Los errores de publicación en
**Historial** también se muestran en español y explican el paso a seguir (por
ejemplo, volver a conectar la red cuando la autorización venció).

Actualización (2026-09-26, 4): Bluesky y DEV.to ahora siguen el mismo patrón
que Search Console y Analytics: una tarjeta con los pasos de **Cómo hacerlo
paso a paso**, el botón **Conectar**, la pantalla de **Conexión exitosa** al
terminar y, cuando ya están conectadas, los botones **Cambiar**, **Probar
conexión** y **Desconectar**. **Probar conexión** comprueba en el momento que
la cuenta sigue funcionando y te responde con un mensaje corto; si algo falla,
te dice qué hacer (por ejemplo, volver a conectar).

Actualización (2026-09-26, 5): Threads, LinkedIn, Pinterest, Tumblr y Blogger
siguen ahora el mismo patrón que Search Console y Analytics. Cada una tiene su
tarjeta con **Cómo hacerlo paso a paso**, el botón **Nueva conexión**, la
elección de dónde se publicará (tablero en Pinterest, blog en Tumblr y
Blogger) con **Aprobar y guardar**, la pantalla de **Conexión exitosa** y, ya
conectadas, los botones **Cambiar**, **Probar conexión** y **Desconectar**. Si
la autorización venció, la tarjeta te lo dice y te pide pulsar **Nueva
conexión** para renovarla. **Google Search Console** y **Google Analytics** se pueden conectar, cambiar y **Desconectar** desde cualquier cuenta activa, sin permiso especial del administrador. Si tu cuenta tiene guardado el nombre de un panel (por ejemplo «Español») en lugar de un dominio, la lista de Search Console y de Analytics muestra todas tus propiedades con permiso de propietario o usuario completo, y tú eliges la tuya; si tiene un dominio real, solo se puede elegir el sitio que coincide con él. Los datos técnicos de la aplicación (claves) los ve
y edita solo el administrador, en un bloque aparte.

Actualización (2026-09-26, 6): **Google Business Profile** ahora tiene su propia
tarjeta en Conexiones (Difusión) con el mismo patrón que las demás: **Cómo
hacerlo paso a paso**, **Nueva conexión**, la pantalla de **Conexión exitosa**,
**Probar conexión** y **Desconectar**. **Bing Webmaster Tools** también usa las
mismas etiquetas y guía (**Nueva conexión**, **Aprobar y guardar**, **Probar
conexión**, **Desconectar**); su envío nocturno de sitemap y su indexación no
cambian.

Actualización (2026-10-01): el aviso rojo «Reconectar Google Search Console»
de Inicio ahora también aparece en un segundo caso, distinto al de arriba:
cuando la conexión actual sigue activa pero Google rechazó el último uso
real (por ejemplo al pulsar "Analizar contenido" en ${MENU_NAMES.ia}) con un
error concreto, como haber perdido el permiso de propietario verificado
sobre esa propiedad. En ese caso la descripción del aviso incluye el motivo
exacto que devolvió Google, y desaparece sola en cuanto se reconecta esa
propiedad desde Conexiones.

## Problemas frecuentes

### No puedo publicar

Comprueba que tienes categorías sincronizadas, un idioma elegido y que no hay otra ejecución en curso. Revisa también que no superes el máximo de títulos por lote. El panel de pre-validación te indicará qué requisito falta.

### Aviso de falta de créditos de imagen

Si aparece el aviso de créditos de imagen, significa que la pantalla todavía no reconoce saldo para ilustrar artículos. Si ya te los asignaron, pulsa **Ya recibí mis créditos** y vuelve a intentar. Si la operación sigue detenida, solicita créditos o consulta a soporte.

### Un título falla porque la categoría ya no existe

Si un título falla y el mensaje explica que la categoría ya no existe en tu sitio (por ejemplo, porque se borró o se renombró desde la última vez que sincronizaste), entra a Configuración → Cuenta y pulsa "Sincronizar categorías ahora" para refrescar la lista, y luego vuelve a intentar ese título.

### No veo ${MENU_NAMES.ia}

En Configuración conecta Google Search Console, selecciona una propiedad, sincroniza categorías y guarda un idioma de redacción. Luego vuelve a **${MENU_NAMES.ia}** para analizar.

### No se publica en una red social

Comprueba en Configuración que la cuenta esté conectada. Algunas redes requieren permiso del administrador. Consulta Historial para revisar el detalle del error antes de volver a intentar.

### No aparece un módulo en el menú

El administrador puede ocultar módulos por cuenta o temporalmente para toda la plataforma. Pregunta al administrador si necesitas acceso.

## Cómo debe ayudarte el asistente

El asistente debe explicar los pasos de forma breve y clara, enlazar al módulo cuando tenga una ruta confirmada y no prometer funciones que no figuren en este manual ni en el registro vivo de Actualizaciones. Debe priorizar el registro vivo cuando una novedad cambie una instrucción del manual base. Si no tiene información suficiente, debe decirlo y sugerir contactar al administrador.
`.trim();
