# Paquete de verificación OAuth — Auto Artículos

Fecha de auditoría: 2026-09-03  
Proyecto: `auto-articulos-search-console`  
Número de proyecto: `621677827297`  
Cuenta responsable: `10minuteswebsite@gmail.com`

## Identidad y dominio

- Nombre público que debe coincidir con el sitio: `Auto Artículos`.
- Correo de asistencia y desarrollador: `10minuteswebsite@gmail.com`.
- Página principal: `https://seototal.lasolucionweb.com/acerca-de`.
- Política de privacidad: `https://seototal.lasolucionweb.com/privacidad`.
- Condiciones del servicio: `https://seototal.lasolucionweb.com/terminos`.
- Dominio autorizado verificado: `lasolucionweb.com`.
- `auto-articulos-web.vercel.app` se conserva temporalmente para no romper
  usuarios y callbacks existentes; retirarlo solo después de confirmar la
  migración completa.

## Cliente OAuth web

ID: `621677827297-i3n2scso659s1gbj8gbik0gml943p5o3.apps.googleusercontent.com`

Orígenes autorizados:

```text
https://seototal.lasolucionweb.com
https://auto-articulos-web.vercel.app
```

URI de redireccionamiento autorizadas:

```text
https://seototal.lasolucionweb.com/api/search-integrations/google/callback
https://seototal.lasolucionweb.com/api/business-profile/callback
https://seototal.lasolucionweb.com/api/google-analytics/callback
https://auto-articulos-web.vercel.app/api/search-integrations/google/callback
https://auto-articulos-web.vercel.app/api/business-profile/callback
https://auto-articulos-web.vercel.app/api/google-analytics/callback
```

## Scopes que debe registrar la pantalla de consentimiento

Solo deben solicitarse estos tres scopes, porque son los que usa el código:

```text
https://www.googleapis.com/auth/webmasters
https://www.googleapis.com/auth/business.manage
https://www.googleapis.com/auth/analytics.readonly
```

Justificación propuesta para la revisión (adaptar si Google solicita una
descripción separada por scope):

> Auto Artículos es una herramienta privada para usuarios invitados. Cuando
> un usuario conecta explícitamente su propia cuenta de Google, la aplicación
> usa `webmasters` para mostrar las propiedades de Search Console que ese
> usuario administra, gestionar su sitemap y consultar el estado de
> indexación; usa `analytics.readonly` para consultar informes agregados de
> Google Analytics 4 y priorizar oportunidades de contenido; y usa
> `business.manage` para listar las cuentas y ubicaciones de Google Business
> Profile autorizadas y preparar publicaciones estándar que el usuario revisa
> y aprueba. Los permisos son necesarios para esas funciones visibles y no
> existe una alternativa de menor alcance que permita realizarlas. La
> aplicación no modifica datos de Analytics, no accede a Gmail, Drive ni
> contactos, no solicita contraseñas y no comparte tokens con terceros. El
> acceso se limita a la cuenta conectada, se almacena de forma cifrada y puede
> revocarse en cualquier momento.

## Vídeo de demostración

Pendiente: aportar una URL pública de YouTube que incluya todos los clientes
OAuth del proyecto y muestre, con una cuenta de prueba, el flujo de conexión,
la selección de una propiedad de Search Console, la consulta de Analytics 4,
la selección de una ubicación de Business Profile y la revisión de una
publicación. No se debe inventar una URL.

## Estado comprobado

- Search Console API, Analytics Admin API y Analytics Data API están habilitadas
  y reciben tráfico.
- Las APIs nuevas de Business Profile y Performance están habilitadas; el
  servicio histórico `mybusiness.googleapis.com` (v4) no aparece en el panel.
- Search Console muestra accesible y verificada la propiedad
  `sc-domain:lasolucionweb.com`.
- Google Auth Platform todavía indica marca y acceso a datos no verificados;
  `Prepare for verification` está deshabilitado.
- Los casos GBP `7-6783000042063` y `2-7941000041573` están `In Progress`.

## Lista de cierre

- [ ] Desplegar el commit `7908b01` en `seototal.lasolucionweb.com`.
- [ ] Resolver el error heredado de `verifyMastodonToken` antes del build final.
- [ ] Guardar el nombre exacto `Auto Artículos` y confirmar las URL públicas.
- [ ] Registrar los tres scopes y guardar la justificación.
- [ ] Añadir el vídeo de YouTube.
- [ ] Confirmar que Google habilita `Prepare for verification`.
- [ ] Enviar la solicitud y conservar el número de caso.
- [ ] Esperar la resolución de los casos de Business Profile.

