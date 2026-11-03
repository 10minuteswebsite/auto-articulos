# DISEÑO — Modo complementario del botón 2 (CONTENIDO GENERADO POR IA)

Estado: PARA APROBAR. No se ha escrito código. Fecha: 2026-11-02. Pedido de Milton: promesa mínima de **3 títulos por análisis**; más es bonus; si ni así se llega a 3, **bandera roja**.

## 1. Por qué
Medido en dos cuentas (Lorena, Mónica): de 32–48 propuestas por análisis, la mitad o más repite lo ya publicado, otras chocan con los temas excluidos de la cuenta y otras no citan su consulta. Quedan 0–4 títulos. El botón 2 solo propone temas con demanda real aún sin cubrir; cuando se agota, no puede inventar. El modo complementario cubre ese hueco **sin esconderlo**.

## 2. Reglas de oro
1. La evidencia real (Search Console, Bing, GA4) siempre va primero. El modo complementario NO corre si el análisis ya dejó 3 o más.
2. Lo complementario se marca visible: «Idea sin evidencia de demanda». Nunca se presenta como si tuviera búsquedas.
3. Los temas excluidos de la cuenta se respetan siempre (filtro fino de hoy, incluida la revisión por IA de lo dudoso).
4. Pasa por la guardia de ángulos (parecidos a lo publicado, al sitio y a lo ofrecido) y por la regla de años recientes.
5. Completa solo hasta 3 (no inunda). Costo acotado: una llamada de IA, solo cuando faltan títulos.
6. Si algo falla, el análisis se entrega exactamente como hoy.

## 3. Flujo
1. Análisis con evidencia (como hoy, con la segunda pasada).
2. Si quedan menos de **3** títulos y hay categorías: UNA llamada de IA que propone ideas long tail por categoría a partir de: nombre y ejemplos publicados de la categoría, ubicaciones declaradas (cliente + negocio), temas excluidos, títulos ya existentes (para no repetirlos).
3. Cada idea pasa por: duplicado exacto, exclusión fina, año, guardia de ángulos. Se guarda con `rationale` honesto («Idea propuesta por la IA a partir de tu negocio; todavía no hay búsquedas registradas») y la marca de sin evidencia.
4. Se entregan solo las necesarias hasta llegar a 3.
5. Si tras todo esto siguen siendo menos de 3 → **bandera roja** (sección 4).

## 4. Bandera roja
- Para **Milton (administrador)**: queda registrada en el panel «Guardia de ángulos» → reportes de la cuenta, con el motivo en español claro: cuántas propuestas se repetían, cuántas chocaban con exclusiones, cuántas no citaban consulta. Sin migración: se usa la tabla de reportes que ya existe.
- Para el **usuario**: un mensaje simple y sin códigos: «Hoy encontramos N ideas nuevas. Tu sitio ya cubre casi todos los temas que la gente busca. Puedes ampliar los temas de tu negocio o revisar tus temas excluidos.»
- Interpretación asumida (confirmar): «red flag» = aviso visible para ti + mensaje claro al usuario. No bloquea nada.

## 5. Costo y límites
- Una llamada extra (≈ 3–5 centavos) solo cuando faltan títulos. Tope: 2 por cuenta al día y 40 al día en total (ajustable).
- Interruptor de administrador con tres estados: apagado / sombra (calcula y registra sin mostrar) / activo, igual que la guardia.

## 6. Riesgos y mitigación
| Riesgo | Mitigación |
|---|---|
| Ideas de menor calidad al no tener datos | Marca visible; el usuario elige; solo completa hasta 3 |
| Canibalización | Guardia de ángulos + duplicados exactos contra lo publicado, el sitio y lo ofrecido |
| Publicar algo excluido | Filtro fino de exclusiones + IA en lo dudoso; si la IA falla, se excluye |
| Costo | Una llamada, solo si faltan, con topes |
| Confundir con evidencia real | Texto y marca propios en la tarjeta |

## 7. Fases
1. **Fase 1 (sin IA):** promesa mínima 3 (hoy la segunda pasada apunta a 5) y bandera roja con motivos. Se prueba en Mónica y Lorena.
2. **Fase 2:** modo complementario en **sombra** (calcula y registra, no muestra). Se revisa con reportes reales.
3. **Fase 3:** activar por porcentaje (10 → 50 → 100) solo con tu OK.
Cada fase: pruebas, manual actualizado, PR, verificación en producción.

## 8. Decisiones que necesito de Milton
1. ¿«Red flag» = aviso para ti + mensaje al usuario? (propuesto)
2. Las ideas sin evidencia se **proponen** y el usuario elige (como hoy); no se publican solas. (propuesto)
3. ¿Aprobada la Fase 1 para empezar ya?
