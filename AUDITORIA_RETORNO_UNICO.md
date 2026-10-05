# Auditoría B.1 — retorno único del PR #410

Fecha: 2026-10-02
Alcance: revisión estática del código del PR #410 (`fd2395e8`), sin cambiar código de aplicación.

## Criterios

- La URL de callback que se registra en el proveedor debe ser la misma que se envía al iniciar OAuth.
- La cookie de `state` debe crearse con `applyCookie` y limpiarse con `clearCookie`; en Twitter también deben existir y limpiarse `state` y `verifier`.
- Los callbacks no deben construir retornos con `request.url`; deben usar el origen validado por `oauthReturnBase`.
- Bing debe conservar su URI canónica y resolverla con `getOAuthRedirectUri`.
- Google Search Console, Google Analytics y Google Business Profile deben conservar `returnTo` cuando corresponda.

## Resultado por proveedor

| Proveedor | Callback único connect → callback | Cookie segura | `request.url` en callback | `returnTo` / nota | Resultado |
|---|---|---|---|---|---|
| Tumblr | ✅ `oauthCallbackUri` en connect: `connect/route.ts:17`; callback: `callback/route.ts:23` | ⚠ `applyCookie:20`; `clearCookie:38`; no se limpia en las salidas de error | ✅ Las redirecciones usan `oauthReturnBase`: 18, 37, 43 | No aplica | ⚠ |
| Twitter/X | ✅ `oauthCallbackUri`: connect 16; callback 32 | ✅ `applyCookie` para state/verifier: 35, 43; ambos `clearCookie`: 59–60 | ✅ Retornos con `oauthReturnBase`: 19, 26, 57, 66 | PKCE verificado: verifier 43 y limpieza 60 | ✅ |
| LinkedIn | ✅ `oauthCallbackUri`: connect 16; callback 26 | ⚠ `applyCookie:21`; `clearCookie:51`; no se limpia en error | ✅ `oauthReturnBase`: 20, 49, 57 | No aplica | ⚠ |
| Pinterest | ✅ `oauthCallbackUri`: connect 19; callback 26 | ⚠ `applyCookie:22`; `clearCookie:34`; no se limpia en error | ✅ `oauthReturnBase`: 16, 22, 33, 39 | No aplica | ⚠ |
| Blogger | ✅ `oauthCallbackUri`: connect 16; callback 20 | ⚠ `applyCookie:19`; `clearCookie:27`; no se limpia en error | ✅ `oauthReturnBase`: 17, 26, 32 | No aplica | ⚠ |
| Bing | ✅ URI calculada con `getOAuthRedirectUri`: connect 24; callback 39 | ⚠ `applyCookie:35`; `clearCookie:89`; no se limpia en error | ✅ `oauthReturnBase`: 22, 87, 99 | ✅ conserva `config.redirectUri` como URI canónica: 24, 39 | ⚠ |
| Threads | ✅ `oauthCallbackUri`: connect 16; callback 27 | ⚠ `applyCookie:21`; `clearCookie:52`; no se limpia en error | ✅ `oauthReturnBase`: 20, 50, 58 | No aplica | ⚠ |
| Instagram/Facebook | ✅ `oauthCallbackUri`: connect 16; callback 27 | ⚠ `applyCookie:21`; `clearCookie:69`; no se limpia en error | ✅ `oauthReturnBase`: 20, 67, 75 | No aplica | ⚠ |
| Google Search Console | ✅ URI calculada con `getOAuthRedirectUri`: connect 19; callback 29 | ⚠ `applyCookie:34`; `clearCookie:61`; no se limpia en error | ✅ `oauthReturnBase`: 22, 58, 66 | ✅ `returnTo` via state: connect 14, 20; callback 48–58 | ⚠ |
| Google Analytics | ✅ URI calculada con `getOAuthRedirectUri`: connect 15; callback 24 | ⚠ `applyCookie:19`; `clearCookie:37`; no se limpia en error | ✅ callback usa `oauthReturnBase`: 15, 38 | ✅ `returnTo` dentro de state: connect 10, 15; callback 29–31 | ⚠ |
| Google Business Profile | ✅ URI calculada con `getOAuthRedirectUri`: connect 17; callback 31 | ⚠ `applyCookie:31`; `clearCookie:64`; no se limpia en error | ✅ `oauthReturnBase`: 25, 62, 69 | No hay `returnTo` propio; retorno fijo de conexiones: callback 62 | ⚠ |

## Hallazgos

1. **No se encontró `request.url` dentro de los callbacks auditados.** Los callbacks construyen sus destinos con `oauthReturnBase(request)`. Las apariciones de `request.url` detectadas en algunos archivos son de rutas `connect` para mensajes de configuración, no de redirecciones de callback.
2. **El estado y la URI de callback se protegen correctamente en la ruta normal.** Twitter/X cumple además la limpieza de las dos cookies PKCE.
3. **Hallazgo real común:** cuando falla `state`, falta `code` o falla el intercambio, la mayoría de callbacks redirigen sin llamar `clearCookie` para la cookie de estado. Esto deja una cookie temporal hasta su expiración. Es una corrección pequeña y segura, pero no la aplico dentro de esta auditoría porque B.1 pide auditar primero y la corrección debe ir en un PR separado.
4. **Google, Analytics y Business Profile usan `getOAuthRedirectUri(request, path, config.redirectUri)` en ambos lados.** Es compatible con la URI canónica configurada, pero debe verificarse en cada consola que el valor final sea el host actual/registrado; no se debe sustituir a ciegas por `oauthCallbackUri`.

## Recomendación

Abrir un PR pequeño para limpiar la cookie de estado en todas las salidas de error OAuth, manteniendo el mismo `path: "/"`. No se abre automáticamente en B.1 porque primero debe quedar explícita la decisión sobre si la limpieza en error se exige como requisito de Dia Cero.

Comprobaciones ejecutadas:

```text
rg -n 'applyCookie|clearCookie|oauthCallbackUri|oauthReturnBase|rememberOAuthOrigin|request\.url|getOAuthRedirectUri|returnTo|verifier|state' apps/web/src/app/api apps/web/src/lib -g '*.ts'
```
