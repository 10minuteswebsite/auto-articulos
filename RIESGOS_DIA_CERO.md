# Riesgos del Día Cero

Documento B.3 de C-046. Está escrito para decidir rápido qué mirar y cómo volver atrás. La reversa de un punto debe hacerse sin borrar datos ni cambiar el interruptor global sin orden de Milton.

| # | Riesgo | Probabilidad | Efecto | Cómo aparece | Reversa de Milton (una línea) |
|---:|---|---|---|---|---|
| 1 | Una persona entra al producto equivocado | Media | Ve una pantalla que no corresponde | `/api/me` muestra un producto distinto al esperado o el menú clasifica mal la ruta | Pedir que se desactive temporalmente la vista por productos para la cuenta afectada |
| 2 | Una persona legítima ve un bloqueo | Media | No puede trabajar aunque sus datos siguen intactos | Pantalla “No tienes acceso” después de activar derechos | Volver el enforcement a `off` y revisar el derecho de esa cuenta |
| 3 | La interfaz permite pasar mientras el servidor ya bloquea | Baja/Media | Confusión, pero no pérdida de datos | La API devuelve 403 después de que la pantalla visual deja pasar | Mantener `off` y revisar el endpoint concreto antes de reintentar |
| 4 | Una cookie OAuth temporal queda hasta expirar | Alta | El siguiente intento puede parecer extraño | Fallo de `state`, `code` o intercambio sin `clearCookie` en error | Esperar la expiración o borrar la cookie desde el navegador; no tocar conexiones guardadas |
| 5 | Un proveedor rechaza el callback | Media | No se puede conectar una cuenta | Error `redirect_uri_mismatch` o callback en host inesperado | Registrar el host exacto en la consola del proveedor y repetir una conexión |
| 6 | Una red no aprobada aparece pero no permite publicar | Media | La persona cree que la conexión es suficiente | `socialPublishingApproved` es falso y `ModuleGuard` muestra bloqueo | Aprobar la red o dejarla desactivada; no cambiar permisos globales |
| 7 | Historial o progreso mezclan Artículos y Redes | Alta | Se interpreta mal qué se está publicando | Las pantallas compartidas aún consultan ambos productos | Mantener la vista actual y comunicar “compartida” hasta completar el filtro |
| 8 | Un error leyendo derechos deja pasar en modo apagado | Baja | No hay bloqueo, pero se retrasa la detección | `/api/me` falla y la guardia deja pasar por seguridad | Mantener `product_enforcement=off` y revisar logs antes de cambiar nada |
| 9 | Un administrador actuando como otra cuenta ve un resultado distinto | Baja | Diagnóstico confuso | La cuenta actuada y el administrador tienen derechos diferentes | Salir de la suplantación y comprobar primero la cuenta real |
| 10 | Un documento de control pierde entradas por una actualización vieja | Media | Se pierde coordinación entre Claude y Codex | El archivo publicado ya no contiene entradas anteriores | Usar solo `CONTROL_CODEX_ENTRADAS.md` para Codex y no reemplazar el control compartido |

## Orden recomendado de vigilancia

Primero revisar bloqueos falsos y callbacks OAuth; después la clasificación de menú y los datos compartidos. El interruptor de enforcement sigue apagado hasta que los derechos, las rutas y la reversa estén comprobados.

## Regla de seguridad

Ningún riesgo se corrige borrando usuarios, conexiones, artículos o redes. Si una corrección no es reversible, se marca **NO EJECUTADA** y se pide una decisión explícita.
