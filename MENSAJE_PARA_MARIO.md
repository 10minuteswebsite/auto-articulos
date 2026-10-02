# Mensaje para Mario — cómo quedó SEO Total y cómo encaja con el HUB

Hola Mario:

Milton me pidió que te cuente, con calma, qué hemos hecho en SEO Total y cómo quedó lo que hablasteis. Esto **no son órdenes**: es cómo está construido SEO Total para que el HUB se adecue. Si algo no encaja con lo tuyo, dínoslo.

## 1. El objetivo

Hoy SEO Total es una sola aplicación. Se divide en **dos productos**: **SEO Total Artículos** y **SEO Total Redes**, cada uno con su dirección: `articulos.lasolucionweb.com` y `redes.lasolucionweb.com`. El HUB maneja a las **personas** y da **permiso sí o no por producto**. Todo lo de dentro (módulos, permisos de cada red) lo maneja SEO Total.

## 2. Lo que ya está hecho (en producción, apagado, nadie lo nota)

- Una tabla de derechos por producto y usuario (Artículos, Redes; con estados y historial). Ya cargados los 106 usuarios actuales.
- Pantallas de Administración para ver y cambiar el derecho de cada usuario, y un **interruptor** con tres posiciones (Apagado, Sombra, Activo).
- Los derechos se exigen en 24 rutas de la API y en el proceso de segundo plano, no solo en pantalla.
- Pantallas por producto (Inicio con dos tarjetas, «Mi acceso»). Hoy solo las ven los administradores.
- Direcciones de retorno OAuth preparadas.

## 3. Lo que Milton y tú ya habéis acordado (así lo entendí)

1. **El dominio `seototal.lasolucionweb.com` no se mueve.** Al final, quien entre por él **pasa al HUB** (solo las personas; Alexa, Claude y los retornos de las redes siguen respondiendo allí).
2. **Dos productos desde el principio**, cada uno con su subdominio en el `.com`.
3. **Tú creas el DNS** de `articulos.lasolucionweb.com` y `redes.lasolucionweb.com`, apuntando al **mismo proyecto de SEO Total en Vercel** (una dirección solo puede pertenecer a un proyecto, y SEO Total es una sola aplicación que responde con los tres nombres).
4. **Los usuarios normales entran por el HUB**, con código por correo o con Google. No se migran contraseñas.
5. **La facturación y la gracia las maneja el HUB.** SEO Total no convierte nada a gracia ni decide plazos.
6. **Los administradores y el soporte de Milton** conservan una puerta directa con contraseña y «Acceder como» en las dos plataformas, para dar soporte técnico. Esa puerta no pasa por el HUB.
7. **El nombre que se muestra en el HUB** es cosa tuya; a SEO Total solo le llega «permiso sí/no por producto».
8. El encabezado global del HUB: por ahora lo ven todos (también Tagcrush); se depura más adelante.

## 4. La idea central

> **El HUB informa; SEO Total decide y recuerda.** SEO Total guarda una copia de los permisos y decide cada petición con ella, sin consultar al HUB en cada clic. Si el HUB se cae, SEO Total sigue con lo último que supo.

## 5. Lo que vimos en tu rama (solo lectura) y lo que no encaja todavía

Tu trabajo ya cubre mucho: `/auth/hub`, `user-sync`, la revalidación y los reintentos. Cuatro cosas que conviene alinear, y están como preguntas al final:

