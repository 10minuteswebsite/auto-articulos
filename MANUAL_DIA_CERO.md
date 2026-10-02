# MANUAL DEL DÍA CERO — separación de SEO Total en Artículos y Redes

Para: Milton · Versión 2 · 2026-10-02 · **Borrador operativo: no se ejecuta nada hasta que Milton lo ordene.**

> **Qué es el Día Cero:** el día en que quien escriba `seototal.lasolucionweb.com` pasa al HUB, y SEO Total queda dividido en dos productos con sus propias direcciones: `articulos.lasolucionweb.com` y `redes.lasolucionweb.com`. Hasta ese día manda el login actual y **nadie queda fuera**.

## 0. Cómo leerlo
- **Quién:** 🧑 Milton · 🤖 Claude · 👤 Mario (HUB) · 🛠 Codex.
- Cada paso dice **qué ves si salió bien** y **qué haces si no**.
- Si algo no sale como dice el manual, **no sigas**: reversa del paso y me avisas.
- Nunca `accept_data_loss`, `force_sync` ni el botón normal de migraciones (`db push`) contra producción.

## 1. Reparto (acordado con Mario)
- **El HUB:** personas, login de usuarios normales (código por correo o Google), **permiso sí/no por producto**, facturación y gracia. **Eso no lo maneja SEO Total.**
- **SEO Total:** módulos, submódulos, permisos de cada red, datos, y el acceso de administradores y soporte («puerta trasera» con contraseña + «Acceder como»).
- **Dominios:** `seototal.lasolucionweb.com` **no se mueve**. Los dos subdominios nuevos están en el `.com`; **Mario crea el DNS**.

## 2. Dónde estamos hoy (en producción, con el interruptor APAGADO)
Derechos por producto y paneles de Administración; vista por productos (solo administradores); derechos exigidos en 24 rutas y en el worker (modo Apagado); hosts de retorno OAuth preparados; smoke test que pasa. **Ningún usuario nota nada.**

## 3. LAS PUERTAS (todas en verde antes del Día Cero)

