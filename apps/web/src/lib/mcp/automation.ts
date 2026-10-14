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

SI ALGO FALLA: dime qué falló en lenguaje cotidiano y qué botón tocar, y no finjas que publicaste. Si la conexión caducó o pide autorizar de nuevo, avísame para que lo haga yo; no te quedes en silencio ni desactives las tareas por tu cuenta. Nunca me pidas contraseñas ni tokens en el chat.`;
