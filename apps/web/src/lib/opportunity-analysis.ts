import type { GoogleSearchAnalyticsRow } from "@auto-articulos/shared";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

interface OpportunityAnalysisGroup {
  categoryId: string;
  rationale: string;
  impressions: number;
  clicks: number;
  titles: Array<{ text: string; rationale: string }>;
}

export type OpportunityAnalysisResult =
  | { status: "ok"; groups: OpportunityAnalysisGroup[] }
  | { status: "no_new" };

const COUNTRY_NAMES: Record<string, string> = {
  usa: "Estados Unidos",
  mex: "México",
  col: "Colombia",
  ven: "Venezuela",
  esp: "España",
  arg: "Argentina",
  per: "Perú",
  ecu: "Ecuador",
  chl: "Chile",
  dom: "República Dominicana",
  gtm: "Guatemala",
  hnd: "Honduras",
  slv: "El Salvador",
  nic: "Nicaragua",
  cri: "Costa Rica",
  pan: "Panamá",
  pri: "Puerto Rico",
  bol: "Bolivia",
  ury: "Uruguay",
  pry: "Paraguay",
  cub: "Cuba",
  bra: "Brasil",
  can: "Canadá",
  gbr: "Reino Unido",
  fra: "Francia",
  deu: "Alemania",
  ita: "Italia",
};

function normalizeTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractYears(value: string): string[] {
  return value.match(/\b(?:19|20)\d{2}\b/g) ?? [];
}

// Garantía determinista ABSOLUTA, independiente de la evidencia (7/9/2026,
// pedido explícito de Milton tras encontrar "...Comparativa 2023" en una
// corrida real en 2026): que un año aparezca en alguna fila de evidencia NO
// alcanza para justificarlo en un título nuevo si ese año ya quedó viejo —
// un artículo publicado HOY con un año de hace 3 años se ve desactualizado
// sin importar qué tan real sea la consulta que lo originó (Search Console
// puede seguir mostrando una consulta antigua "seguro salud 2023" con
// impresiones reales incluso hoy). Solo se permite el año actual, el
// anterior y el siguiente (cubre "guías 2025/2026/2027" sin quedar
// desactualizado ni inventar el futuro lejano).
function isYearAcceptablyRecent(year: string): boolean {
  const currentYear = new Date().getUTCFullYear();
  const parsed = Number(year);
  return parsed >= currentYear - 1 && parsed <= currentYear + 1;
}

const INTENT_FILLER_WORDS = new Set([
  "al", "algunas", "como", "completa", "completo", "comunes", "con",
  "consejos", "de", "el", "en", "errores", "guia", "las", "lo", "los",
  "para", "pasos", "practica", "que", "sobre", "todo", "tu", "una", "un",
  "y", "evitarlos", "evitar", "salud", "forma", "formas", "necesitas", "hacer",
  "despues", "antes", "tras", "cuando", "inmigrantes", "inmigrante",
]);

