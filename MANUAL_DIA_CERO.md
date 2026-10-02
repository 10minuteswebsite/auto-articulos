# MANUAL DEL DÍA CERO — separación de SEO Total en Artículos y Redes

Para: Milton · Escrito el 2026-10-02 por Claude (control del proyecto) · Estado: **borrador operativo, no se ejecuta nada hasta que Milton lo ordene**

> **Qué es el Día Cero:** el día en que el login pasa a ser del HUB, nacen los dos subdominios
> (`seototal.articulos…` y `seototal.redes…`) y los usuarios actuales reciben **5 días de gracia**.
> Hasta ese día, el programa actual manda y **nadie queda fuera**.

## 0. Cómo leer este manual

- Cada paso dice **quién** lo hace: 🧑 Milton, 🤖 Claude, 👤 Mario (HUB), 🛠 Codex.
- Cada paso dice **qué ves si salió bien** y **qué haces si no**.
- **Regla de oro:** si algo no sale como dice el manual, **no sigas**: vuelve al paso de reversa indicado y avísame.
- Nunca se usa `accept_data_loss`, `force_sync` ni el botón normal de migraciones (`db push`) contra producción.

## 1. Dónde estamos hoy (ya hecho, en producción)

| Pieza | Estado |
|---|---|
| Derechos por producto (tablas `ProductEntitlement`) y backfill de los 106 usuarios | En producción |
| Paneles de Administración: derechos por usuario, gracia, **interruptor** de aplicación | En producción |
| Vista por productos (Inicio con dos tarjetas, «Mi acceso», menús) | En producción, **solo para administradores** (los demás necesitan «Habilitado») |
| Derechos exigidos en APIs (24 rutas) y en el worker | En producción, **modo Apagado** (no bloquea a nadie) |
| Hosts permitidos para los retornos de OAuth (incluye los dos subdominios futuros) | En producción |
| SQL de conversión a gracia | Escrito y probado en base desechable; **no ejecutado** |
| Smoke test de producción | Escrito; pasa |

**Interruptor hoy: APAGADO.** Con el interruptor apagado, nada de esto afecta a ningún usuario.

## 2. LAS PUERTAS (todas deben estar en verde antes del Día Cero)