| # | Puerta | Quién | Cómo se comprueba |
|---|---|---|---|
| P1 | **Esquema del HUB declarado** (PR #368) o decidido de otra forma: producción tiene 5 columnas del HUB que `main` no declara | 🧑 decide, 🤖 ejecuta | `schema.prisma` de `main` las contiene |
| P2 | **Interruptor en Sombra ≥ 7 días**, registros revisados | 🧑 enciende, 🤖 revisa | Administración → Productos muestra «Sombra»; sin bloqueos legítimos en `[product-access] product access denied` |
| P3 | **Respuestas de Mario en el buzón** (las preguntas del contrato, sección 12) | 👤 | Entrada `H-004` en `BUZON_HUB_SEO_TOTAL.md` |
| P4 | **DNS creado por Mario:** `articulos.lasolucionweb.com` y `redes.lasolucionweb.com` apuntando al proyecto de SEO Total en Vercel, con candado, **en privado** | 👤 Mario (🤖 verifica) | Cada dirección carga la pantalla de login con candado |
| P5 | **Una sola fuente de acceso:** la regla de prueba de 7 días queda **desactivada con un interruptor** (decisión de Milton) y el permiso del HUB escribe nuestra tabla de derechos | 🤖 + 👤 | Prueba con 4 cuentas: ambos, solo Artículos, solo Redes, ninguno; una cuenta antigua de prueba vencida con permiso del HUB entra |
| P6 | **Entrada desde el HUB probada** en cada producto con cuentas de prueba | 👤 + 🤖 | `/auth/hub` en `articulos` y en `redes` abre sesión y deja los datos intactos |
| P7 | **Perfil inicial de usuario nuevo** (permisos de redes encendidos; cada usuario conecta las suyas) | 🛠/🤖 | Cuenta nueva desde el HUB entra a Redes y ve dónde conectar |
| P8 | **Puerta de administradores y «Acceder como»** funcionan en `articulos` y en `redes` | 🤖 | Entrar por la ruta directa; «Acceder como» a Lorena |
| P9 | **«Callback único»** (si se decide construir): una conexión de prueba empezada en `redes` vuelve bien por el callback de siempre | 🛠/🤖 | Conectar Tumblr de prueba desde `redes` |
| P10 | **Reversa ensayada** (sección 6) | 🤖 | `ENSAYO_REVERSA.md` recorrido |
| P11 | **Cuenta de prueba (Lorena) verificada** justo antes | 🤖 | Smoke test + recorrido |
| P12 | **Fecha y hora decididas** por Milton, con él presente | 🧑 | — |

> **Si una puerta no está en verde, no hay Día Cero.** No es un fracaso: es el sistema funcionando.

## 4. Una semana antes (T-7)
1. 🧑 Decide la fecha.
2. 🤖 Congela cambios de esquema y despliegues ajenos desde T-1.
3. 👤 Mario baja el TTL del DNS que vaya a tocar.
4. 🧑 Decide si se avisa a los usuarios (el HUB ya tiene su lista).

## 5. Un día antes (T-1)
1. 🤖 Smoke test (`scripts/smoke-production.sh`): debe terminar «Smoke test OK».
2. 🤖 Conteos: usuarios y derechos por producto; RLS activo; las 5 columnas del HUB intactas.
3. 🧑 Interruptor en **Sombra** y sin bloqueos raros.

## 6. EL DÍA CERO, paso a paso (orden estricto)

**Paso 1 — Congelar.** 🤖 Confirmar que no hay PR de código por fusionar ni workflows corriendo. *Mal:* esperar a que terminen.

**Paso 2 — Estado de producción.** 🤖 Smoke test + conteos. *Mal:* no seguir.

**Paso 3 — DNS vivo.** 🤖 Comprobar que `articulos.lasolucionweb.com` y `redes.lasolucionweb.com` cargan con candado. *Mal:* 👤 Mario revisa el DNS; no seguir hasta que carguen.

**Paso 4 — Puerta de administradores.** 🤖 Entrar como administrador por la ruta directa en cada producto y probar «Acceder como». *Mal:* no seguir; sin esto un fallo del HUB deja a soporte sin entrada.

**Paso 5 — Habilitar la vista por productos.** 🤖 En Administración → Módulos, `vista-productos` en «Habilitado» para todos (o un grupo de prueba primero). *Bien:* una cuenta de prueba ve el Inicio con las dos tarjetas y «Mi acceso». *Mal:* reversa 7.C.

**Paso 6 — Interruptor a Activo.** 🧑 Administración → Productos → **Activo** + escribir **ACTIVAR** (solo desde Sombra). *Bien:* el panel muestra «Activo» (hasta 30 s en todos los servidores). *Mal:* reversa 7.A.

**Paso 7 — Entrada por el HUB.** 👤 Mario pone en marcha la entrada para los dos productos: cada producto del HUB lleva a su dirección (`/auth/hub`). 🤖 prueba con una cuenta de **solo Artículos**, una de **solo Redes**, una con ambos y un administrador. *Bien:* cada una ve solo lo suyo y sus datos están intactos. *Mal:* reversa 7.D.

**Paso 8 — Dominio actual hacia el HUB (solo personas).** Último paso. 🧑 da la orden. 🤖 hace que `/` y `/login` de `seototal.lasolucionweb.com` lleven a las personas al HUB, **sin tocar** las rutas de máquina (Alexa, Claude/MCP, retornos de conexión) ni mover el dominio. *Bien:* una persona que abre el dominio llega al HUB; `/api/mcp` y un retorno de conexión responden. *Mal:* reversa 7.E.

**Paso 9 — Verificar con cuentas reales.** 🤖 + 🧑: una cuenta de cada tipo y en cada servidor de marca (`site`, `net`, `tagcrush`; **Tagcrush ve por ahora lo mismo que los demás, decisión temporal**), y **reconectar una integración de cada proveedor**. *Mal:* anotar cuál falla y avisar; no desconectar a los demás.

**Paso 10 — Cierre.** 🤖 Smoke test final, bitácora (`TRASPASO_SEPARACION_SEO_TOTAL.md`) con la hora de cada paso.

## 7. REVERSA (botón de pánico por paso)

| Letra | Qué falló | Qué haces | Tiempo |
|---|---|---|---|
| **7.A** | Usuarios bloqueados por error | Administración → Productos → **Sombra** (o **Apagado**). Libre, sin escribir nada | segundos |
| **7.B** | Un permiso mal puesto | Por usuario: Administración → Usuarios → Productos. Historial en cada cambio. No hay deshacer masivo; nunca SQL improvisado | por usuario |
| **7.C** | La vista por productos confunde | Administración → Módulos → quitar «Habilitado» a `vista-productos` | segundos |
| **7.D** | La entrada por el HUB falla | 👤 Mario desactiva el lanzamiento desde el HUB; los usuarios vuelven al login actual (sigue activo en la coexistencia); administradores por la puerta directa | segundos |
| **7.E** | La redirección de personas falla | 🤖 Quitar la redirección de `/` y `/login`; el dominio nunca se movió | segundos |
| **7.F** | Algo raro en la base | **No tocar.** Mantener Apagado y avisar. Nunca `accept_data_loss`, `force_sync` ni `db push` | — |

## 8. Después del Día Cero
- **Facturación, gracia y plazos:** los maneja el **HUB** desde su administrador de facturación. SEO Total no convierte nada a gracia ni decide plazos.
- **Día 1:** 🤖 revisa registros y que nadie quede bloqueado por error.
- **Más adelante:** cuando el HUB confirme que no queda nadie en el login antiguo, se cierra el acceso legado para usuarios normales (los administradores conservan su puerta). **Solo con orden de Milton.**

## 9. Qué NO decide este manual
La fecha (Milton); el criterio de quién paga y los plazos (HUB); las 19 cuentas sin acceso en la lista de Mario (HUB); si Tagcrush tendrá una versión de encabezado propia (decisión temporal por ahora).

## 10. Lista de una página
☐ P1 esquema HUB · ☐ P2 Sombra 7 días · ☐ P3 respuestas de Mario · ☐ P4 DNS de Mario · ☐ P5 una sola fuente de acceso · ☐ P6 entrada HUB probada · ☐ P7 perfil inicial · ☐ P8 admin y «Acceder como» · ☐ P9 callback único · ☐ P10 reversa ensayada · ☐ P11 Lorena OK · ☐ P12 fecha
Día Cero: ☐1 Congelar · ☐2 Estado · ☐3 DNS · ☐4 Admin · ☐5 Vista productos · ☐6 Activo (ACTIVAR) · ☐7 Entrada HUB · ☐8 Dominio actual → HUB (personas) · ☐9 Verificar · ☐10 Cierre