function stemIntentToken(token: string): string {
  const canonical: Record<string, string> = {
    elegir: "seleccion",
    elige: "seleccion",
    mejor: "seleccion",
    mejores: "seleccion",
    opciones: "seleccion",
    errores: "problema",
    error: "problema",
    problemas: "problema",
    soluciones: "problema",
  };
  if (canonical[token]) return canonical[token];
  if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function intentTokens(value: string): Set<string> {
  return new Set(
    normalizeTitle(value)
      .split(" ")
      .filter((token) => token.length > 2 && !INTENT_FILLER_WORDS.has(token))
      .map(stemIntentToken),
  );
}

function tokenSetsOverlap(
  left: Set<string>,
  right: Set<string>,
  minTokens: number,
  minRatio: number,
): boolean {
  if (left.size < minTokens || right.size < minTokens) return false;
  const intersection = [...left].filter((token) => right.has(token)).length;
  // La intersección sobre el conjunto menor detecta variantes que solo
  // agregan formato, ubicación o perfil a la misma necesidad principal.
  const smaller = Math.min(left.size, right.size);
  return intersection >= minTokens && intersection / smaller >= minRatio;
}

// Firma estructurada de intención: el modelo declara, por cada título, un
// "needKey" corto (objeto + contexto + perfil + ubicación real, SIN verbo ni
// formato) que representa la necesidad que resuelve. Al ser una etiqueta
// deliberadamente compacta y ya limpia de ruido (a diferencia del título
// completo, donde "mudarse" vs "mudarte" o "elegir" vs "entender" rompen la
// comparación léxica), el cruce de tokens entre dos needKey es una señal de
// canibalización mucho más confiable que compararlos por el título crudo.
interface IntentSignature {
  needKeyNormalized: string | null;
  tokens: Set<string>;
  titleTokens: Set<string>;
  source: string;
  // Titulo geolocalizado (paso dedicado cliente x negocio): ver nota en
  // collidesWithIntent sobre por que se excluye del respaldo por texto
  // visible completo.
  isGeoLocationCombo: boolean;
}

function buildIntentSignature(
  source: string,
  needKey?: string,
  isGeoLocationCombo = false,
): IntentSignature {
  const key = needKey?.trim();
  return {
    needKeyNormalized: key ? normalizeTitle(key) : null,
    tokens: intentTokens(key && key.length > 0 ? key : source),
    // Tokens del titulo visible, SIEMPRE calculados (no solo cuando falta
    // needKey): sirven de respaldo independiente del needKey mas abajo.
    titleTokens: intentTokens(source),
    source,
    isGeoLocationCombo,
  };
}

function collidesWithIntent(
  candidate: IntentSignature,
  existing: IntentSignature[],
): boolean {
  for (const signature of existing) {
    // Coincidencia exacta de needKey: la señal más fuerte, independiente del
    // umbral de tokens (dos títulos que declaran la MISMA necesidad nunca
    // pueden coexistir, sin importar cuán distinto sea el texto visible).
    if (
      candidate.needKeyNormalized &&
      signature.needKeyNormalized &&
      candidate.needKeyNormalized === signature.needKeyNormalized
    ) {
      return true;
    }
    // CORRECCION 2026-09-09: Si AMBOS tienen needKey y son DISTINTOS, usar
    // umbral RELAJADO (0.5) para permitir LONGTAIL legítimo que comparte
    // palabras pero tiene necesidades distintas (ingredientes vs proceso).
    // Esto confía en que needKey distintos = necesidades distintas, sin requerir
    // similitud de tokens baja.
    const minTokens = 3;
    let minRatio = 0.67;
    if (candidate.needKeyNormalized && signature.needKeyNormalized) {
      // Si ambos tienen needKey explícito (ambos declarados por OpenAI),
      // el modelo ya filtró duplicados obvios. Bajar umbral para LONGTAIL.
      minRatio = 0.5;
    }
    // EXCEPCION 2026-09-17 (mismo hallazgo real que la de mas abajo): dos
    // needKey geolocalizados difieren, por diseño, solo en la ubicacion
    // (ej. "invertir_propiedad_miami_hispano_colombia" vs
    // "..._hispano_mexico") — con needKey cortos, ese unico token distinto
    // no basta para bajar la razon de solapamiento del umbral relajado, así
    // que sin esta excepcion el mismo bug de "colision falsa" reaparece aqui
    // aunque ya se arreglo el respaldo por texto visible completo.
    if (
      !(candidate.isGeoLocationCombo && signature.isGeoLocationCombo) &&
      tokenSetsOverlap(candidate.tokens, signature.tokens, minTokens, minRatio)
    ) {
      return true;
    }
    // Respaldo determinista 2026-09-16 (hallazgo real: "Comparativa de
    // seguros de salud en Miami... para inmigrantes" vs "Comparativa de
    // seguros médicos en Miami: ¿Cuál es el mejor para ti?" pasaron como
    // no-colisión porque sus needKey, tras filtrar palabras genéricas del
    // dominio como "salud"/"inmigrante", quedaban con muy pocos tokens
    // comparables). El needKey es autodeclarado por el modelo y puede
    // divergir aunque el titulo visible sea, en esencia, el mismo. Se
    // compara tambien el texto visible completo, con un umbral algo mas
    // estricto que el relajado de needKey, para no depender solo de que
    // el modelo haya etiquetado bien la necesidad.
    // EXCEPCION 2026-09-17 (mismo diagnostico real de Ignacio Cubas que
    // encontro el bug de rationaleHasQuotedEvidence en geo): dos titulos
    // geolocalizados solo difieren, por diseño, en la ubicacion de cliente
    // ("...si vivo en Colombia" vs "...si vivo en Mexico") — el resto de la
    // frase es el mismo template a proposito. Ese es precisamente el patron
    // que este respaldo por texto crudo esta hecho para atrapar, así que
    // sin esta excepcion descarta como "duplicados" combinaciones que la
    // regla de geolocalizacion (mas abajo en el prompt) declara
    // explicitamente como necesidades distintas ("cada combinacion
    // cliente+negocio distinta cuenta como una necesidad realmente
    // distinta"). Ya se verifico por separado (titleUsesDeclaredGeoCombo)
    // que cada titulo geo usa una combinacion real y unica; el needKey
    // (que SI incluye ambas ubicaciones) sigue protegiendo contra que el
    // modelo repita la misma combinacion dos veces.
    if (
      !(candidate.isGeoLocationCombo && signature.isGeoLocationCombo) &&
      tokenSetsOverlap(candidate.titleTokens, signature.titleTokens, 3, 0.6)
    ) {
      return true;
    }
  }
  return false;
}

// Hallazgo real 2026-09-29: el respaldo de arriba (tokenSetsOverlap) exige al
// menos 3 tokens sustantivos en AMBOS lados para poder comparar por
// solapamiento. Cuando el needKey o el título visible quedan con menos de 3
// tokens tras filtrar palabras de relleno del dominio (ej. "seguro_salud_
// inmigrante_miami" queda en solo "seguro"+"miami"), el respaldo se abstiene
// por completo (ni compara) en vez de exigir un umbral más estricto — y no
// existe ningún umbral numérico que separe ahí un duplicado real
// (needKey con un sinónimo, ej. "seguro" vs "poliza") de una necesidad
// genuinamente distinta que solo comparte una ciudad (ej. "seguro" vs
// "trabajo" en la misma ciudad): ambos casos dan la MISMA proporción de
// solapamiento. Probar con un umbral distinto no distingue uno del otro,
// solo cambia cuál de los dos se rompe. La única manera correcta de decidir
// eso es razonar el significado, no contar palabras — así que en vez de una
// tabla de sinónimos o un umbral más agresivo, estos casos se le preguntan
// directamente al modelo (ver reasonAboutAmbiguousCollisions más abajo).
// Esta función solo detecta DETERMINÍSTICAMENTE cuáles pares están en esa
// zona ciega (comparten al menos un token pero uno de los dos lados no llega
// a 3), sin decidir nada por sí sola.
function findAmbiguousIntentMatches(
  candidate: IntentSignature,
  existing: IntentSignature[],
): IntentSignature[] {
  const MIN_TOKENS_FOR_DETERMINISTIC_COMPARISON = 3;
  const matches: IntentSignature[] = [];
  for (const signature of existing) {
    // Mismo criterio de exclusión que collidesWithIntent: dos combos
    // geolocalizados solo difieren por diseño en la ubicación declarada, no
    // hace falta preguntarle nada al modelo sobre ese caso.
    if (candidate.isGeoLocationCombo && signature.isGeoLocationCombo) continue;
    // Si el needKey ya coincidió exacto, collidesWithIntent ya lo habría
    // marcado como colisión antes de llegar aquí; no hace falta preguntar.
    if (
      candidate.needKeyNormalized &&
      signature.needKeyNormalized &&
      candidate.needKeyNormalized === signature.needKeyNormalized
    ) {
      continue;
    }
    const needKeySharedTokens = [...candidate.tokens].filter((token) =>
      signature.tokens.has(token),
    ).length;
    const needKeyInBlindSpot =
      needKeySharedTokens > 0 &&
      (candidate.tokens.size < MIN_TOKENS_FOR_DETERMINISTIC_COMPARISON ||
        signature.tokens.size < MIN_TOKENS_FOR_DETERMINISTIC_COMPARISON);

    const titleSharedTokens = [...candidate.titleTokens].filter((token) =>
      signature.titleTokens.has(token),
    ).length;
    const titleInBlindSpot =
      titleSharedTokens > 0 &&
      (candidate.titleTokens.size < MIN_TOKENS_FOR_DETERMINISTIC_COMPARISON ||
        signature.titleTokens.size < MIN_TOKENS_FOR_DETERMINISTIC_COMPARISON);

    if (needKeyInBlindSpot || titleInBlindSpot) {
      matches.push(signature);
    }
  }
  return matches;
}

// Llamada corta y aparte a OpenAI (no la principal de análisis) para
// resolver, con juicio real, los casos que caen en la zona ciega de arriba.
// Solo se dispara cuando de verdad hay ambigüedad (pocos casos por corrida);
// si falla o no se puede interpretar, se asume que NO colisiona (mismo
// criterio "no bloquear de más" que ya rige el resto del archivo) en vez de
// descartar un título real por un error de red.
async function reasonAboutAmbiguousCollisions(
  candidate: { text: string; needKey?: string },
  ambiguous: IntentSignature[],
  apiKey: string,
): Promise<Set<number>> {
  if (ambiguous.length === 0) return new Set();
  const prompt = `Eres un editor SEO experto. Decide, para cada titulo de la LISTA, si representa REALMENTE LA MISMA necesidad de busqueda que el TITULO NUEVO (mismo objeto + contexto + perfil + ubicacion real que busca el usuario), aunque usen palabras distintas o sinonimos — o si es una necesidad genuinamente distinta aunque comparta alguna palabra suelta (como una misma ciudad).

Ejemplo de MISMA necesidad (colisiona) aunque cambien las palabras: "mejor seguro de salud para inmigrantes en Miami" y "mejor poliza de salud para inmigrantes en Miami" — seguro y poliza son el mismo producto para el mismo perfil y ciudad.
Ejemplo de necesidad DISTINTA (no colisiona) aunque compartan una palabra: "seguro de salud en Florida" y "trabajos en el sector salud en Florida" — uno busca un seguro, el otro un empleo; comparten la ubicacion pero no la necesidad.

TITULO NUEVO:
texto: "${candidate.text}"
needKey declarado: ${candidate.needKey ?? "(no declarado)"}

LISTA (titulos ya aceptados en esta corrida):
${JSON.stringify(ambiguous.map((item, index) => ({ indice: index, texto: item.source, needKey: item.needKeyNormalized })))}

Responde SOLO JSON valido: {"mismaNecesidadIndices": [indices de la LISTA que son la MISMA necesidad que el TITULO NUEVO; lista vacia si ninguno]}`;

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    if (!response.ok) return new Set();
    const raw = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as { mismaNecesidadIndices?: unknown };
    if (!Array.isArray(parsed.mismaNecesidadIndices)) return new Set();
    return new Set(
      parsed.mismaNecesidadIndices.filter(
        (value): value is number =>
          typeof value === "number" && value >= 0 && value < ambiguous.length,
      ),
    );
  } catch (err) {
    console.error(
      "reasonAboutAmbiguousCollisions: fallo la consulta de juicio, se asume que no colisiona:",
      err,
    );
    return new Set();
  }
}

// Garantía determinista 2026-09-16 (hallazgo real: se coló un título -
// "Relación entre seguros de vida y salud en Miami" - cuyo rationale no
// citaba ninguna consulta, página o cluster real, solo decía "una necesidad
// que no está cubierta"). El prompt ya exige citar textualmente entre
// comillas la evidencia real que respalda cada título; esta función hace esa
// exigencia verificable en código en vez de confiar solo en que el modelo la
// cumpla.
function rationaleHasQuotedEvidence(rationale: string): boolean {
  return /['"‘’“”]([^'"‘’“”]{4,})['"‘’“”]/.test(
    rationale,
  );
}