1. **Tu documento habla de un solo producto** (`seo-total`). Como son dos, SEO Total necesita saber **de cuál** habla cada mensaje: el producto debe viajar en el canje del código y en la verificación de acceso.
2. **Usuarios nuevos desde el HUB:** `/auth/hub` crea la cuenta local vacía (sin permisos de redes ni módulos). SEO Total le aplicará un **perfil inicial** (en Redes, todo encendido; cada usuario conecta sus propias redes).
3. **`trialUnlocked` y la prueba de 7 días:** Milton decidió que **los 7 días de prueba de SEO Total se eliminan**; el permiso del HUB es la única fuente de acceso. SEO Total desactivará su regla antigua el Día Cero (con un interruptor, sin borrar código). Tu revalidación hoy escribe `trialUnlocked`; conviene que desde entonces escriba solo los derechos por producto.
4. **Producción ya tiene 5 columnas de tu migración** en la tabla de usuarios que el esquema de SEO Total no declara. El botón normal de migraciones intentaría borrarlas (se detuvo antes dos veces). Hay un cambio preparado que solo las declara (PR #368), **sin tocar tu rama**; Milton todavía lo decide.

## 6. Cómo nos hablamos sin pasar por Milton

Hay un buzón en el repositorio: **`BUZON_HUB_SEO_TOTAL.md`**. Tu programador añade una entrada con un Pull Request que modifique **solo ese archivo**; yo lo leo cada 10 minutos y respondo allí. Lo que ambos lados marquemos «ACORDADO» pasa a ser contrato. Nunca se escriben secretos.

## 7. Las preguntas y DÓNDE contestarlas

**Las respuestas van a mí (Claude, el control del proyecto de SEO Total), por escrito, en el buzón. No a Milton.**

1. Abrid `BUZON_HUB_SEO_TOTAL.md` en `main` del repositorio `10minuteswebsite/auto-articulos`.
2. Añadid arriba una entrada: `### AAAA-MM-DD HH:MM UTC · H-004 · HUB → SEO · Respuestas`.
3. Contestad **numerando**, aunque sea una línea cada una; si no lo sabéis aún, «aún no lo sé» y quién lo sabrá.
4. Terminad con `- RESPONDER: H-005`.
5. Pull Request normal, modificando solo ese archivo. **Sin secretos.**

Las preguntas:

1. ¿Qué identificadores usará el HUB para cada producto, en el canje del código y en la verificación de acceso? ¿La verificación recibirá el producto o devolverá los dos permisos?
2. ¿Confirmas que desde el principio son dos productos?
3. ¿Prefieres **empujar** cambios a SEO Total (mensaje firmado) o que SEO Total **consulte** con caché de 60 s?
4. ¿Cuándo quedan creados los dos registros DNS y cuándo se pueden probar?
5. Las 104 cuentas (85 con acceso, 19 sin él): ¿cómo pasan a los dos productos?
6. ¿Existe en tu rama un interruptor de login `legacy/dual/hub`, o lo construimos nosotros?
7. Cuentas de prueba y tipos de usuario: ¿qué hace el HUB con ellas?
8. Dado que los 7 días de prueba se eliminan, ¿os parece bien que desde el Día Cero vuestra revalidación escriba solo los derechos por producto y no `trialUnlocked`?
9. ¿Cuándo y cómo llegará tu rama a `main` de SEO Total?

Si necesitáis permiso para abrir el Pull Request (acceso de escritura a ramas del repositorio), pedídselo a Milton: es lo único que le toca en esto.

Gracias, Mario. Si algo de esto te parece mal planteado, queremos saberlo ahora.

— Claude (control del proyecto «Separación de SEO Total»), por encargo de Milton

## 8. Prompt listo para tu programador (cópialo tal cual en su programa)

```
Eres el programador del HUB (LA Solución IA Hub). Vas a trabajar con otro proyecto, SEO Total, que se divide en dos productos: SEO Total Artículos (articulos.lasolucionweb.com) y SEO Total Redes (redes.lasolucionweb.com). Este mensaje NO te da órdenes sobre el HUB: te cuenta cómo está construido SEO Total para que adecues el HUB a ello.

1. Lee completo el archivo CONTRATO_HUB_PARA_EL_HUB.md que te acompaña. Lo marcado [HOY] está leído de la rama codex/hub-seo-total-migration y del documento de integración de Mario (solo lectura); [ACORDADO] lo decidió Milton con Mario; [PROPUESTA] se habla, no se impone.
2. Idea central: el HUB maneja las personas y da permiso sí/no por producto; SEO Total maneja los módulos y permisos internos y decide cada petición con su tabla local. Si el HUB se cae, SEO Total sigue con lo último que supo.
3. Compara el contrato con tu código actual. Dónde difiera o algo no sea exacto, dilo. Responde las preguntas de la sección 12 del contrato.
4. Comunícate con el equipo de SEO Total únicamente por el buzón: el archivo BUZON_HUB_SEO_TOTAL.md del repositorio 10minuteswebsite/auto-articulos. Se escribe con un Pull Request normal que modifique SOLO ese archivo, añadiendo una entrada arriba con el formato que indica el propio buzón (H-004, H-005...). SEO Total lo lee cada 10 minutos y te responde allí. No necesitas pasar por Milton ni por Mario para hablar de detalles técnicos.
5. Reglas: nunca escribas secretos, claves, tokens, contraseñas ni hashes en el buzón. No modifiques en ese repositorio nada que no sea el buzón. No cambies producción de SEO Total. Lo que quede «ACORDADO» por ambos lados se vuelve contrato; no implementes nada que afecte a SEO Total antes de eso.
6. Lo que decide Milton y no tú ni nosotros: la fecha del cambio, cuándo se activa el interruptor de aplicación y cualquier cosa de precios o plazos (esas las maneja el HUB). Si algo depende de Milton, márcalo «PARA MILTON» en el buzón.
7. Empieza leyendo las entradas H-001, H-002 y H-003 del buzón y respondiendo con tu H-004.
```

**Nota práctica:** para abrir el Pull Request, tu programador necesita acceso de escritura a ramas en el repositorio `10minuteswebsite/auto-articulos`. Si no lo tiene, díselo a Milton.
