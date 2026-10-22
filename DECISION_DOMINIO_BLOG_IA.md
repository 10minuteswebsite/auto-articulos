# BLOG IA — Decisión pendiente: ¿qué dominio usamos como «puerta de entrada»?

**Para:** Mario · **De:** Milton (preparado con Claude) · **Fecha:** 21 de octubre de 2026
**Qué se necesita de ti:** elegir una de las opciones de la sección 6. Una decisión, no un trabajo.

---

## 1. Resumen en 30 segundos

BLOG IA le da a cada cliente de SEO Total un blog propio **en su propio subdominio** (por ejemplo `blog.suempresa.com`), para que Google lo indexe y lo posicione **bajo el dominio del cliente**, sin quedar pegado a nosotros.

Para que eso funcione, cada cliente crea **un registro DNS (CNAME)** que dice «mi `blog.` apunta a una dirección de ustedes». Esa dirección tiene que ser **un nombre de dominio nuestro**, administrado en Cloudflare. Es la **«puerta de entrada»**.

**Falta decidir cuál dominio será esa puerta.** Es una decisión que **conviene tomar bien ahora**, porque el nombre queda escrito en el DNS de cada cliente: cambiarlo después obligaría a todos a modificar su registro.

---

## 2. Qué es BLOG IA y qué ya está construido

- Es un módulo **incluido en la suscripción de SEO Total**. SEO Total sigue creando los artículos; BLOG IA los publica en un blog público moderno, rápido y listo para móvil.
- El blog público ya funciona y está desplegado en Cloudflare (probado con un blog de prueba: HTTPS real, sitemaps, `robots.txt`, datos estructurados para Google, respuesta correcta a páginas inexistentes y suspensión del servicio).
- SEO Total ya está conectado a ese blog, y el asistente de configuración para el cliente ya existe.
- **Está oculto a los clientes actuales**: solo lo ven administradores. Nada de esto es visible hoy para nadie más.
- **Lo único que falta para que un cliente real conecte su dominio** es la puerta de entrada de esta decisión.

---

## 3. Cómo funciona, sin tecnicismos

Cada blog de cliente se guarda en **un solo lugar nuestro**. Cuando un visitante escribe `blog.empresa-a.com`, internet necesita saber a dónde mandarlo. El cliente lo resuelve con un registro que apunta a nuestra puerta de entrada, y desde allí Cloudflare reparte cada visitante al blog correcto.

```
Visitante escribe blog.empresa-a.com ─┐
Visitante escribe blog.empresa-b.com ─┼─►  PUERTA DE ENTRADA  ─►  Cloudflare ─► el blog de A, B o C
Visitante escribe blog.empresa-c.com ─┘   (un dominio nuestro,
                                            ej.: edge.dominio.com)
```

### ¿Por qué tiene que ser un dominio nuestro, en Cloudflare?
- Cloudflare solo permite esa «puerta de entrada» con el certificado HTTPS de cada cliente (función llamada *Cloudflare for SaaS*) en un dominio que **vive en nuestra cuenta de Cloudflare**.
- No sirve que el cliente apunte directo a la dirección técnica del blog (`workers.dev`): Cloudflare la rechaza. Ya lo probamos.

---

## 4. Lo que importa: indexación y posicionamiento

| Pregunta | Respuesta |
|---|---|
| ¿Qué dirección ve Google y el visitante? | **Solo la del cliente** (`blog.cliente.com`). |
| ¿Se ve nuestra puerta de entrada en los resultados, en el canonical, en el sitemap o en el código de la página? | **No.** Todo usa el dominio del cliente (comprobado en la prueba real). |
| ¿Se afectan unos blogs con otros? | **No.** Google evalúa por dominio. Cada blog tiene su sitemap, canonical y contenido aislados. |
| ¿Hay garantía de que Google indexe y posicione? | **No**, ni aquí ni en ninguna plataforma. El contenido y el tiempo posicionan. Un subdominio nuevo parte sin autoridad propia. |
| ¿Está probado con un cliente real? | **No todavía.** Está bien construido, pero se confirma con la prueba real en Search Console (sección 9). |
| ¿Qué es lo que sí verán el cliente y los técnicos? | El nombre de la puerta de entrada aparece **una vez** cuando el cliente lo copia en su DNS, y queda en su lista de registros. Un técnico podría descubrirlo consultando el DNS. |

**Lo que se mantiene del cliente:** su dominio, sus enlaces y su historial en Google son **suyos**. Si algún día se va, cambia su registro y mueve su contenido.

---

## 5. Por qué el nombre de la puerta importa tanto

1. **Es permanente en la práctica.** Queda escrito en el DNS de **cada** cliente. Si cambia, cada cliente debe corregirlo.
2. **Se ve una vez.** El cliente lo copia. Si el nombre dice «lasolucionweb» o «totalinfoai», el cliente sabrá de dónde viene. Si en el futuro se quisiera **marca blanca**, conviene un nombre neutro.
3. **Aísla el riesgo.** Para que el blog reciba los dominios de clientes hay que configurar una *ruta* en el dominio de la puerta. Según la documentación de Cloudflare, esa ruta cubre **todo el tráfico de esa zona**. Si fuera el mismo dominio donde viven las aplicaciones de pago, un error pondría esas aplicaciones en riesgo.

---

## 6. Las opciones

