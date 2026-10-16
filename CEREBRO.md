# CEREBRO — Decisión durable HUB, OAuth y dominios

Fecha: 2026-10-16

## Objetivo

Hacer que `seototal` pueda entregar la navegación humana al HUB sin romper callbacks OAuth, sesiones existentes ni APIs técnicas.

## Decisión de diseño

Usar un modelo mixto y conservador:

- Las rutas humanas de `seototal` podrán ir al HUB.
- `/api/*` seguirá atendiendo callbacks técnicos.
- `.com` será el dominio canónico.
- `.net` será una puerta de entrada compatible que se normaliza al `.com` equivalente antes de crear sesión o iniciar OAuth.
- No se cambiarán de entrada las URLs de las consolas OAuth ni se reconectarán integraciones existentes.

## Reparaciones previstas

1. Excluir callbacks y APIs de cualquier redirección humana al HUB.
2. Hacer que `/auth/hub` emita la sesión mediante `applyCookie`.
3. Normalizar las entradas humanas `.net` al `.com` equivalente.
4. Corregir Instagram directo para devolver al origen permitido.
5. Revisar Bing y los demás callbacks directos para que no envíen a `seototal` sin sesión ni acepten destinos arbitrarios.
6. Mantener Tumblr y Composio según su flujo técnico actual, verificando sus destinos reales.

## Alternativa no elegida ahora

Mantener toda la aplicación en `.net` exigiría una sesión/cookie propia de `.net` y transportar el origen mediante estado OAuth firmado o una transacción servidor. Es posible, pero aumenta el riesgo y no es necesario para conservar las conexiones actuales.

## Orden de trabajo

1. Documentar y congelar el punto cero.
2. Auditar y preparar los cambios mínimos.
3. Ejecutar pruebas unitarias, typecheck, build y pruebas funcionales sin autorizar conexiones reales.
4. Publicar desde `main`.
5. Verificar producción y después probar OAuth con una cuenta de prueba autorizada.
6. Actualizar todos los documentos con el resultado real.

## Estado de ejecución

- Punto 1 completado en `main` (`19f8ff5`) y verificado en producción (`dpl_6bzjEAAUEQGwtwkUaR2mWAyDgcRP`).
- La redirección activa solo para visitantes sin sesión en las rutas humanas de `seototal.com`.
- El Punto 2 corrigió `/auth/hub` para usar `applyCookie`; las sesiones emitidas por el HUB ya quedan preparadas para el dominio canónico `.com`.

## Punto 2 completado

- `/auth/hub` usa `applyCookie` desde `b7ce44c`.
- Con `DIA_CERO=on`, la sesión emitida por el HUB es válida en los subdominios `.com` y elimina la cookie host-only antigua.
- Deployment verificado: `dpl_9P62g85S79rBK8sfUN1HCocdoUnw`.
- Próximo punto: probar el retorno con una cuenta/código real del HUB autorizado; no se deben cambiar consolas de proveedores sin evidencia.
