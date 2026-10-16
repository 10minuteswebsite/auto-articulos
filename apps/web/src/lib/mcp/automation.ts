/**
 * Publicación automática y recurrente con el asistente de IA del usuario
 * (ChatGPT, Claude, Muse u otro). SEO TOTAL no tiene programador propio: el
 * asistente crea las tareas recurrentes en SU lado y, en cada ejecución, usa
 * estas herramientas. Este texto es la única fuente de ese flujo: lo usan el
 * prompt copiable de Configuración → Asistentes IA y el flujo con nombre
 * `programar_publicaciones`, para que no se contradigan.
 *
 * Objetivo de Milton (14/10/2026): que la persona haga lo menos posible. Dice
 * una vez «un artículo a las 7, otro a las 12 y otro a las 19» y el asistente
 * lo deja funcionando solo, incluso reponiendo oportunidades cuando se acaban.
 */
export const MCP_AUTOMATION_RULES = `PUBLICACIÓN AUTOMÁTICA: mi objetivo es hacer lo mínimo. Cuando te diga cuántos artículos quiero y a qué horas (por ejemplo «uno a las 7:00, otro a las 12:00 y otro a las 19:00»), crea tareas recurrentes en tu asistente, una por horario, y déjalas activas todos los días hasta que yo diga «detente». Si no te digo horarios, usa 07:00, 12:00 y 19:00 según mi zona horaria. Puedo cambiar horarios, cantidad o pausar cuando quiera; aplícalo sin hacerme más preguntas. Si tu asistente no puede crear tareas programadas, dímelo claramente y no prometas que se cumplirán.

PREPARACIÓN (solo una vez): antes de dejar las tareas activas, reúne lo que necesitas con ver_estado_configuracion, listar_categorias y ver_preferencias_contenido. Hazme como máximo UNA pregunta, y solo si falta algo imprescindible que no puedes ver en mi cuenta: el tipo de cliente, el tema de mi negocio y qué busca el cliente (los usarás si hay que crear títulos con IA). Guarda esas respuestas dentro de las instrucciones de cada tarea para no volver a preguntarlas.

EN CADA EJECUCIÓN, sin pedirme aprobación:
1. Llama ver_estado_configuracion. Si falta algo obligatorio (credenciales, categorías, idioma, créditos de imagen), dímelo en una frase con el botón que debo tocar y termina esa ejecución; no insistas ni reintentes.
2. Llama ver_limites_y_creditos. Si el cupo del día está agotado, dímelo y termina; no reintentes.
3. Llama listar_oportunidades. Si hay títulos pendientes, elige UNO (alterna entre categorías para variar) y publícalo con publicar_oportunidades_seleccionadas: primero confirmar=false para obtener el comprobante y, en el mismo turno, confirmar=true con ese comprobante.
4. Si NO quedan títulos pendientes, repón antes de publicar: si ver_integraciones muestra Search Console conectado, usa crear_oportunidades (no repitas el análisis antes de 3 días); si Search Console no está conectado, o crear_oportunidades responde que no puede o que ya se hizo, usa crear_titulos_con_ia con la categoría que tenga menos títulos pendientes y mis datos guardados, y publica uno con publicar_titulos_en_categoria (mismo método: confirmar=false y luego confirmar=true). Hay un máximo de 3 usos de crear_titulos_con_ia por día: si se acaba, dilo.
5. Llama estado_de_publicaciones y avísame en una sola línea: título, estado y enlace real. Si todavía se está generando, dilo así, no inventes el enlace.

ESTILO DE ESCRITURA: los artículos se escriben con el estilo de mi cuenta. Si te pido uno concreto (STANDARD, comparativos, estadísticos, guías o problema-solución), úsalo con el parámetro estilo al publicar; confirma los nombres con listar_estilos_escritura. Si no te pido ninguno, no lo cambies y no lo menciones. Puedes cambiar el estilo por defecto de mi cuenta con cambiar_estilo_escritura_por_defecto, pero SOLO si yo te lo pido, y pídeme confirmación antes de hacerlo (afecta a todos mis artículos, también en la web). Si quiero un estilo solo para un artículo, usa el parámetro estilo y no cambies el de la cuenta.

SI ALGO FALLA: dime qué falló en lenguaje cotidiano y qué botón tocar, y no finjas que publicaste. Si la conexión caducó o pide autorizar de nuevo, avísame para que lo haga yo; no te quedes en silencio ni desactives las tareas por tu cuenta. Nunca me pidas contraseñas ni tokens en el chat.`;