| | **A. `lasolucionweb.net`** (el dominio de las aplicaciones) | **B. Un dominio nuevo y neutro** (ej. `blognode.net`) | **C. `totalinfoai.com`** (el que ya tiene Milton) |
|---|---|---|---|
| **Idea** | Usar el dominio de producción | Comprar un dominio solo para esto | Usar el dominio existente |
| **Trabajo previo** | Poco (ya está en Cloudflare) | Poco | **Mucho:** moverlo de GoDaddy a Cloudflare, con su sitio web y su correo en uso |
| **Riesgo para las aplicaciones de pago** (`articulos`, `redes`, `seototal`, `hub`) | **ALTO.** La ruta pasa por todas esas aplicaciones | **Ninguno** | **Ninguno** (su sitio y correo se dejan en «solo DNS», sin pasar por Cloudflare) |
| **Riesgo para el sitio y el correo existentes** | Ninguno | Ninguno | **Medio.** Si en la migración se olvida un registro, se cae el sitio o el correo. Se mitiga copiando y verificando antes de cambiar |
| **Costo** | 0 | ≈ 12 USD al año (sin verificar) | 0 |
| **Neutralidad (marca blanca)** | Nula: dice «lasolucionweb» | **Total** | Parcial: dice «totalinfoai» |
| **Nuestra opinión** | **No recomendada** | **La más simple y segura** | Viable, con más pasos y más cuidado |

### Nuestra recomendación
- **Primera opción: B** (dominio nuevo y limpio). Por unos 12 USD al año se evita mezclar la plataforma con un sitio y un correo en uso, y se obtiene un nombre neutro.
- **Segunda opción: C**, si `totalinfoai.com` es una marca que se va a seguir usando para esto. Milton prefiere C y lo estamos preparando, pero implica más pasos.
- **No usar A.**

---

## 7. Costos de operar el servicio (orden de magnitud)

Cifras tomadas de la auditoría técnica del proyecto (no verificadas hoy con Cloudflare):

- **Dominios de clientes:** Cloudflare incluye **100 sin cargo**; cada uno adicional cuesta **0,10 USD al mes**. Con 1.000 clientes serían ≈ 90 USD al mes.
- **Imágenes de los artículos (IA):** ≈ 0,005 USD por imagen en calidad baja (OpenAI).
- **Plan de Workers:** ya pagado en la cuenta (mínimo 5 USD al mes).
- **Almacenamiento y base de datos:** cantidades pequeñas al inicio; dentro de lo incluido.

---

## 8. Qué pasa con cada opción (si se elige C, el plan sin caída)

Si Mario elige **C** (`totalinfoai.com`), se hace así, sin tiempo de caída:

1. **Inventario** del DNS actual (hecho): sitio web (2 registros A y `www`), correo de GoDaddy (2 registros MX), SPF, DMARC y un registro propio de GoDaddy. No tiene DNSSEC, lo que simplifica el cambio.
2. **Agregar el dominio a Cloudflare** (plan gratuito), que escanea y copia esos registros.
3. **Comparar** lo copiado con el inventario y preguntar directamente a los servidores nuevos de Cloudflare, **antes** de cambiar nada.
4. **Cambiar los servidores de nombres en GoDaddy** (único paso que afecta al dominio, lo hace Milton).
5. **Verificar** que el sitio y el correo siguen funcionando.
6. Recién entonces, activar la puerta de entrada de BLOG IA.

Si se elige **B**, se salta todo lo anterior: se compra el dominio (mejor en Cloudflare Registrar, para que nazca en la cuenta) y se sigue desde el paso 6.

---

## 9. Qué falta por probar, sea cual sea la opción

- **Un cliente real** conectando su subdominio (emisión del certificado, verificación y blog público).
- **Google Search Console:** probar en vivo que Google puede entrar a las páginas, enviar el sitemap y comprobar en unos días que aparecen como «indexadas». Es la prueba que de verdad responde la duda de indexación.
- **Imágenes de portada** guardadas en el almacén de Cloudflare.

---

## 10. Cómo lo hará el cliente (para que Mario lo tenga claro)

El cliente **no mueve su dominio** a Cloudflare, **no entrega contraseñas** y su sitio y correo siguen donde están. Solo hace **una cosa**:

1. Escribe en BLOG IA el subdominio que quiere (`blog.suempresa.com`).
2. BLOG IA **detecta su proveedor** (GoDaddy, Namecheap, Wix…) y le muestra los **pasos exactos** de ese proveedor, con los valores ya escritos.
3. Crea **un registro CNAME**.
4. Pulsa «Verificar conexión».

Si no administra su dominio, puede **enviar las instrucciones por WhatsApp o correo** a quien lo hace. A futuro se puede llegar a **un solo clic** con el estándar *Domain Connect* (GoDaddy, IONOS, Cloudflare, Squarespace…), pero requiere aprobación de cada proveedor y puede tardar semanas.

---

## 11. La decisión que se necesita

**Marca con una X:**

- [ ] **B.** Dominio nuevo y neutro (recomendado). Nombre elegido: `______________________`
- [ ] **C.** Usar `totalinfoai.com` (más pasos, con migración cuidadosa).
- [ ] **A.** Usar `lasolucionweb.net` (no recomendado por riesgo a las aplicaciones de pago).
- [ ] Otra: ___________________________________________

**Además, confirmar:**
- [ ] ¿Es aceptable que el nombre elegido quede visible, una vez, en el DNS de cada cliente? Sí / No
- [ ] ¿Se piensa ofrecer marca blanca en el futuro? Sí / No (si sí, conviene un nombre neutro **desde ahora**)

---

## 12. Estado actual del proyecto

BLOG IA **no es visible para ningún cliente actual**. Está construido, desplegado y probado con datos de prueba, y espera esta decisión para el primer cliente real. Cualquiera de las opciones no afecta a las aplicaciones en producción, salvo la **A**, que las pone en riesgo.