// Bug real encontrado 17/9/2026 (cuenta de Ignacio Cubas, diagnóstico con
// evidencia real vía GitHub Actions): rationaleHasQuotedEvidence se estaba
// aplicando también a los títulos del PASO DEDICADO DE GEOLOCALIZACIÓN
// (cliente x negocio), cuyo prompt (ver más abajo) nunca les pide citar una
// consulta de Search Console/GA/Bing — su "evidencia" es que combinan
// EXACTAMENTE una ubicación de cliente y una de negocio ya declaradas por
// el dueño de la cuenta (ver REGLA OBLIGATORIA DE GEOLOCALIZACION en el
// prompt principal: estas ubicaciones NO necesitan evidencia de datos, son
// reales por declaración directa). Resultado real: los 6-7 títulos long
// tail geolocalizados que el paso dedicado SÍ generaba correctamente para
// Ignacio Cubas se descartaban TODOS, en silencio, porque su rationale
// nunca traía una cita entre comillas — no por falta de evidencia real, sino
// porque se les exigía el tipo de evidencia equivocado. Esta función es el
// chequeo determinista equivalente para esa fuente: en vez de una cita
// textual, exige que el título use de verdad al menos una ubicación de
// cliente Y una de negocio de las listas declaradas (comparación normalizada,
// sin acentos/mayúsculas), para no perder la garantía de "nada inventado".
function titleUsesDeclaredGeoCombo(
  text: string,
  clientLocations: string[],
  businessLocations: string[],
): boolean {
  const normalizedTitle = normalizeTitle(text);
  const usesAny = (locations: string[]) =>
    locations.some((location) => {
      const normalizedLocation = normalizeTitle(location);
      return normalizedLocation.length > 0 && normalizedTitle.includes(normalizedLocation);
    });
  return usesAny(clientLocations) && usesAny(businessLocations);
}

function hasContextualEvidenceForYear(
  title: string,
  year: string,
  rows: GoogleSearchAnalyticsRow[],
): boolean {
  const titleTokens = intentTokens(title);
  return rows.some((row) => {
    const serialized = JSON.stringify(row);
    if (!serialized.includes(year)) return false;
    const evidenceTokens = intentTokens(serialized);
    const shared = [...titleTokens].filter((token) => evidenceTokens.has(token));
    return shared.length >= 2;
  });
}