/**
 * Redes y blogs (redes.lasolucionweb.com): generar propuestas por nombre o en
 * grupo, publicarlas y, si la persona lo pide, dejarlo recurrente. Mismo
 * criterio que `MCP_AUTOMATION_RULES`: una sola fuente para el prompt copiable
 * y para los flujos con nombre `publicar_en_redes` y `automatizar_redes`.
 *
 * Reglas de Milton: el cupo diario limita PUBLICACIONES, no propuestas; se
 * publica una propuesta por red en cada pedido; las anécdotas que inventa la
 * IA en los textos están aprobadas (no son un problema).
 */
export const MCP_SOCIAL_RULES = `REDES Y BLOGS: puedes generar propuestas y publicarlas por el nombre de la red (Facebook, Instagram, LinkedIn, Threads, Pinterest, Tumblr, Bluesky, Blogger, Google Business) o en todas a la vez. Cuando te pida publicar en redes, sigue este orden sin pedirme aprobación en cada paso:
1. Llama ver_redes_sociales: te dice qué redes tengo conectadas, cuántas propuestas pendientes hay y el cupo de hoy. Las redes «sin conectar» se conectan en la web; avísame y sigue con las demás.
2. Para cada red pedida que no tenga una propuesta pendiente, llama generar_propuestas_sociales con esas redes por nombre (o sin nombres para todas las conectadas). Esto solo crea propuestas, no publica. Si no tengo artículos publicados todavía, dímelo: primero hay que publicar un artículo.
3. Llama publicar_propuestas_sociales con las redes por nombre: primero confirmar=false para obtener el comprobante y, en el mismo turno, confirmar=true con ese comprobante. Publica una propuesta por red. Si una red ya llegó a su cupo de hoy, dímelo y sigue con las demás.
4. Llama listar_propuestas_sociales y avísame en pocas líneas: red, estado y enlace real. Si algo sigue en proceso, dilo así; no inventes enlaces. No reescribas los textos que generó la plataforma.
Si una propuesta quedó en error (por ejemplo una red con la autorización vencida), dime qué red es: yo la reconecto en la web, en Configuración → Conexiones, y luego tú la reintentas con publicar_propuestas_sociales y reintentar=true. Para cancelar una propuesta (cancelar_propuesta_social) o borrar pendientes (eliminar_propuestas_sociales) pídeme confirmación. El cupo diario limita las publicaciones, no las propuestas. Nunca me pidas contraseñas ni tokens en el chat.`;

export const MCP_SOCIAL_AUTOMATION_RULES = `${MCP_SOCIAL_RULES}

PUBLICACIÓN AUTOMÁTICA EN REDES (solo si te lo pido): cuando diga algo como «publica en Facebook a las 9:00 y en LinkedIn a las 12:00» o «todos los días en todas mis redes», crea una tarea recurrente por horario (o una sola si es la misma hora para varias redes) y déjalas activas todos los días hasta que yo diga «detente». Si no te digo horario, usa las 10:00 según mi zona horaria. Puedo cambiar redes, horarios o pausar cuando quiera. Si tu asistente no puede crear tareas programadas, dímelo claramente y no prometas que se cumplirán. En cada ejecución haz los 4 pasos de arriba solo para las redes de esa tarea. Si falla algo o la conexión caduca, avísame con claridad y no finjas que publicaste. No borres propuestas por tu cuenta.`;
