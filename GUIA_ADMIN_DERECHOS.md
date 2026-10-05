# Guía del administrador — derechos por producto

## Qué controla cada cosa

La cuenta tiene dos productos independientes: **SEO Total Artículos** y **SEO
Total Redes**. En la ficha de una persona, la sección **Productos** permite
activar, desactivar o dar una gracia a cada uno. Cada cambio queda en el
historial con fecha, producto, transición, quién lo hizo y motivo.

## Activar o desactivar un producto

1. Abre **Administración → Usuarios**.
2. Busca la cuenta y abre su ficha.
3. En **Productos**, elige **Activar** o **Desactivar** para Artículos o Redes.
4. El cambio se guarda de inmediato; escribe un motivo cuando el flujo lo
   solicite y revisa **Historial**.

Con el interruptor global apagado, estos cambios preparan los derechos pero no
bloquean a la persona. No borra artículos, conexiones ni publicaciones.

## Dar o quitar una gracia

1. En el producto correspondiente, introduce entre 1 y 365 días.
2. Pulsa **Dar gracia** y confirma la fecha resultante.
3. Para retirarla, pulsa **Quitar gracia**; el historial conserva ambos hechos.

Una gracia necesita fecha de vencimiento. Una gracia vencida no devuelve el
acceso. En Redes, además se conserva la regla legacy de aprobaciones de redes.

## Leer el historial

Despliega **Historial** dentro de Productos. Se muestran los últimos 20 eventos,
con fecha, producto, estado anterior → nuevo, actor y motivo. Si dice
«sistema», el cambio provino del backfill o de una operación automática.

## Modos del interruptor global

- **Apagado (`off`)**: comportamiento actual; no bloquea por derechos.
- **Sombra (`shadow`)**: calcula derechos y registra lo que habría bloqueado,
  pero deja continuar. Busca en los logs:
  `[product-access] product access denied`.
- **Activo (`enforce`)**: una cuenta sin derecho recibe 403 en las APIs
  protegidas y el worker no inicia nuevos destinos sin derecho.

El modo debe permanecer en Sombra al menos una semana mientras se revisan los
registros. **Activo no debe encenderse sin aprobación explícita de Milton** y
sin comprobar que las gracias y derechos reales sean correctos.

**Reglas que el sistema impone al cambiar el modo (API y pantalla):** a **Activo** solo se puede pasar **desde Sombra** (no se puede saltar desde Apagado) y hay que **escribir la palabra ACTIVAR** para confirmar. **Volver** a Sombra o a Apagado es siempre inmediato y sin confirmación: es la reversa de emergencia. Un cambio puede tardar hasta 30 segundos en aplicarse en todos los servidores. Cada cambio queda en el registro de auditoría con el modo anterior y el nuevo.

## Qué hacer ante un problema

Si una consulta de derechos falla técnicamente, el sistema permite la operación
por diseño y registra el error. No conviertas un fallo de base en una retirada
manual de derechos: revisa primero el error y la disponibilidad de Supabase.

## Prohibiciones de producción

- No ejecutes `prisma db push` contra producción: el schema actual no declara
  columnas HUB que ya existen en `User`.
- No uses `--accept-data-loss` ni `force_sync`.
- No uses `prisma migrate deploy` para esta cadena histórica sin el runbook y
  una decisión aprobada; la migración histórica de Tumblr no es reproducible
  desde cero.
- El SQL del Lote 1 se aplicó manualmente en Supabase y cualquier reversa exige
  revisión, respaldo y autorización explícita.