const PROMPT_HEADER = [
  "Actua como estratega SEO experto y analista de datos de busqueda. Tu objetivo es encontrar TODAS las oportunidades posibles para aumentar el trafico organico del usuario, siendo creativo pero siempre basado en evidencia real de los datos proporcionados.",
  "",
  "FILOSOFIA DEL ANALISIS:",
  "- No busques solo lo obvio; analiza patrones, tendencias y oportunidades ocultas",
  "- Infieren temas relacionados basandote en consultas y paginas reales",
  "- Expande cada tema validado hacia un universo de subtemas relacionados que generen un efecto bola de nieve",
  "- Piensa como un usuario real: que mas buscaria alguien que ya busco esto?",
  "- La meta es VOLUMEN de oportunidades reales, no solo las mas faciles",
  "",
  "REGLA DE ASIGNACION DE CATEGORIA (ESTRICTA, exige afinidad tematica real):",
  "- La categoria es el lugar del blog donde el articulo queda archivado. La decision de SI un tema se escribe depende de que exista evidencia real (Search Console, Google Analytics o Bing) y de que no canibalice una necesidad ya cubierta (ver regla de cero canibalizacion mas abajo) — pero la categoria elegida debe tratar de VERDAD el mismo tema que el titulo, no ser simplemente 'la menos lejana' de las disponibles.",
  "- PROHIBIDO descartar una consulta, pagina o tendencia real con evidencia solo por una diferencia de REDACCION o de PALABRAS EXACTAS frente al nombre de la categoria (ej: un titulo sobre deducibles va en 'Deducibles' aunque no repita esa palabra literal). Esa flexibilidad es solo de vocabulario, nunca de tema.",
  "- PROHIBIDO forzar un titulo en una categoria cuyo TEMA real es otro solo porque es la 'mas parecida' disponible (ej: una consulta real sobre propiedades en Orlando NO va en una categoria de 'Casas en Miami' — son ciudades y mercados distintos, aunque ambas sean bienes raices). Si ninguna categoria permitida trata de verdad el mismo tema/ciudad/producto que la evidencia, DESCARTA esa consulta: no existe una categoria de 'archivo general' donde meter lo que no encaja.",
  "- Evita mezclar en un mismo titulo dos temas completamente distintos; esto es una regla de claridad editorial del titulo, ademas de la regla de afinidad de arriba.",
  "- PROHIBIDO inventar un titulo que no se pueda justificar con evidencia real presente en RENDIMIENTO ACTUAL (Search Console), SEÑALES DE GOOGLE ANALYTICS o SEÑALES DE BING que se te dan mas abajo. El 'rationale' de cada titulo debe CITAR TEXTUALMENTE entre comillas la consulta o pagina real que lo respalda (ej: la consulta 'seguros de salud en miami'); si el titulo es una rama inferida que no tiene una consulta exacta propia, cita en cambio la consulta o cluster real del que se deriva (ej: 'se deriva del cluster de consultas sobre seguros de salud en Miami'). Un rationale sin ninguna cita textual entre comillas de un dato real NO es valido.",
  "",
  "REGLA OBLIGATORIA DE CERO CANIBALIZACION (ESTRICTA, sin excepciones):",
  "- Canibalizar significa que dos titulos apuntan a la MISMA pregunta o necesidad principal. NO es canibalizacion pertenecer al mismo universo tematico: un articulo sobre una receta puede abrir subtemas sobre ingredientes, herramientas, tecnicas, errores, conservacion y perfiles de usuario.",
  "- Primero EXPANDE: por cada consulta, pagina o titulo que demuestre interes, investiga subtemas adyacentes, preguntas derivadas, problemas, comparativas, procesos, herramientas, tendencias y perfiles relacionados. Luego revisa los titulos existentes y propuestos para eliminar solo los que respondan la misma intencion principal.",
  "- Trabaja en dos fases internas obligatorias: FASE A, construye un mapa de tema raiz y ramas relacionadas a partir de la evidencia; FASE B, convierte solo las ramas respaldadas en titulos y valida categoria, evidencia y duplicacion de intencion.",
  "- Una rama valida puede cubrir una necesidad complementaria del mismo universo (componentes, preparacion, decision, proceso, riesgos, mantenimiento, resultados o alternativas), aunque no repita las palabras del titulo principal.",
  "- El 'rationale' de cada titulo debe indicar, en una frase, la intencion de busqueda especifica y distinta que cubre (que lo diferencia de los demas titulos de su categoria).",
  "- OBLIGATORIO: cada titulo debe declarar tambien un campo 'needKey', una etiqueta corta en snake_case (3 a 6 palabras) que resuma UNICAMENTE el objeto + contexto + perfil + ubicacion real que resuelve el titulo (ej: seguro_salud_cambio_tras_mudanza_estado, seguro_salud_deducible_inmigrante_miami, seguro_pequeno_negocio_empleados). El needKey NUNCA debe incluir verbos de accion (elegir, comparar, entender, evitar) ni palabras de formato (guia, errores, comunes, mejores, consejos, pasos, completa, opciones) ni el año — esas palabras no cambian la necesidad.",
  "- Dos titulos con el MISMO needKey (aunque su texto visible sea distinto) son SIEMPRE la misma oportunidad, sin importar si estan en la misma categoria o en categorias distintas. Antes de proponer un titulo, compara mentalmente su needKey contra el de TODOS los demas titulos que vas a entregar en esta respuesta y contra OPORTUNIDADES YA CREADAS EN ESTA CORRIDA (de cualquier categoria, no solo la actual): si coincide o es casi identico, descarta el titulo o cambia genuinamente el contexto/perfil/ubicacion real (con evidencia) para que el needKey sea distinto de verdad.",
  "- Antes de entregar cada titulo, resume mentalmente su NECESIDAD PRINCIPAL en pocas palabras (eso es el needKey). Si coincide con otro titulo aunque cambien el formato, el verbo, el perfil, la ciudad o el año, descártalo.",
  "- No conviertas una misma necesidad en varias piezas cambiando solo 'guía', 'errores comunes', 'cómo elegir', 'consejos', 'pasos', 'mejores' o 'completa'. Esas palabras no crean una oportunidad nueva ni cambian el needKey.",
  "- Prioriza ramas que abran preguntas complementarias reales: preparación, componentes, decisiones, costos, riesgos, mantenimiento, alternativas, casos de uso, diagnóstico y resultados. Cada rama debe resolver una necesidad distinta y estar respaldada por una señal concreta.",
  "- CERO duplicacion de intencion es un requisito absoluto; no confundas relacion tematica con repeticion. Ante la duda, cambia el angulo hacia una necesidad complementaria respaldada por evidencia en lugar de abandonar toda la expansion del tema.",
  "",
  "REGLA OBLIGATORIA DE LONG TAIL AL 100% (ESTRICTA, sin excepciones):",
  "- PROHIBIDO proponer titulos genericos o de 'cabeza' (head terms cortos, 1-3 palabras, sin especificidad). Todo titulo debe ser long tail: especifico, con intencion clara y, cuando la evidencia lo permita, triple segmentacion (ver mas abajo).",
  "- Revisa la evidencia PAGINA POR PAGINA y CONSULTA POR CONSULTA de Search Console, Google Analytics y Bing (no te quedes solo con las primeras filas que veas): cada señal debe servir para descubrir nuevas necesidades long tail relacionadas, no solo variaciones de la misma frase.",
  "",
  "ANALISIS INTELIGENTE REQUERIDO:",
  "",
  "1. CONSULTAS DE ALTO POTENCIAL (prioridad maxima):",
  "   - Consultas con impresiones altas pero clics bajos (oportunidad de optimizacion)",
  "   - Consultas en posiciones 2-10 (faciles de mejorar con buen contenido)",
  "   - Consultas con tendencia creciente mes a mes",
  "",
  "2. CLUSTERS TEMATICOS:",
  "   - Agrupa consultas relacionadas entre si",
  "   - Identifica temas paraguas y subtemas long tail complementarios",
  "   - Crea contenido que cubra un tema desde multiples angulos realmente distintos",
  "   - Explora la cadena de necesidades: fundamentos, componentes, proceso, errores, comparativas, mantenimiento y preguntas avanzadas",
  "",
  "3. OPORTUNIDADES DE LONG TAIL:",
  "   - Transforma consultas genericas en especificas",
  '   - Agrega modificadores: "como", "mejores", "errores", "guia completa", "ejemplos"',
  "   - Personaliza segun perfil de cliente y ubicacion (cuando haya evidencia real)",
  "",
  "4. ANALISIS DE COMPETENCIA IMPLICITO:",
  "   - Si una posicion es 5-10, hay 4+ competidores arriba = oportunidad de superarlos",
  "   - Si CTR es bajo para impressions altas, el titulo/meta necesita mejorar",
  "",
  "REGLAS FLEXIBLES (NO restrictivas):",
  "",
  "SI PUEDES:",
  "- Inferir temas relacionados a partir de patrones en las consultas",
  "- Sugerir contenido que complemente lo que ya existe",
  "- Crear nuevas tematicas long tail derivadas de consultas exitosas, no solo variaciones de redaccion",
  "- Identificar nichos no explotados basados en datos reales",
  "- Usar ubicaciones y perfiles de cliente que aparezcan en las consultas, paginas o titulos existentes",
  "- Proponer intenciones de busqueda nuevas que se infieran de los patrones de las consultas existentes, asignandolas luego a la categoria que trate de verdad ese tema (ver REGLA DE ASIGNACION DE CATEGORIA arriba)",
  "",
  "PRECAUCIONES (no restricciones):",
  "- Si no tienes evidencia directa para un detalle muy especifico (precio exacto, cifra concreta), mantenlo generico pero relevante",
  "",
  "SOLO EVITA:",
  "- Copiar exactamente titulos que ya existen en TITULOS YA EXISTENTES",
  "- Repetir la misma pregunta principal bajo una redaccion diferente (ver REGLA OBLIGATORIA DE CERO CANIBALIZACION arriba)",
  "- Datos completamente falsos sin ninguna base en los datos",
  "- Mezclar el tema de dos categorias en un mismo titulo (ver REGLA DE ASIGNACION DE CATEGORIA)",
  "",
  "TRIPLE SEGMENTACION (REGLA CLAVE - aplicar en TODOS los titulos):",
  "Cada titulo debe combinar naturalmente 3 niveles cuando la evidencia lo permita:",
  "1. ACCION/INTENCION: Que quiere hacer el usuario (comprar, elegir, comparar, aprender, evitar errores)",
  "2. UBICACION/CONTEXTO: Donde o en que situacion (ciudad, pais, contexto legal, tipo de seguro, etc.)",
  "3. PERFIL DEL CLIENTE: Quien es el usuario (inmigrante, colombiano que vive en Colombia, primerizos, familiar, etc.)",
  "",
  "Ejemplos de TRIPLE SEGMENTACION bien aplicada:",
  '- "Como comprar una propiedad en Cali Colombia si soy colombiano y vivo en Colombia"',
  '- "Mejores seguros de salud para inmigrantes venezolanos en Miami"',
  '- "Errores comunes al elegir seguro de vida siendo mayor de 50 anos en California"',
  '- "Guia completa para comparar seguros de auto siendo joven universitario"',
  "",
  "REGLA DE ORO: La triple segmentacion debe sonar NATURAL, no forzada. Si la evidencia no respalda un nivel, omítelo pero mantén los otros dos.",
  "",
  "REGLA OBLIGATORIA DE GEOLOCALIZACION ULTRA ESPECIFICA (cuando el dueño de la cuenta declaro UBICACIONES DE CLIENTES y/o UBICACIONES DEL NEGOCIO mas abajo):",
  "- Esas ubicaciones son datos REALES declarados directamente por el dueño de la cuenta en su Configuracion, NO son evidencia de Search Console/GA4/Bing y NO necesitan aparecer en ninguna consulta para poder usarse — a diferencia de cualquier otra ciudad, pais o perfil, que si necesitan evidencia real.",
  "- Combina una UBICACION DE CLIENTE (de donde es/vive el cliente real) con una UBICACION DEL NEGOCIO (donde opera/vende el negocio) para crear titulos ultra segmentados del tipo 'Como [accion] en [ubicacion del negocio] si vivo en [ubicacion del cliente]' — siempre que el TEMA en si (ej. seguros, propiedades, inversion) tenga evidencia real de que es relevante para esta cuenta.",
  "- No inventes una combinacion nueva de cliente+negocio que no este en las listas declaradas; usa unicamente las ubicaciones exactas que aparecen en UBICACIONES DE CLIENTES y UBICACIONES DEL NEGOCIO mas abajo.",
  "- Esto es ADICIONAL a la regla de cero canibalizacion: cada combinacion cliente+negocio distinta cuenta como una necesidad realmente distinta (perfil geografico distinto), no como el mismo titulo repetido.",
  "",
  "REGLAS OBLIGATORIAS:",
  "- Cubre TODAS las categorias de CATEGORIAS PERMITIDAS que tengan evidencia real de oportunidad en este lote de datos. NO te limites a un numero fijo de categorias: si hay evidencia real para 15 o 25 categorias distintas, devuelve las 15 o 25.",
  "- Devuelve tantos titulos long tail unicos y no canibalizados por categoria como la evidencia real sostenga. No existe una cantidad fija por categoria: deja que la evidencia, la creatividad y el limite natural de la respuesta determinen cuantas oportunidades son validas.",
  "- SE SOSPECHOSAMENTE POCO CONSERVADOR cuando la evidencia es abundante: si este lote trae docenas de consultas reales distintas, un resultado de 1 o 2 categorias es casi siempre una señal de que te quedaste corto, no de que falte evidencia — revisa de nuevo cada consulta del lote, una por una, antes de decidir que no hay mas oportunidades. Una consulta con pocas impresiones sigue siendo evidencia real valida; no exijas volumen alto para animarte a proponer un titulo.",
  "- Cada titulo debe tener una justificacion basada en datos reales que nombre la intencion de busqueda distinta que cubre",
  "- No inventes años, nacionalidades, ciudades, precios, estadísticas ni perfiles. Un modificador solo puede aparecer en un titulo si está respaldado por una consulta, página o señal real entregada.",
  "- Si la consulta o rama no encaja claramente en la categoria asignada, descártala; nunca la coloques en la categoria más parecida solo porque no hay otra mejor (ver REGLA DE ASIGNACION DE CATEGORIA arriba).",
  "- CERO canibalizacion, ni dentro del mismo grupo ni contra TITULOS YA EXISTENTES ni contra OPORTUNIDADES YA CREADAS EN ESTA CORRIDA (ver REGLA OBLIGATORIA DE CERO CANIBALIZACION)",
  "- Usa unicamente categoryId existentes en la lista permitida",
  "- impressions y clicks del grupo deben ser representativos de la evidencia usada",
  "",
  "FORMATO DE RESPUESTA:",
  "Responde SOLO con JSON valido (sin markdown, sin texto adicional):",
  '{"opportunities":[{"categoryId":"id","rationale":"analisis de oportunidad basado en datos","impressions":123,"clicks":4,"titles":[{"text":"titulo long tail inteligente","needKey":"objeto_contexto_perfil_ubicacion","rationale":"justificacion con datos reales que respalda esta oportunidad"}]}]}',
  "",
  'Si genuinamente no hay datos suficientes para crear oportunidades reales, responde: {"opportunities":[]}',
].join("\n");

