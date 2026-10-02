# Auditoría final del Día Cero

Fecha: 2026-10-02. Se leyó `CONTROL_SEPARACION_SEO_TOTAL.md` desde GitHub y se consultaron todos los PR abiertos del repositorio con `gh pr list --state open --limit 100`.

## Estado de #412

`gh pr checks 412` terminó en verde:

- Vercel: **pass** — deployment completed.
- Vercel Preview Comments: **pass**.

El build local y la pantalla del navegador siguen marcados como NO EJECUTADOS por la restricción EPERM del entorno. Claude dejó constancia de que `tsc`, 176/176 pruebas y el e2e del botón están verificados.

## PR abiertos y destino

| PR | Tema | Destino |
|---:|---|---|
| #442 | Auditoría router Día Cero v2 | **Fusionar documental**; ya corregida sobre #412 |
| #441 | Auditoría router anterior | **Cerrar**; reemplazado por #442 |
| #426 | Manual, traspaso v3 y guía HTML | **Milton: fusionar después de #412** si desea conservar la documentación |
| #415 | Permisos Redes para cuentas nuevas | **Milton: fusionar después de #412** |
| #412 | Botón Día Cero, router, OAuth y cookies | **Milton: fusionar primero**; único PR de código base |
| #411 | Panel Día Cero anterior | **Cerrar o aparcar**; su contenido está consolidado en #412 |
| #410 | Retorno OAuth único | **Cerrar después de fusionar #412**; está incluido en #412 |
| #408 | Plan de pruebas OAuth | **Conservar como documental**; no necesita fusión de código |
| #407 | Manual Día Cero v3 | **Conservar documental** si no se usa #426; evitar duplicar manuales |
| #406 | Router puro | **Cerrar después de #412**; incluido en #412 |
| #405 | SQL quitar prueba 7 días | **Aparcar / plan B**; no ejecutar SQL en producción |
| #402 | Panel interruptores antiguo | **Aparcar**; decisión explícita de C-046 |
| #401 | Adaptador HUB | **Aparcar**; no tocar HUB sin autorización |
| #399 | Regla trial | **Cerrar después de #412**; consolidado en #412 |
| #398 | Adaptador derechos HUB | **Cerrar o aparcar**; Vercel falló y no es necesario para Día Cero |
| #397 | Interruptor trial | **Aparcar**; no activar product_enforcement |
| #396 | Script SQL Día Cero | **Aparcar / plan B**; nunca ejecutar sin orden explícita |
| #394 | Perfil Redes | **Cerrar después de #415**; incluido en #415 |
| #393 | Puerta admin/login | **Aparcar**; no fusionar |
| #392 | Hosts Artículos/Redes | **Cerrar después de #412**; incluido en #412 |
| #387 | Cierre incidente documental | **Cerrar o conservar histórico**; no afecta Día Cero |
| #381 | Manual Día Cero antiguo | **Cerrar**; sustituido por #407/#426 |
| #380 | Checklist Composio | **Aparcar**; fuera del corte actual |
| #372 | Cliente `/api/me` | **Aparcar**; opcional B.7, no fusionar ahora |
| #368 | Schema HUB | **No tocar / esperar decisión de Milton**; fuera del Día Cero |
| #317 | Lote 2 visual | **Aparcar**; depende de la Fase 0 y no es Día Cero |
| #281 | Marcos Redes | **Aparcar**; trabajo anterior no relacionado |
| #248 | Créditos de imagen | **Aparcar**; no relacionado |
| #212 | Registro de despliegue antiguo | **Conservar histórico o cerrar** |
| #208 | Imagen GBP | **Aparcar**; no relacionado |
| #206 | Flujo GBP | **Aparcar**; no relacionado |
| #194 | PostPeer GBP | **Aparcar**; no relacionado |
| #180 | Incidente LinkedIn | **Conservar histórico o cerrar** |
| #146 | Setup inicial | **Aparcar**; no relacionado |
| #125 | Mensajes de error IA | **Aparcar**; no relacionado |
| #113 | Incidente migración | **Conservar histórico o cerrar** |
| #94 | Mensaje cupo diario | **Aparcar**; no relacionado |
| #92 | Temas excluidos | **Aparcar**; no relacionado |
| #83 | MCP OAuth antiguo | **Aparcar**; no tocar Composio/MCP |
| #68 | Categorías temáticas | **Aparcar**; no relacionado |
| #65 | Clasificación temática | **Aparcar**; no relacionado |
| #46 | Timeline fuentes | **Cerrar o aparcar**; deployment fallido y no relacionado |

## Cinco acciones de Milton, en orden y sin jerga

1. Di exactamente **«fusiona #412»**. Es el cambio principal del Día Cero; su despliegue de Vercel ya aparece en verde.
2. Después di exactamente **«fusiona #415»**. Así las cuentas nuevas reciben el perfil de Redes en el orden correcto.
3. Decide si quieres conservar la documentación de #426 o usar #407; recomiendo #426 porque reúne manual, traspaso y guía HTML.
4. Elige la fecha del corte y, ese día, abre Administración → Día Cero, lee la simulación y pulsa Activar solo después de confirmar que las cifras son razonables.
5. En Vercel crea `DIA_CERO=on` y haz Redeploy; comprueba las tres direcciones y una conexión desde Redes. Si falla algo, pulsa Revertir y borra la variable.

## Reglas que siguen vigentes

`product_enforcement` permanece apagado. No se ejecutan SQL, migraciones, cambios del HUB ni acciones de producción sin orden literal de Milton. La limpieza de cookies OAuth en errores queda como el último PR pequeño de código, antes de B.7.

**COLA B.8 COMPLETADA. COLA VACÍA después de esta entrega documental.**
