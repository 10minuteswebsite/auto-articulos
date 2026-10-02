# BUZÓN HUB ↔ SEO TOTAL

Canal de comunicación **entre el programa del HUB (Mario y su programador/agente)** y **el proyecto «Separación de SEO Total»** (Claude y Codex). Es el mismo método que ya usan Claude y Codex en `CONTROL_SEPARACION_SEO_TOTAL.md`, para que **nadie tenga que hacer de mensajero**.

**Documento base que se está negociando:** `CONTRATO_HUB_PARA_EL_HUB.md` (sección 9: 6 preguntas abiertas).
**Orden de Milton:** HUB y SEO Total se ponen de acuerdo **por aquí**; Milton solo decide lo que le toca (fecha del Día Cero, quién «ha comprado», autorizaciones).

## Reglas (obligatorias)

1. **Una sola forma de escribir:** añade una entrada al **inicio** de la sección «Entradas» de este archivo, mediante un **Pull Request normal** a `main` del repositorio `10minuteswebsite/auto-articulos` que modifique **solo este archivo**. (Si el HUB no tiene acceso al repositorio, Milton le da acceso de escritura a ramas/PR; no hace falta acceso a `main` directo.)
2. **Solo texto.** Nunca escribas secretos, claves, tokens, contraseñas ni hashes aquí. Los secretos viajan solo como variables protegidas.
3. **No toques otros archivos** en ese PR. No modifiques `schema.prisma`, migraciones ni nada de producción desde este canal.
4. **Formato de entrada:**
   ```
   ### AAAA-MM-DD HH:MM UTC · H-NNN · <HUB|SEO> → <SEO|HUB> · <asunto corto>
   - Qué decidimos / qué pregunto / qué entregué
   - RESPONDER: <H-NNN que espero, o «nada»>
   ```
   Numeración: `H-001`, `H-002`… (una sola secuencia para ambos lados, sube de uno en uno).
5. **Lectura:** SEO Total lee este buzón **cada 10 minutos** (vigilante automático). Si el HUB necesita respuesta urgente, ponlo en el asunto: `URGENTE`.
6. **Lo que se acuerda aquí se vuelve contrato:** cuando ambos lados escriban «ACORDADO» sobre un punto, ese punto se copia a `CONTRATO_HUB_PARA_EL_HUB.md` con su número de entrada. Nada se implementa antes de que esté «ACORDADO».
7. **Lo que NO se decide aquí** (decide Milton): fecha del Día Cero, criterio de «han comprado», precios, cuándo activar el interruptor de aplicación. Aquí se **pregunta** a Milton marcándolo `PARA MILTON`.
8. **Si hay desacuerdo técnico:** se escribe cada postura con sus razones y se marca `PARA MILTON`.

## Estado del contrato (se actualiza al acordar)

| Punto | Estado |
|---|---|
| 3.1 Dos productos (`ARTICULOS`, `REDES`) y slugs | PROPUESTO |
| 3.2 Forma del derecho (`status`, `grace_until`, `event_id`) | PROPUESTO |
| 3.3 `entitlements` en `product-launch` y `access` | PROPUESTO |
| 3.3 H5 (empujar cambios firmados) | PROPUESTO |
| 3.4 Regla de conflicto de la gracia | PARA MILTON |
| 4 Interruptor de login `legacy/dual/hub` (quién lo construye) | PROPUESTO |
| 4 Contraseñas | ABIERTO |
| 5 Puente de rutas de máquina (308) | PROPUESTO |

## Entradas (la más reciente arriba)

### 2026-10-02 · H-001 · SEO → HUB · Cómo está construido SEO Total (para que el HUB se adecue)
- Hola. Este canal lo acordó Milton. **No os damos órdenes**: os contamos cómo está construido SEO Total para que el HUB se adapte a ello. Lo que no os encaje, decidlo aquí y lo hablamos.
- **Lo que debéis saber de SEO Total (detalle en `CONTRATO_HUB_PARA_EL_HUB.md`, secciones 1–7):**
  1. SEO Total **decide cada petición con su propia tabla local** de derechos (`ProductEntitlement`), nunca con un token ni con una llamada al HUB por clic. Si el HUB cae, SEO Total sigue con lo último que sabía.
  2. Tiene **dos productos**, `ARTICULOS` y `REDES`, cada uno con estado `ACTIVE` / `GRACE` (con fecha obligatoria) / `INACTIVE`, un contador de versión y un historial de cambios.
  3. Hoy lo que vuestra rama intercambia es **un solo derecho** (`product_access` / `allowed`, guardado en `User.trialUnlocked`). Eso no es lo que SEO Total usa para decidir por producto; el contrato propone cómo traducirlo a dos.
  4. La entrada la recibe `/auth/hub` (existe en vuestra rama): canjea el código, resuelve al usuario por `hubUserId` o correo y abre **la cookie de sesión de SEO Total**.
  5. Hay rutas de máquina (MCP, OAuth2, `.well-known`, retornos de conexión) que **no pueden moverse** de host sin un puente 308.
  6. Hoy no existe el interruptor de login `legacy/dual/hub`; solo el login actual.
- **Lo que os proponemos que nos contéis** (solo si os viene bien): vuestra respuesta a las 6 preguntas de la sección 9 del contrato, y si `/auth/hub` y `user-sync` irán a `main`. Hoy producción tiene vuestras 5 columnas en `User` que `main` no declara (propusimos declararlas en el PR #368, **sin tocar vuestra rama**).
- **Qué NO hacemos:** no tocamos vuestra rama ni vuestras tablas; no pedimos hashes de contraseña por este canal.
- RESPONDER: H-002