async function callOpenAi(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      // Subido de 10000 a 16000 (tope real de salida de gpt-4o-mini) porque
      // ahora un lote puede devolver muchas mas categorias/titulos que antes
      // (ya no hay techo fijo de 10 categorias) — pedido de Milton, 2/9/2026.
      max_tokens: 16000,
      response_format: { type: "json_object" },
    }),
  });
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(
      data.error?.message ?? "OpenAI no pudo analizar los datos.",
    );
  }
  return data.choices?.[0]?.message?.content ?? "";
}

async function callOpenAiWithRetry(
  prompt: string,
  apiKey: string,
): Promise<Record<string, unknown>> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await callOpenAi(prompt, apiKey);
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
      lastError = new Error("El analisis no devolvio un objeto JSON valido.");
    } catch (err) {
      lastError = err;
    }
  }
  console.error("analyzeSeoOpportunities: JSON invalido tras reintento:", lastError);
  throw new Error(
    "No se pudo interpretar la respuesta del analisis esta vez. Intenta de nuevo en unos minutos.",
  );
}

interface ProcessedRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  previousImpressions: number;
  impressionTrend: number;
  opportunityScore: number;
}

type ExternalEvidenceRow = {
  source: string;
  query?: string;
  page?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

function processPerformanceData(
  currentRows: GoogleSearchAnalyticsRow[],
  previousRows: GoogleSearchAnalyticsRow[],
): ProcessedRow[] {
  const previous = new Map(
    previousRows.map((row) => [row.keys.join(" "), row]),
  );

  return currentRows
    .map((row) => {
      const old = previous.get(row.keys.join(" "));
      const impressions = row.impressions;
      const clicks = row.clicks;
      const ctr = row.ctr;
      const position = row.position;
      const previousImpressions = old?.impressions ?? 0;
      const impressionTrend = impressions - previousImpressions;

      let opportunityScore = 0;

      if (impressions > 100 && clicks < 5) {
        opportunityScore += 30;
      }
      if (position >= 2 && position <= 10) {
        opportunityScore += 25;
      }
      if (impressionTrend > 10) {
        opportunityScore += 20;
      }
      if (impressions > 50) {
        opportunityScore += 15;
      }
      if (position <= 10 && ctr < 0.05) {
        opportunityScore += 10;
      }

      return {
        query: row.keys[0] ?? "",
        page: row.keys[1] ?? "",
        clicks,
        impressions,
        ctr,
        position,
        previousImpressions,
        impressionTrend,
        opportunityScore,
      };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore);
}

function buildPerformanceBatches(
  allRows: GoogleSearchAnalyticsRow[],
  previousRows: GoogleSearchAnalyticsRow[],
  batchSize: number,
): Array<Array<ProcessedRow>> {
  const processed = processPerformanceData(allRows, previousRows);
  const batches: Array<Array<ProcessedRow>> = [];
  for (let i = 0; i < processed.length; i += batchSize) {
    batches.push(processed.slice(i, i + batchSize));
  }
  return batches;
}

export async function analyzeSeoOpportunities(input: {
  categories: Array<{ id: string; name: string; publishedExamples?: string[] }>;
  currentRows: GoogleSearchAnalyticsRow[];
  previousRows: GoogleSearchAnalyticsRow[];
  countryRows: GoogleSearchAnalyticsRow[];
  existingTitles: string[];
  googleAnalyticsSummary?: unknown;
  bingSummary?: unknown;
  // Ubicaciones REALES declaradas por el dueño de la cuenta en Configuración
  // (Configuración → Cuenta), no inventadas ni deducidas de evidencia —
  // pedido explícito de Milton, 7/9/2026. Vacío en cuentas que no lo llenen,
  // sin cambio de comportamiento.
  clientLocations?: string[];
  businessLocations?: string[];
  // Temas que el usuario indicó excluir explícitamente, separados por coma
  // (Configuración → Contenido). Ver uso más abajo: excludedKeywords /
  // titleTouchesExcludedTopic.
  excludedTopics?: string;
  // Señales normalizadas de fuentes externas. Se convierten a filas de
  // evidencia para que GA4 o Bing puedan iniciar el análisis cuando GSC no
  // esté conectado, sin perder la procedencia en la consulta entregada a IA.
  externalEvidenceRows?: ExternalEvidenceRow[];
}): Promise<OpportunityAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no esta configurada.");

  // Bajado de 250 a 100 (7/9/2026, pedido de Milton: al menos 10 títulos por
  // corrida cuando hay evidencia real, como confirmó el diagnóstico de
  // producción con 262 consultas distintas disponibles). Con 250, una cuenta
  // con ~450 filas de Search Console solo generaba 2 lotes — 2 oportunidades
  // reales de que el modelo cubriera 10 categorías distintas. Con 100 filas
  // por lote, la misma evidencia produce más pasadas (más llamadas a OpenAI,
  // mismo techo de MAX_BATCHES), dando más intentos de cubrir categorías que
  // quedaron sin título en un lote anterior — sin bajar el listón de
  // evidencia real exigido a cada título.
  const BATCH_SIZE = 100;
  const MAX_BATCHES = 20;
  const externalRows: GoogleSearchAnalyticsRow[] = (input.externalEvidenceRows ?? [])
    .filter((row) => (row.query ?? row.page ?? "").trim().length > 0)
    .map((row) => ({
      keys: [`[${row.source}] ${row.query ?? row.page ?? ""}`],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));
  const allCurrentRows = [...input.currentRows, ...externalRows];
  const batches = buildPerformanceBatches(
    allCurrentRows,
    input.previousRows,
    BATCH_SIZE,
  );
  const batchesToProcess = batches.slice(0, MAX_BATCHES);

  const topCountries = input.countryRows
    .map((row) => {
      const code = (row.keys[0] ?? "").toLowerCase();
      return {
        country: COUNTRY_NAMES[code] ?? code,
        impressions: row.impressions,
        clicks: row.clicks,
      };
    })
    .filter((row) => row.country)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20);

  // Instrumentación de diagnóstico, apagada por defecto (OPPORTUNITY_DEBUG=1),
  // sin ningún cambio de comportamiento cuando está apagada: cuenta cuántos
  // títulos propone el modelo por lote y en qué guardarraíl exacto se pierde
  // cada uno, para poder diagnosticar con evidencia real por qué una cuenta
  // termina en "no_new" en vez de adivinar.
  const debugEnabled = process.env.OPPORTUNITY_DEBUG === "1";
  const debugCounters = {
    batches: 0,
    batchesFailed: 0,
    modelProposedTitles: 0,
    rejectedInvalidCategory: 0,
    rejectedEmptyOrDuplicateExact: 0,
    rejectedNoQuotedEvidence: 0,
    rejectedGeoComboNotUsed: 0,
    rejectedExcludedTopic: 0,
    rejectedBadYear: 0,
    rejectedCollision: 0,
    rejectedCollisionByReasoning: 0,
    ambiguousCollisionChecks: 0,
    accepted: 0,
  };

  const seen = new Set(input.existingTitles.map(normalizeTitle));
  // Bug real encontrado el 11/8/2026 (cuenta de Lorena Álvarez, dejó de
  // recibir oportunidades nuevas): antes, apenas un lote proponía ALGO para
  // una categoría (aunque fuera poco), esa categoría quedaba "cerrada" para
  // el resto de los hasta 20 lotes restantes — descartando datos reales
  // buenos de lotes posteriores solo porque un lote anterior llegó primero.
  // Ahora cada categoría acumula títulos de TODOS los lotes (hasta el tope
  // por categoría de abajo), no solo del primero que la mencionó.
  const groupsByCategory = new Map<string, OpportunityAnalysisGroup>();
  const allResult: OpportunityAnalysisGroup[] = [];
  const validCategoryIds = new Set(input.categories.map((item) => item.id));
  const evidenceRows = [
    ...allCurrentRows,
    ...input.previousRows,
    ...input.countryRows,
  ];

  // 2026-09-16: se retiró aquí el veto determinista "titleFitsCategory"
  // (vocabulario distintivo de la categoría contra el título) porque
  // descartaba títulos con demanda real solo por no compartir raíz de
  // palabra con el nombre de su categoría (caso real: título sin
  // "deducible" en categoría "Deducibles"). Decidir SI se escribe un título
  // sigue dependiendo únicamente de la demanda real (GSC/GA/Bing) y de
  // no-canibalización (needKey más abajo), nunca del nombre de la
  // categoría — pero A QUÉ categoría se asigna sigue exigiendo afinidad
  // TEMÁTICA real (ver REGLA DE ASIGNACION DE CATEGORIA en el prompt).
  // 2026-09-29: la regla del prompt había quedado, sin querer, ordenando
  // "asigna a la categoría más cercana aunque no calce" — eso producía
  // justo lo que este veto evitaba por otra vía: títulos sobre un tema/
  // ciudad ajenos (ej. evidencia real de Orlando) forzados dentro de una
  // categoría de otro tema/ciudad (ej. "Casas en Miami") solo por ser la
  // menos lejana disponible. Se corrigió la regla del prompt para exigir
  // afinidad temática real y permitir descartar si ninguna categoría
  // encaja de verdad, sin volver a comparar por vocabulario/palabra
  // compartida (el fallo original que motivó este retiro). Ver
  // COORDINACION_CLAUDE_CODEX.md.

  // Palabras clave de temas excluidos, parseadas desde input.excludedTopics
  const excludedKeywords = new Set<string>();
  if (input.excludedTopics && input.excludedTopics.trim()) {
    input.excludedTopics
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)
      .forEach((topic) => {
        // Agregar el topic completo y sus palabras individuales para búsqueda flexible
        excludedKeywords.add(topic);
        topic.split(/\s+/).forEach((word) => {
          if (word.length > 2) excludedKeywords.add(word);
        });
      });
  }

  // Verifica si un título toca temas excluidos. Comparación laxa: si alguna
  // palabra del título (3+ caracteres) coincide con keyword excluida, rechaza.
  function titleTouchesExcludedTopic(text: string): boolean {
    if (excludedKeywords.size === 0) return false;
    const textNormalized = normalizeTitle(text);
    const titleWords = textNormalized.split(/\s+/).filter((w) => w.length > 2);
    return titleWords.some((word) => excludedKeywords.has(word));
  }

  // needKey por título, guardado aparte de OpportunityAnalysisGroup (que solo
  // persiste text/rationale en la base) para poder mostrarlo en el prompt de
  // los siguientes lotes y para el chequeo cruzado de intención.
  const needKeyByTitle = new Map<string, string>();

  // Firmas de intención GLOBALES a TODA LA CORRIDA (no por categoría), pero
  // SOLO de lo generado ahora — nunca de lo ya publicado. Corrección
  // encontrada en producción (7/9/2026, cuenta de Lorena Álvarez): una
  // primera versión de esto arrancaba también con `input.existingTitles`,
  // comparándolos por similitud de palabras contra cada título nuevo. En una
  // cuenta con 405 artículos ya publicados y muy temática (todo "seguros de
  // salud en Florida"), casi cualquier título nuevo comparte 3+ palabras con
  // ALGO ya publicado, así que terminaba bloqueando de más — de ~14-19
  // oportunidades típicas bajó a solo 2. Esto además contradecía una decisión
  // de diseño ya tomada antes (ver "Decisión de diseño explicada" en
  // COORDINACION_CLAUDE_CODEX.md): la similitud de texto contra lo publicado
  // NUNCA debe ser un filtro de código, porque dos títulos long tail
  // legítimos (misma ciudad/tema, ángulo distinto) comparten casi todas las
  // palabras sin ser canibalización real. Lo ya publicado sigue protegido
  // solo por coincidencia EXACTA de texto (`seen`, sin cambios). Esta firma
  // global solo cierra el hueco real reportado por Codex: dos títulos casi
  // idénticos podían colarse si el modelo los repartía en categorías
  // distintas DENTRO DE LA MISMA CORRIDA (p.ej. "Inmigración" y "Seguros de
  // salud"), porque antes solo se comparaba dentro de la misma categoría.
  const intentSignatures: IntentSignature[] = [];

  for (let batchIndex = 0; batchIndex < batchesToProcess.length; batchIndex++) {
    const batch = batchesToProcess[batchIndex];

    // Pedido de Milton (2/9/2026): visibilidad completa de lo ya propuesto
    // EN ESTA CORRIDA, por categoría, para que el chequeo de canibalización
    // cruzado entre lotes sea real y no dependa de una ventana rotativa que
    // podía perder títulos de lotes anteriores.
    const alreadyProposedByCategory = input.categories
      .map((category) => ({
        categoryId: category.id,
        name: category.name,
        titles: (groupsByCategory.get(category.id)?.titles ?? []).map((t) => ({
          text: t.text,
          needKey: needKeyByTitle.get(t.text) ?? null,
        })),
      }))
      .filter((entry) => entry.titles.length > 0);

    const currentYear = new Date().getUTCFullYear();
    const prompt = `${PROMPT_HEADER}

NO HAY TOPE FIJO DE TITULOS POR CATEGORIA: devuelve todas las oportunidades que la evidencia real sostenga, sin repetir intención. La cantidad no es un objetivo: si solo existe una rama distinta, devuelve una; si existen muchas ramas respaldadas, devuélvelas todas.

REGLA OBLIGATORIA DE AÑOS RECIENTES (ESTRICTA, sin excepciones): el año de hoy es ${currentYear}. Si un titulo incluye un año, ese año DEBE estar entre ${currentYear - 1} y ${currentYear + 1}. PROHIBIDO usar un año anterior a ${currentYear - 1} (ej. "${currentYear - 3}", "${currentYear - 2}") aunque aparezca literalmente en una consulta o pagina de la evidencia — una consulta vieja que Search Console todavia muestra con impresiones NO autoriza a publicar hoy un titulo con ese año desactualizado.

CATEGORIAS PERMITIDAS (con EJEMPLOS DE TITULOS YA PUBLICADOS por categoria):
${JSON.stringify(input.categories)}

DISTRIBUCION GEOGRAFICA REAL POR PAIS:
${JSON.stringify(topCountries)}

UBICACIONES DE CLIENTES (declaradas por el dueño de la cuenta, de donde son sus clientes reales — usar tal cual, ver REGLA OBLIGATORIA DE GEOLOCALIZACION arriba):
${JSON.stringify(input.clientLocations ?? [])}

UBICACIONES DEL NEGOCIO (declaradas por el dueño de la cuenta, donde opera/vende el negocio — usar tal cual, ver REGLA OBLIGATORIA DE GEOLOCALIZACION arriba):
${JSON.stringify(input.businessLocations ?? [])}

SEÑALES OPCIONALES DE GOOGLE ANALYTICS 4:
${JSON.stringify(input.googleAnalyticsSummary ?? { connected: false })}

SEÑALES OPCIONALES DE BING WEBMASTER TOOLS:
${JSON.stringify(input.bingSummary ?? { connected: false })}

RENDIMIENTO ACTUAL Y COMPARACION (lote ${batchIndex + 1} de ${batchesToProcess.length}):
${JSON.stringify(batch)}

TITULOS YA EXISTENTES (publicados, en toda la cuenta):
${JSON.stringify(input.existingTitles)}

OPORTUNIDADES YA CREADAS EN ESTA CORRIDA, POR CATEGORIA, CON SU needKey (NO CANIBALIZAR NI REPETIR needKey, NI DENTRO DE LA MISMA CATEGORIA NI CONTRA OTRA CATEGORIA DISTINTA):
${JSON.stringify(alreadyProposedByCategory)}`;

    if (debugEnabled) debugCounters.batches++;
    let parsed: Record<string, unknown>;
    try {
      parsed = await callOpenAiWithRetry(prompt, apiKey);
    } catch (err) {
      if (debugEnabled) debugCounters.batchesFailed++;
      console.error(`Lote ${batchIndex + 1} fallo, continuando con siguientes lotes:`, err);
      continue;
    }

    const opportunities = parsed.opportunities;
    if (!Array.isArray(opportunities)) continue;
    if (debugEnabled) {
      console.log(
        `[OPPORTUNITY_DEBUG] Lote ${batchIndex + 1}/${batchesToProcess.length}: ${batch.length} filas de evidencia, modelo devolvio ${opportunities.length} categorias.`,
      );
    }
    await applyOpportunityItems(opportunities, "evidence");
  }

  // PASO DEDICADO DE GEOLOCALIZACION (7/9/2026, pedido explicito de Milton:
  // "haz lo necesario para que la ejecucion vaya en funcion de los
  // objetivos... no quiero tantas pruebas"). Confirmado en produccion que
  // meter la regla de geolocalizacion como una linea mas del prompt
  // principal NO bastaba: el modelo la ignoraba casi siempre porque tenia
  // que competir contra otras ~15 reglas obligatorias en la misma llamada.
  // Solucion determinista: una llamada A PARTE, con un prompt corto y
  // enfocado EXCLUSIVAMENTE en combinar cliente x negocio, sin ninguna otra
  // regla que le reste prioridad. Solo corre cuando el dueño de la cuenta
  // declaro AMBAS listas; en cualquier otro caso el comportamiento es
  // identico a antes (cero llamadas nuevas, cero cambio).
  if ((input.clientLocations?.length ?? 0) > 0 && (input.businessLocations?.length ?? 0) > 0) {
    const combos = input.clientLocations!.flatMap((client) =>
      input.businessLocations!.map((business) => ({ client, business })),
    );
    const geoPrompt = `Eres un estratega SEO. Tu UNICA tarea ahora es crear titulos long tail que combinen explicitamente una ubicacion de CLIENTE con una ubicacion de NEGOCIO, una por titulo, usando EXACTAMENTE las combinaciones de la lista de abajo (no inventes otras).

Formato esperado del titulo: una frase natural que mencione la accion (comprar, invertir, elegir, contratar, etc.), el tema real del negocio (segun las categorias de abajo) y AMBAS ubicaciones — la de negocio como destino/lugar del servicio, la de cliente como "si vivo en..." / "siendo de...". Ejemplo: "Como invertir en propiedades en Homestead si vivo en Colombia".

COMBINACIONES OBLIGATORIAS A CUBRIR (una por una, en el orden dado; si una combinacion no tiene sentido real para el negocio, omitela y sigue con la siguiente):
${JSON.stringify(combos)}

CATEGORIAS PERMITIDAS (con EJEMPLOS DE TITULOS YA PUBLICADOS por categoria — el tema del titulo debe encajar en una de estas, igual que cualquier otro titulo del sistema):
${JSON.stringify(input.categories)}

TITULOS YA EXISTENTES (publicados, en toda la cuenta) — no repitas la misma pregunta principal que alguno de estos:
${JSON.stringify(input.existingTitles)}

Reglas no negociables (las mismas que rigen todo el sistema, resumidas):
- Cada titulo debe ir en un categoryId real de la lista de arriba; si ninguna categoria encaja con el tema real del negocio, omite esa combinacion.
- No inventes anos, cifras ni datos que no esten en las categorias o en esta instruccion.
- Cada titulo debe declarar "needKey" (objeto_contexto_perfil_ubicacion en snake_case, sin verbo ni formato) que incluya AMBAS ubicaciones para que el sistema lo distinga de otros titulos.
- Puedes proponer mas de un titulo por combinacion solo si son necesidades realmente distintas (ver needKey); si no, uno solo por combinacion alcanza.

Responde SOLO con JSON valido (sin markdown): {"opportunities":[{"categoryId":"id","rationale":"por que esta combinacion tiene sentido para este negocio","impressions":0,"clicks":0,"titles":[{"text":"...","needKey":"...","rationale":"..."}]}]}
Si genuinamente ninguna combinacion tiene sentido real para este negocio, responde: {"opportunities":[]}`;

    try {
      const parsedGeo = await callOpenAiWithRetry(geoPrompt, apiKey);
      const geoOpportunities = parsedGeo.opportunities;
      if (Array.isArray(geoOpportunities)) await applyOpportunityItems(geoOpportunities, "geo");
    } catch (err) {
      console.error("Paso dedicado de geolocalizacion fallo (no bloquea el resto del analisis):", err);
    }
  }

  // Recuperación genérica: si hubo evidencia real pero la primera pasada no
  // dejó títulos válidos, no declarar `no_new` todavía. Una respuesta del
  // modelo puede fallar el formato de cita, mezclar categorías o devolver un
  // JSON demasiado conservador. Esta segunda pasada usa la misma evidencia,
  // reduce las instrucciones a lo esencial y conserva las validaciones
  // deterministas de applyOpportunityItems.
  if (allResult.length === 0 && evidenceRows.length > 0) {
    const recoveryPrompt = `${PROMPT_HEADER}

RECUPERACION OBLIGATORIA: recibiste evidencia real pero la pasada anterior no produjo titulos validos. Devuelve al menos una oportunidad por cada necesidad claramente respaldada; no respondas con una lista vacia si existe una consulta o pagina util.

CATEGORIAS PERMITIDAS:
${JSON.stringify(input.categories)}

EVIDENCIA REAL DISPONIBLE:
${JSON.stringify(evidenceRows.slice(0, 300))}

REGLAS: cada titulo debe usar una categoriaId real, ser long tail, no inventar datos y tener un rationale que cite entre comillas una consulta o pagina exacta de la evidencia. Usa needKey distinto para cada necesidad.

Responde SOLO JSON con este formato: {"opportunities":[{"categoryId":"id","rationale":"... cita exacta ...","impressions":0,"clicks":0,"titles":[{"text":"...","needKey":"...","rationale":"Se basa en la consulta o pagina \"...\"."}]}]}`;
    try {
      const recovered = await callOpenAiWithRetry(recoveryPrompt, apiKey);
      if (Array.isArray(recovered.opportunities)) {
        await applyOpportunityItems(recovered.opportunities, "evidence");
      }
    } catch (err) {
      console.error("Pasada de recuperación de oportunidades falló:", err);
    }
  }

  if (debugEnabled) {
    console.log("[OPPORTUNITY_DEBUG] Resumen final:", JSON.stringify(debugCounters, null, 2));
  }

  if (allResult.length === 0) {
    return { status: "no_new" };
  }
  return { status: "ok", groups: allResult };

  // Procesa un array crudo de "opportunities" devuelto por OpenAI (del lote
  // principal o del paso dedicado de geolocalizacion) con exactamente las
  // mismas validaciones deterministas: categoria valida, texto no vacio y no
  // duplicado exacto, anio real y reciente, y sin colision de needKey/
  // intencion contra nada ya aceptado en esta corrida. Factor comun para que
  // ambas fuentes respeten las mismas garantias, sin duplicar la logica.
  // `source` distingue el UNICO chequeo que de verdad difiere entre las dos
  // fuentes (ver titleUsesDeclaredGeoCombo mas arriba): "evidence" exige cita
  // textual de un dato real de GSC/GA/Bing; "geo" exige en cambio que el
  // titulo use de verdad una ubicacion de cliente y una de negocio ya
  // declaradas, porque esos titulos nunca tienen (ni deben tener) una cita
  // de busqueda real detras.
  async function applyOpportunityItems(opportunities: unknown[], source: "evidence" | "geo") {
    for (const item of opportunities) {
      if (!item || typeof item !== "object") continue;
      const group = item as Record<string, unknown>;
      if (
        typeof group.categoryId !== "string" ||
        !validCategoryIds.has(group.categoryId) ||
        !Array.isArray(group.titles)
      )
        continue;

      const existingGroup = groupsByCategory.get(group.categoryId);

      const newTitles: OpportunityAnalysisGroup["titles"] = [];
      for (const candidate of group.titles) {
        if (!candidate || typeof candidate !== "object") continue;
        const value = candidate as Record<string, unknown>;
        if (typeof value.text !== "string") continue;
        const text = value.text.trim();
        if (debugEnabled && text) debugCounters.modelProposedTitles++;
        const normalized = normalizeTitle(text);
        if (!text || seen.has(normalized)) {
          if (debugEnabled && text) debugCounters.rejectedEmptyOrDuplicateExact++;
          continue;
        }
        const rationale =
          typeof value.rationale === "string" ? value.rationale.trim() : "";
        if (source === "evidence") {
          // Garantía determinista contra títulos sin evidencia citada: el
          // rationale debe nombrar textualmente (entre comillas) la consulta,
          // página o cluster real que lo respalda, tal como exige el prompt.
          if (!rationaleHasQuotedEvidence(rationale)) {
            if (debugEnabled) {
              debugCounters.rejectedNoQuotedEvidence++;
              console.log(`[OPPORTUNITY_DEBUG] Rechazado por falta de cita textual. Titulo: "${text}" | rationale crudo: ${JSON.stringify(rationale)}`);
            }
            continue;
          }
        } else {
          // Garantía determinista equivalente para el paso de geolocalización
          // (ver titleUsesDeclaredGeoCombo): su evidencia real es la
          // combinación de ubicaciones declaradas por el dueño de la cuenta,
          // no una cita de Search Console/GA/Bing.
          if (
            !titleUsesDeclaredGeoCombo(
              text,
              input.clientLocations ?? [],
              input.businessLocations ?? [],
            )
          ) {
            if (debugEnabled) {
              debugCounters.rejectedGeoComboNotUsed++;
              console.log(`[OPPORTUNITY_DEBUG] Rechazado (geo): no usa una combinacion cliente+negocio declarada. Titulo: "${text}"`);
            }
            continue;
          }
        }
        // Garantía determinista contra temas excluidos: si el usuario indicó
        // que no quiere ciertos temas, rechazar CUALQUIER título que los mencione,
        // sin importar cuán buena sea la evidencia. Esta validación corre AQUÍ
        // (en JavaScript), no solo en el prompt, para garantizar cumplimiento.
        if (titleTouchesExcludedTopic(text)) {
          if (debugEnabled) debugCounters.rejectedExcludedTopic++;
          continue;
        }
        // Garantía determinista contra años inventados O desactualizados:
        // cada año en el título debe tener evidencia real Y estar dentro de
        // la ventana de recencia aceptable (año actual ±1), sin excepción.
        if (
          extractYears(text).some(
            (year) =>
              !isYearAcceptablyRecent(year) ||
              !hasContextualEvidenceForYear(text, year, evidenceRows),
          )
        ) {
          if (debugEnabled) debugCounters.rejectedBadYear++;
          continue;
        }
        // La categoría es solo el lugar de archivo, no un criterio para
        // decidir si el título se escribe: ya no se descarta un título con
        // demanda real (GSC/GA/Bing) por no compartir vocabulario con el
        // nombre de su categoría (antes: titleFitsCategory como veto aquí).
        const needKey = typeof value.needKey === "string" ? value.needKey.trim() : undefined;
        const signature = buildIntentSignature(text, needKey, source === "geo");
        // Chequeo GLOBAL a esta corrida (cualquier categoría, no solo la
        // actual) — cierra el hueco real de canibalización cruzada entre
        // categorías. NO compara contra lo ya publicado (ver nota arriba,
        // en la inicialización de intentSignatures).
        if (collidesWithIntent(signature, intentSignatures)) {
          if (debugEnabled) debugCounters.rejectedCollision++;
          continue;
        }
        // Zona ciega del chequeo determinista de arriba (ver
        // findAmbiguousIntentMatches y reasonAboutAmbiguousCollisions): solo
        // se activa cuando de verdad hay un caso corto/ambiguo que comparte
        // al menos una palabra. Se le pregunta al modelo, con juicio real,
        // si es la misma necesidad — no se decide por conteo de palabras.
        const ambiguousMatches = findAmbiguousIntentMatches(signature, intentSignatures);
        if (ambiguousMatches.length > 0) {
          if (debugEnabled) debugCounters.ambiguousCollisionChecks++;
          const collidingIndices = await reasonAboutAmbiguousCollisions(
            { text, needKey },
            ambiguousMatches,
            // apiKey ya se validó como no vacío al inicio de la funcion
            // exportada; TypeScript no propaga esa validacion dentro de esta
            // funcion anidada aunque la variable sea const.
            apiKey as string,
          );
          if (collidingIndices.size > 0) {
            if (debugEnabled) {
              debugCounters.rejectedCollisionByReasoning++;
              console.log(
                `[OPPORTUNITY_DEBUG] Rechazado por razonamiento de colision ambigua. Titulo: "${text}" | colisiona con: ${JSON.stringify([...collidingIndices].map((i) => ambiguousMatches[i]?.source))}`,
              );
            }
            continue;
          }
        }
        seen.add(normalized);
        intentSignatures.push(signature);
        if (needKey) needKeyByTitle.set(text, needKey);
        if (debugEnabled) debugCounters.accepted++;
        newTitles.push({ text, rationale });
      }

      if (newTitles.length === 0) continue;

      if (existingGroup) {
        existingGroup.titles.push(...newTitles);
      } else {
        const newGroup: OpportunityAnalysisGroup = {
          categoryId: group.categoryId,
          rationale:
            typeof group.rationale === "string" ? group.rationale.trim() : "",
          impressions:
            typeof group.impressions === "number" ? group.impressions : 0,
          clicks: typeof group.clicks === "number" ? group.clicks : 0,
          titles: newTitles,
        };
        groupsByCategory.set(group.categoryId, newGroup);
        allResult.push(newGroup);
      }
    }
  }
}
