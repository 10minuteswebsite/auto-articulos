# Auditoría visual triple de separación: Redes y Artículos

Fecha: 2026-10-04  
Entorno: producción, sesión autenticada de prueba  
Direcciones revisadas: `redes.lasolucionweb.com` y `articulos.lasolucionweb.com`

## Alcance y método

Se recorrieron, con navegación visible en el navegador, las vistas del panel, sus rutas directas, el menú y las pantallas de configuración. La misma lista se pasó tres veces:

1. Primera pasada: inventario completo de rutas y revisión de menú.
2. Segunda pasada: recarga limpia de cada ruta y confirmación del contenido.
3. Tercera pasada: recarga estable de las rutas sensibles, menú y enlaces cruzados.

Las tres pasadas reprodujeron los mismos resultados. No se pulsó el botón Día Cero, no se tocaron variables de Vercel, Supabase ni datos de producción.

## Hallazgos confirmados en las tres pasadas

| ID | Hallazgo | Redes | Artículos | Gravedad | Causa o acción |
|---|---|---:|---:|---|---|
| V1 | El encabezado visible dice `SEO TOTAL` en vez de identificar el producto. | Sí | Sí | ALTO | La producción observada no está sirviendo el layout de `origin/main`, que ya calcula `SEO TOTAL REDES`/`SEO TOTAL ARTÍCULOS`. Verificar el destino real del despliegue antes de cambiar código. |
| V2 | Inicio muestra tres tarjetas: `01 Contenido propio`, `02 Contenido generado por IA` y `03 Publica en redes...`. | Sí | Sí | ALTO | El código de `origin/main` filtra las acciones por host, pero la producción observada sirve la versión anterior. |
| V3 | En Redes, la acción social queda numerada `03` en vez de `01`; las tarjetas observadas tampoco tienen el cuadrado 320x320 esperado. | Sí | No aplica | MEDIO | El código actual de `main` ya fija ancho y alto 320 y numera el índice visible; producción no refleja ese código. Debe comprobarse después de que el despliegue correcto llegue al dominio. No se justifica otro cambio de numeración en el código actual. |
| V4 | El menú de ambos hosts muestra las tres publicaciones, incluido el producto contrario. | Sí | Sí | ALTO | La producción observada no aplica el filtro `isVisibleInProduct` que sí está en `DashboardNav.tsx` de `main`. |
| V5 | URLs directas del producto contrario no se redirigen: `/dashboard/configuracion/inicial`, `/dashboard/configuracion/cuenta`, `/dashboard/configuracion/indexacion` quedan accesibles en Redes; `/dashboard/configuracion/redes-sociales` queda accesible en Artículos. | Sí | Sí | ALTO | La producción observada no está aplicando la frontera de `middleware.ts` de `main`. |
| V6 | `Configuración → Conexiones` muestra simultáneamente Analíticas y Difusión en ambos hosts. | Sí | Sí | ALTO | En `ConexionesView.tsx` de `main` el host debe dejar solo Analíticas en Artículos y solo Difusión en Redes; la pantalla viva no coincide. |
| V7 | `Configuración → Contenido` mezcla campos: muestra contenido editorial y fotos/logos de redes en la misma experiencia observada. | Sí | Sí | MEDIO | El código de `main` tiene ramas por host, pero la producción observada muestra la versión anterior. |
| V8 | `Cómo funciona` muestra las tres opciones en ambos productos, incluida la opción del otro producto. | Sí | Sí | ALTO | La versión de `main` ya construye una opción para Redes y dos para Artículos según el host; la producción observada no coincide. |
| V9 | `Historial` muestra simultáneamente `Artículos publicados` y `Publicaciones en redes sociales` en ambos hosts. | Sí | Sí | ALTO | La versión de `main` filtra por host en `historial/page.tsx`; la producción observada no lo está ejecutando. |
| V10 | `Actualizaciones` mezcla novedades de Redes y Artículos en ambos hosts. | Sí | Sí | MEDIO | `actualizaciones/page.tsx` de `main` filtra por `productOfUpdate`; la pantalla viva no coincide. |
| V11 | `Progreso de las publicaciones` aparece como pantalla común y durante la carga no identifica claramente el producto. | Sí | Sí | MEDIO | Debe verificarse después del despliegue correcto; el código de `main` ya tiene mensajes distintos por host. |
| V12 | Las rutas `/dashboard/articulos`, `/dashboard/redes` y `/dashboard/mi-acceso` devolvieron 404 en producción. | Sí | Sí | ALTO | El repositorio en `origin/main` contiene portadas para Artículos y Redes; el resultado indica despliegue distinto o incompleto. `mi-acceso` también debe revisarse en el artefacto que realmente sirve producción. |

## Qué sí coincide en el código de `origin/main`

- `apps/web/src/app/dashboard/layout.tsx` calcula el nombre del producto por host.
- `apps/web/src/app/dashboard/page.tsx` filtra las acciones del inicio por host y pinta tarjetas de 320x320.
- `apps/web/src/components/DashboardNav.tsx` filtra enlaces por producto y conserva “Volver al HUB”.
- `apps/web/src/middleware.ts` contiene la frontera de rutas y devuelve redirección/404 para el producto contrario.
- `ConexionesView.tsx`, `historial/page.tsx`, `actualizaciones/page.tsx` y `como-funciona/page.tsx` tienen filtros por host.

## Plan de reparación

1. Confirmar qué proyecto/despliegue de Vercel está conectado a los tres subdominios. El check de GitHub para `main` terminó correctamente, pero la experiencia viva sigue siendo anterior.
2. Publicar el `origin/main` actual en el proyecto `auto-articulos-web`, que es el proyecto que tiene los dominios. No hace falta tocar variables, base de datos, schema, Supabase ni Día Cero.
3. Comprobar que el despliegue de `main` está realmente asociado a `redes.lasolucionweb.com` y `articulos.lasolucionweb.com`; el check de GitHub por sí solo no basta.
4. Repetir las tres pasadas en ambos hosts: encabezado, inicio, menú, configuración, conexiones, historial, progreso, actualizaciones, “Cómo funciona” y rutas directas.
5. No cerrar el ciclo hasta que las tres pasadas no tengan ningún hallazgo reproducible.

## Resultado de esta auditoría

Resultado: **12 hallazgos reproducibles; 0 pasadas limpias**. No es seguro declarar la separación terminada mientras los subdominios sigan sirviendo el artefacto observado.