| # | Puerta | Quién | Cómo se comprueba |
|---|---|---|---|
| P1 | **Esquema del HUB declarado** (PR #368 fusionado) o decidido de otra forma. Producción tiene 5 columnas del HUB que `main` no declara | 🧑 decide, 🤖 ejecuta | `schema.prisma` de `main` contiene `hubUserId`, `hubAuth0Sub`, `hubSyncedAt`, `hubSyncAttemptedAt`, `hubSyncError` |
| P2 | **Interruptor en Sombra al menos 7 días** y registros revisados sin bloqueos inesperados | 🧑 enciende, 🤖 revisa | Administración → Productos muestra «Sombra»; la búsqueda `[product-access] product access denied` en los registros de Vercel no muestra casos legítimos |
| P3 | **Callbacks registrados** en LinkedIn, Pinterest, Tumblr, X, Blogger y Bing (Google y Meta van por Composio y no hacen falta; Composio solo si lo exige) — ver `CHECKLIST_CALLBACKS_MILTON.md` | 🧑 (con 🤖 en el navegador si quieres) | Cada consola muestra las dos direcciones nuevas **además** de la actual |
| P4 | **Subdominios creados por Mario**: `seototal.articulos.lasolucionweb.com` y `seototal.redes.lasolucionweb.com`, con DNS apuntando **al proyecto de SEO Total en Vercel** y certificado emitido, **en privado** | 👤 Mario (🤖 verifica) | Abrir cada dirección muestra la pantalla de login con candado |
| P5 | **El HUB de Mario entiende dos productos.** Hoy su integración describe un solo derecho gratuito «SEO Total». Hace falta que el HUB emita **dos** (Artículos y Redes) para que se escriban en `ProductEntitlement` con `source = HUB` | 👤 Mario + 🛠 Codex | **PENDIENTE DE CONFIRMAR CON MARIO.** Contrato completo en `CONTRATO_HUB_PARA_EL_HUB.md` (secciones 3 y 9). Sin esto el HUB no puede decidir por producto |
| P6 | **Entrada desde el HUB probada** (`/auth/hub`, que ya existe en la rama de Mario) con una cuenta de prueba, y los 106 usuarios sincronizados (conteo y muestreo) | 👤 Mario + 🤖 | Una cuenta de prueba entra por el HUB y llega a su cuenta local con sus mismos datos |
| P7 | **Acceso de emergencia de administradores** y «Acceder como» funcionan con el login del HUB activo | 🤖 | Entrar como admin por la ruta de emergencia; probar «Acceder como» a Lorena |
| P8 | **Plan de reversa ensayado** (sección 6) | 🤖 | `ENSAYO_REVERSA.md` recorrido con una cuenta de prueba, cada paso confirmado |
| P9 | **Cuenta de prueba (Lorena Álvarez) verificada** en producción justo antes | 🤖 | Smoke test + recorrido de Lorena |
| P11 | **Dominio estable para máquinas funcionando** (un host que NO pasa al HUB y sirve MCP/OAuth2, `.well-known` y retornos de conexión desde el proyecto de SEO Total), y **reenvío 308 del HUB listo y probado** | 🤖 + 👤 Mario | `/api/mcp` responde por el host estable; el reenvío desde un host de prueba conserva método y parámetros; conector de Alexa/Claude reapuntado y probado |
| P10 | **Fecha y hora decididas** por Milton, con él presente y sin despliegues de otros programas ese día | 🧑 | — |

> **Si una puerta no está en verde, no hay Día Cero.** No es un fracaso: es el sistema funcionando.

## 3. Una semana antes (T-7)

1. 🧑 **Decide la fecha.** Elige un día de poco tráfico y con tiempo libre tuyo.
2. 🤖 **Bajar el TTL del DNS** del dominio principal a 5 minutos (se hace en el proveedor de DNS; así, si hay que devolverlo, tarda minutos y no horas).
3. 🤖 **Congelar:** avisar a Codex y a Mario de que desde T-1 no hay cambios de esquema ni despliegues ajenos.
4. 🤖 **Simulacro de la conversión a gracia** con el SQL en modo simulación (`scripts/corte/conversion-a-gracia.sql`, sin `apply=yes`). Resultado esperado: solo cambian los usuarios que no son administradores y no tienen ya una gracia puesta a mano. Se lo muestro a Milton.
5. 🧑 **Decidir si se avisa a los usuarios** (texto sugerido: «A partir del [fecha] SEO Total se divide en SEO Total Artículos y SEO Total Redes. Tu acceso actual se mantiene 5 días»).

## 4. Un día antes (T-1)

1. 🤖 Smoke test de producción (`scripts/smoke-production.sh`) → debe terminar en «Smoke test OK».
2. 🤖 Verificar que los 106 usuarios tienen derechos (106 de Artículos; los de Redes que correspondan) y que RLS sigue activo en las dos tablas.
3. 🤖 Verificar que las 5 columnas del HUB siguen intactas.
4. 🧑 Confirmar que el interruptor está en **Sombra** y que no hay bloqueos raros en los registros.
5. 🤖 Dejar a mano los enlaces de reversa (sección 6) y esta lista impresa/abierta.

## 5. EL DÍA CERO, paso a paso

> Hora de inicio sugerida: mañana, con 3 horas libres. **Orden estricto.** Marca cada paso al terminarlo.

**Paso 1 — Congelar.** 🤖 Confirmar que no hay PR de código abiertos para fusionar ni workflows corriendo.
*Bien:* lista de PR/Actions vacía. *Mal:* esperar a que termine lo que corra.

**Paso 2 — Comprobar el estado de producción.** 🤖 Smoke test + conteos (sección 4, puntos 1–3).
*Bien:* todo OK. *Mal:* **no seguir**; investigar.

**Paso 3 — Subdominios vivos.** 🤖 Abrir los dos subdominios y comprobar candado y login.
*Bien:* ambos cargan. *Mal:* revisar DNS/Vercel; no seguir hasta que carguen.

**Paso 4 — Probar los accesos de emergencia.** 🤖 Entrar como administrador por la ruta de emergencia y probar «Acceder como».
*Bien:* ambos funcionan. *Mal:* **no seguir**: sin esto una caída del HUB dejaría sin soporte.

**Paso 5 — Convertir a gracia (5 días).** 🧑 da la orden, 🤖 prepara y muestra la simulación; luego **Milton ejecuta a mano en Supabase** el SQL con `apply=yes` (el sistema no me deja tocar la base de producción).
*Qué hace:* los usuarios con derecho activo que no han comprado pasan a «Gracia» hasta **fecha de corte + 5 días**. Administradores y gracias puestas a mano no cambian. Cada cambio deja un evento en el historial.
*Bien:* el SQL informa el número de filas cambiadas igual al de la simulación. *Mal:* no repetirlo a ciegas; es seguro repetirlo (no duplica), pero **avísame primero**.

**Paso 6 — Habilitar la vista por productos.** 🤖 En Administración → Módulos, poner «Habilitado» el módulo `vista-productos` para todos (o para un grupo de prueba primero).
*Bien:* una cuenta de prueba ve el Inicio con las dos tarjetas y «Mi acceso». *Mal:* reversa 6.C.

**Paso 7 — Pasar el interruptor a Activo.** 🧑 En Administración → Productos, pulsar **Activo** y escribir la palabra **ACTIVAR**. (Solo se puede desde Sombra.)
*Por qué es seguro hoy:* con todos en Activo o Gracia no se bloquea a nadie. El bloqueo solo llega cuando una gracia vence.
*Bien:* el panel muestra «Activo» (puede tardar hasta 30 s en todos los servidores). *Mal:* reversa 6.A.

**Paso 8 — Dar autoridad de login al HUB.** 👤 Mario (con 🤖 mirando). Se pasa de `legacy` a `dual` (conviven los dos logins), se prueba con la cuenta de prueba, y **solo si todo va bien** a `hub`.
*Bien:* la cuenta de prueba entra por el HUB, y también por el login antiguo mientras esté en `dual`. *Mal:* reversa 6.D.
**Sub-pasos (uno a la vez):**
 8.1 👤 Mario confirma por escrito que el HUB tiene los dos productos y que la prueba de P6 pasó hoy.
 8.2 🤖 Entra por el login antiguo con la cuenta de prueba (debe funcionar).
 8.3 👤 Cambia el interruptor a `dual`. 🤖 entra por el HUB con la cuenta de prueba y por el login antiguo: **ambas entradas deben funcionar**.
 8.4 🤖 Prueba una cuenta de **solo Artículos** y una de **solo Redes** entrando por el HUB: cada una ve solo lo suyo.
 8.5 🤖 Prueba el acceso de emergencia de administrador y «Acceder como».
 8.6 🧑 Da la orden «pasa a hub». 👤 cambia el interruptor a `hub`. 🤖 comprueba que el login antiguo redirige al HUB y que el administrador sigue entrando por la ruta de emergencia.
 8.7 Si cualquier sub-paso falla: **reversa 6.D** y no continúes.
**PENDIENTE DE CONFIRMAR CON MARIO:** el interruptor `legacy/dual/hub` **hoy no está construido** en SEO Total (solo existe el login actual). Ver `CONTRATO_HUB_PARA_EL_HUB.md`, sección 4: lo construimos nosotros tras el acuerdo. **Este paso no puede hacerse hasta entonces.**

**Paso 9 — ÚLTIMO PASO: apuntar `seototal.lasolucionweb.com` al HUB (decisión de Milton: opción A).** Así los usuarios que entren por la dirección de siempre llegan al HUB y nadie se pierde.
 **Solo se hace si TODO lo anterior está en verde y si la puerta P11 está cumplida.**
 9.1 🤖 Confirmar que el dominio estable de máquinas ya responde (P11) y que el TTL del DNS ya está bajo.
 9.2 👤 Mario deja listo en el HUB el **reenvío con redirección 308** de `/api/*`, `/.well-known/*`, MCP/OAuth2 y retornos de conexión hacia el dominio estable (sin esto, Alexa/Claude y las conexiones OAuth dejan de funcionar al mover el dominio).
 9.3 🧑 Da la orden «mueve el dominio». 👤/🤖 lo quitan del proyecto de SEO Total en Vercel y lo añaden al del HUB.
 9.4 🤖 Comprobar de inmediato: `/` y `/login` llevan al HUB; `/api/mcp` responde; un retorno de conexión (p. ej. Tumblr) funciona; Alexa/Claude conectan.
 *Mal en cualquiera de 9.4:* **reversa 6.E de inmediato** (devolver el dominio a SEO Total; con el TTL bajo tarda minutos).

**Paso 10 — Verificar en producción con cuentas reales.** 🤖 + 🧑
- Una cuenta de **solo Artículos**, una de **solo Redes**, una con ambos y un **administrador**.
- En cada servidor de marca: `site`, `net` y `tagcrush` (tagcrush no debe mostrar nada que diga «10minutesWebsite»).
- **Reconectar una integración de cada proveedor** (Tumblr, X, LinkedIn, Pinterest, Blogger, Bing y una por Composio).
*Bien:* todo conecta y publica. *Mal:* anotar cuál falla y avisar; no desconectar a los demás.

**Paso 11 — Cierre del día.** 🤖 Smoke test final, registrar en la bitácora (`TRASPASO_SEPARACION_SEO_TOTAL.md`) la hora de cada paso, y dejar el interruptor y los accesos de emergencia como están.

## 6. REVERSA (el botón de pánico, por paso)

| Letra | Qué falló | Qué haces | Tiempo |
|---|---|---|---|
| **6.A** | Usuarios bloqueados por error | Administración → Productos → pulsar **Sombra** (y si hace falta, **Apagado**). Es libre, sin escribir nada. Esperar hasta 30 s. | segundos |
| **6.B** | Una gracia mal convertida | Por usuario: Administración → Usuarios → Productos → **Dar gracia** / **Quitar gracia** / **Activar**. El historial guarda cada cambio. **No hay botón de deshacer masivo**; nunca SQL improvisado. | por usuario |
| **6.C** | La vista por productos confunde | Administración → Módulos → quitar «Habilitado» de `vista-productos`. El Inicio vuelve al clásico. No toca derechos ni conexiones. | segundos |
| **6.D** | El login del HUB falla | Volver el interruptor del login a `dual` o `legacy`. Los administradores pueden entrar por la ruta de emergencia. | segundos |
| **6.E** | Alexa/Claude o conexiones dejan de responder | Devolver `seototal.lasolucionweb.com` al proyecto actual en Vercel (el TTL bajo hace que tarde minutos) y volver el login a `legacy`. | minutos |
| **6.F** | Algo raro en la base | **No tocar.** Mantener Apagado y avisar. Nunca `accept_data_loss`, `force_sync` ni `db push`. | — |

## 7. Después del Día Cero (los 5 días de gracia)

- **Día 1:** 🤖 revisar registros de Sombra/Activo, y que nadie quede bloqueado antes de tiempo.
- **Días 1–5:** los usuarios ven los avisos de gracia («te quedan N días»). 🧑 puede **dar o quitar días por usuario** en Administración (para quien compre o pida más tiempo).
- **Día 5:** las gracias vencen y se bloquea solo a quien no tenga derecho. Antes de ese día, 🤖 revisa la lista de quién vence y se la muestra a Milton.
- **Después:** cuando se confirme que ningún proveedor ni conector usa ya el host viejo, se retiran los callbacks antiguos y el puente de rutas. **No antes.**

## 8. Lo que este manual NO decide (queda en manos de Milton / Mario)

1. **Cuándo es el Día Cero.**
2. **Cómo cobra el HUB** y qué usuarios cuentan como «han comprado» (cambia a quién se convierte a gracia).
3. **Cómo se llama el interruptor de login del HUB y cómo emite dos derechos** (P5, P6, Paso 8).
4. **Si se avisa a los usuarios** y con qué texto.

## 9. Qué debe existir del lado del HUB (resumen; el detalle está en `CONTRATO_HUB_PARA_EL_HUB.md`)

1. **Dos productos** (`ARTICULOS`, `REDES`) con derechos `ACTIVE` / `GRACE` (con fecha) / `INACTIVE`.
2. **Entrada por código de un solo uso** hacia `https://<subdominio>/auth/hub?code=...`, ≤ 60 s.
3. **Respuestas con `entitlements`** en el canje del código y en la verificación de acceso; **nunca revocar por omisión**.
4. **Mensajes firmados y repetibles sin daño** (`event_id`) para cambios instantáneos.
5. **Tolerancia a caídas:** si el HUB cae, SEO Total conserva lo último y los administradores entran por emergencia.
6. **Puente de rutas de máquina** (MCP, OAuth2, `.well-known`, retornos de conexión) con redirección 308 si se mueve el dominio.
7. Acuerdo sobre **contraseñas**, **«han comprado»** y **tipos de usuario**.

**Cómo se hablan:** el HUB → SEO Total entra por `/auth/hub` y (si se acuerda) empuja cambios firmados; SEO Total → HUB canjea el código, verifica acceso y sincroniza perfiles. SEO Total **decide cada petición con su tabla local**; el HUB nunca está en el camino de un clic.

## 10. Lista de verificación de una página (para imprimir)

☐ P1 esquema HUB declarado · ☐ P2 Sombra ≥7 días · ☐ P3 callbacks · ☐ P4 subdominios · ☐ P5 HUB con dos productos · ☐ P6 entrada HUB probada · ☐ P7 emergencia y «Acceder como» · ☐ P8 reversa ensayada · ☐ P9 Lorena OK · ☐ P11 dominio estable y reenvío 308 · ☐ P10 fecha decidida
Día Cero: ☐1 Congelar · ☐2 Estado · ☐3 Subdominios · ☐4 Emergencia · ☐5 Gracia (SQL a mano) · ☐6 Vista productos · ☐7 Interruptor Activo (ACTIVAR) · ☐8 Login HUB · ☐9 Dominio viejo · ☐10 Verificar · ☐11 Cierre
