import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { jsonRequest, readRoute, toolText, type ToolDef } from "./shared";

/**
 * Las tools NO reimplementan lógica de negocio: invocan los mismos route
 * handlers que usa la interfaz web.
 *
 * Por qué esto funciona: el middleware autentica el Bearer de MCP y deja
 * `x-user-id` en los headers del request, exactamente igual que hace con la
 * cookie de sesión. Como los route handlers leen ese header vía
 * `getCurrentUserId()` -> `headers()`, y `headers()` devuelve los headers del
 * request en curso (el de /api/mcp), llamarlos directamente funciona sin
 * inventar una sesión falsa ni hacer un fetch a nosotros mismos.
 *
 * La consecuencia importante es de seguridad y de costo: los cupos
 * (`User.maxTitlesPerBatch`), el bloqueo por run en curso y la exigencia de
 * credenciales de 10minutesWebsite se aplican IGUAL por voz que por clic,
 * porque es literalmente el mismo código. Si mañana cambian esas reglas, la
 * voz las hereda sola.
 */
import { GET as listarOportunidadesRoute, POST as analizarOportunidadesRoute } from "@/app/api/opportunities/route";
import { POST as ejecutarOportunidadRoute } from "@/app/api/opportunities/execute/route";
import { POST as publicarTitulosRoute } from "@/app/api/runs/route";

export const OPPORTUNITY_TOOLS: ToolDef[] = [
  {
    name: "listar_oportunidades",
    title: "Listar oportunidades",
    description:
      "Devuelve el contenido inteligente guardado, agrupado por categoría, con la cantidad de títulos y las impresiones de cada una. Solo lectura: no publica ni modifica nada. Úsala antes de publicar para saber qué hay pendiente.",
    inputSchema: {
      type: "object",
      properties: {
        categoria: { type: "string", description: "Opcional. Filtra por el nombre de una categoría." },
      },
      additionalProperties: false,
    },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async (args) => {
      const { data } = await readRoute(await listarOportunidadesRoute());
      let groups = (data.groups ?? []) as Array<{
        category?: { name?: string } | null;
        impressions?: number;
        titles?: Array<{ id?: string; text?: string }>;
      }>;
      const filtro = typeof args.categoria === "string" ? args.categoria.trim().toLocaleLowerCase() : "";
      if (filtro) groups = groups.filter((group) => group.category?.name?.toLocaleLowerCase().includes(filtro));
      if (groups.length === 0) {
        return toolText(
          "No hay oportunidades guardadas. Puedes generarlas con la herramienta crear_oportunidades.",
        );
      }
      const lineas = groups.map((g) => {
        const nombre = g.category?.name ?? "Sin categoría";
        const cantidad = g.titles?.length ?? 0;
        const titles = (g.titles ?? []).map((title) => `  - ${title.text ?? "Sin título"} [${title.id ?? "sin-id"}]`).join("\n");
        return `${nombre}: ${cantidad} ${cantidad === 1 ? "título" : "títulos"}, ${g.impressions ?? 0} impresiones\n${titles}`;
      });
      return toolText(
        `Hay ${groups.length} ${groups.length === 1 ? "categoría" : "categorías"} con oportunidades:\n${lineas.join("\n")}`,
      );
    },
  },

  {
    name: "crear_oportunidades",
    title: "Crear oportunidades (análisis de Search Console)",
    description:
      "Analiza Google Search Console y otras señales de internet para crear contenido inteligente agrupado por categoría, a partir de lo que la cuenta YA tiene indexado. No publica ningún artículo — solo propone títulos para revisar. Requiere Google Search Console conectado y categorías ya sincronizadas (usa ver_estado_configuracion o listar_categorias para confirmarlo antes). Distinto de crear_titulos_con_ia: esta no pide datos al usuario, analiza señales reales; la otra genera desde una descripción del negocio y no requiere Search Console. Se recomienda no repetir el análisis antes de 3 días; si el usuario insiste explícitamente, pasa forzar=true.",
    inputSchema: {
      type: "object",
      properties: {
        forzar: {
          type: "boolean",
          description:
            "Repetir el análisis aunque no hayan pasado los 3 días recomendados desde el último. Solo si el usuario lo pide explícitamente.",
        },
      },
      additionalProperties: false,
    },
    requiredScope: "oportunidades:publicar",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    handler: async (args) => {
      // Cuentas con varios paneles (ver Category.panel) necesitan indicar a
      // cuál analizar — la web lo resuelve con un selector (primer panel
      // real disponible, `oportunidades/page.tsx`); acá no hay pantalla, así
      // que se resuelve igual: si la cuenta no tiene un panel único fijado
      // (`selectedSitePanel`), se usa el primer panel real que aparezca
      // entre sus categorías sincronizadas. Sin esto, una cuenta multi-panel
      // recibía "Sincroniza tus categorías primero" con las categorías YA
      // sincronizadas, porque el análisis buscaba panel="" y ninguna
      // categoría real tiene ese valor.
      const userId = await getCurrentUserId();
      const [user, categorias] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSitePanel: true } }),
        prisma.category.findMany({ where: { userId, source: { not: "archived" } }, select: { panel: true } }),
      ]);
      const panelesReales = Array.from(new Set(categorias.map((c) => c.panel).filter((p): p is string => Boolean(p))));
      const panel = user.selectedSitePanel || panelesReales[0] || "";

      const { ok, data } = await readRoute(
        await analizarOportunidadesRoute(jsonRequest("/api/opportunities", { force: Boolean(args.forzar), panel })),
      );
      if (!ok) {
        return toolText(String(data.error ?? "No se pudo analizar."), true);
      }
      const groups = (data.groups ?? []) as unknown[];
      return toolText(
        `Listo. Se generaron oportunidades en ${groups.length} ${groups.length === 1 ? "categoría" : "categorías"}. No se publicó nada todavía.`,
      );
    },
  },

  {
    name: "publicar_oportunidades_seleccionadas",
    title: "Publicar oportunidades seleccionadas",
    description:
      "Publica títulos concretos de una sola categoría. Primero llama con confirmar=false para mostrar la vista previa. Solo usa confirmar=true después de que el usuario confirme expresamente la lista exacta; esta acción genera y publica artículos reales.",
    inputSchema: {
      type: "object",
      properties: {
        ids_titulos: { type: "array", items: { type: "string" }, minItems: 1, description: "IDs de los títulos devueltos por listar_oportunidades." },
        confirmar: { type: "boolean", description: "false para previsualizar; true únicamente tras confirmación explícita." },
        desactivar_indexacion: { type: "boolean", description: "Si true, no solicita indexación automática." },
      },
      required: ["ids_titulos"],
      additionalProperties: false,
    },
    requiredScope: "oportunidades:publicar",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    handler: async (args) => {
      const ids = Array.isArray(args.ids_titulos) ? args.ids_titulos.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
      if (ids.length === 0) return toolText("Debes indicar al menos un título.", true);
      const userId = await getCurrentUserId();
      const groups = await prisma.opportunityGroup.findMany({
        where: { userId, titles: { some: { id: { in: ids } } } },
        include: { category: true, titles: { orderBy: { createdAt: "asc" } } },
      });
      const matching = groups.flatMap((group) => group.titles.filter((title) => ids.includes(title.id)).map((title) => ({ group, title })));
      if (matching.length !== new Set(ids).size || groups.length !== 1) {
        return toolText("Los títulos deben existir y pertenecer todos a una sola categoría. Usa listar_oportunidades para obtener los IDs correctos.", true);
      }
      const category = groups[0].category?.name ?? "sin categoría";
      const titles = matching.map(({ title }) => title.text);
      if (args.confirmar !== true) {
        return toolText(`Sin publicar todavía. Se crearán ${titles.length} artículo(s) en "${category}":\n${titles.map((title) => `- ${title}`).join("\n")}\n\nPide confirmación explícita y vuelve a llamar con confirmar=true.`, false);
      }
      const { ok, data } = await readRoute(await ejecutarOportunidadRoute(jsonRequest("/api/opportunities/execute", {
        type: "titles", ids, disableIndexing: Boolean(args.desactivar_indexacion),
      })));
      return ok
        ? toolText(`Publicación iniciada para ${titles.length} título(s) de "${category}". Puedes consultar el avance con estado_de_publicaciones.`)
        : toolText(String(data.error ?? "No se pudo iniciar la publicación."), true);
    },
  },

  {
    name: "publicar_titulos_en_categoria",
    title: "Publicar títulos en una categoría",
    description:
      "Crea y publica una lista de títulos indicada por el usuario dentro de una categoría existente. Primero previsualiza con confirmar=false; solo publica con confirmar=true tras confirmación explícita.",
    inputSchema: {
      type: "object",
      properties: {
        categoria: { type: "string", description: "Nombre de la categoría existente." },
        titulos: { type: "array", items: { type: "string" }, minItems: 1, description: "Títulos a crear y publicar." },
        confirmar: { type: "boolean", description: "false para previsualizar; true únicamente tras confirmación explícita." },
        desactivar_indexacion: { type: "boolean", description: "Si true, no solicita indexación automática." },
      },
      required: ["categoria", "titulos"],
      additionalProperties: false,
    },
    requiredScope: "oportunidades:publicar",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    handler: async (args) => {
      const categoryName = String(args.categoria ?? "").trim();
      const titles = Array.isArray(args.titulos) ? args.titulos.filter((title): title is string => typeof title === "string" && title.trim().length > 0).map((title) => title.trim()) : [];
      if (!categoryName || titles.length === 0) return toolText("Indica una categoría y al menos un título.", true);
      const userId = await getCurrentUserId();
      const categories = await prisma.category.findMany({ where: { userId, platform: "10minutesWebsite", source: { not: "archived" }, name: { equals: categoryName, mode: "insensitive" } }, select: { id: true, name: true } });
      if (categories.length !== 1) return toolText(`No encontré una categoría exacta llamada "${categoryName}". Usa las categorías existentes antes de publicar.`, true);
      if (args.confirmar !== true) return toolText(`Sin publicar todavía. Se crearán ${titles.length} artículo(s) en "${categories[0].name}":\n${titles.map((title) => `- ${title}`).join("\n")}\n\nPide confirmación explícita y vuelve a llamar con confirmar=true.`, false);
      const { ok, data } = await readRoute(await publicarTitulosRoute(jsonRequest("/api/runs", {
        titlesText: titles.join("\n"), categoryId: categories[0].id, disableIndexing: Boolean(args.desactivar_indexacion),
      })));
      return ok
        ? toolText(`Publicación iniciada para ${titles.length} título(s) en "${categories[0].name}". Puedes consultar el avance con estado_de_publicaciones.`)
        : toolText(String(data.error ?? "No se pudo iniciar la publicación."), true);
    },
  },

  {
    name: "publicar_categoria",
    title: "Publicar una categoría",
    description:
      "PUBLICA ARTÍCULOS REALES en el sitio del usuario. Acción con consecuencias visibles públicamente y que consume créditos de generación. Llama SIEMPRE primero con confirmar=false: eso no publica nada, solo devuelve qué títulos se publicarían para que el usuario los escuche y decida. Solo vuelve a llamar con confirmar=true después de que el usuario haya dicho que sí de forma explícita.",
    inputSchema: {
      type: "object",
      properties: {
        categoria: {
          type: "string",
          description: "Nombre de la categoría a publicar, tal como se lo dijo el usuario.",
        },
        confirmar: {
          type: "boolean",
          description:
            "false (por defecto) = solo previsualizar los títulos, no publica. true = publicar de verdad, únicamente tras confirmación explícita del usuario.",
        },
      },
      required: ["categoria"],
      additionalProperties: false,
    },
    requiredScope: "oportunidades:publicar",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    handler: async (args) => {
      const categoria = String(args.categoria ?? "").trim();
      if (!categoria) return toolText("Falta el nombre de la categoría.", true);

      const userId = await getCurrentUserId();
      // Búsqueda tolerante: la voz llega sin acentos consistentes ni
      // mayúsculas, y el usuario dice el nombre aproximado, no el exacto.
      const grupos = await prisma.opportunityGroup.findMany({
        where: { userId, category: { name: { contains: categoria, mode: "insensitive" } } },
        include: { category: true, titles: { orderBy: { createdAt: "asc" } } },
      });

      if (grupos.length === 0) {
        return toolText(
          `No encontré ninguna categoría con oportunidades que se parezca a "${categoria}". Usa listar_oportunidades para ver las disponibles.`,
          true,
        );
      }
      if (grupos.length > 1) {
        const nombres = grupos.map((g) => g.category?.name ?? "sin nombre").join(", ");
        return toolText(
          `"${categoria}" coincide con varias categorías: ${nombres}. Pregúntale al usuario cuál de ellas quiere publicar.`,
          true,
        );
      }

      const grupo = grupos[0];
      const nombre = grupo.category?.name ?? "sin nombre";
      const titulos = grupo.titles.map((t) => t.text);

      if (titulos.length === 0) {
        return toolText(`La categoría "${nombre}" no tiene títulos para publicar.`, true);
      }

      // Puerta de confirmación. Es la única salvaguarda propia de la voz: por
      // clic el usuario ve la lista en pantalla antes de ejecutar, y acá no
      // ve nada, así que se la leemos primero.
      if (args.confirmar !== true) {
        return toolText(
          `Sin publicar todavía. La categoría "${nombre}" tiene ${titulos.length} ${titulos.length === 1 ? "título" : "títulos"}:\n${titulos.map((t) => `- ${t}`).join("\n")}\n\nLéele estos títulos al usuario y pregúntale si confirma la publicación. Si dice que sí, vuelve a llamar a esta herramienta con confirmar=true.`,
        );
      }

      const { ok, data } = await readRoute(
        await ejecutarOportunidadRoute(
          jsonRequest("/api/opportunities/execute", { type: "group", id: grupo.id }),
        ),
      );
      if (!ok) {
        // El route handler ya devuelve mensajes en español pensados para el
        // usuario final (cupo excedido, run en curso, falta credencial); se
        // pasan tal cual para que el asistente los lea sin reinterpretarlos.
        return toolText(String(data.error ?? "No se pudo publicar."), true);
      }
      return toolText(
        `Publicación iniciada para "${nombre}" con ${titulos.length} ${titulos.length === 1 ? "título" : "títulos"}. Los artículos se están generando; puedes consultar el avance con estado_de_publicaciones.`,
      );
    },
  },

  {
    name: "estado_de_publicaciones",
    title: "Estado de las publicaciones",
    description:
      "Informa si hay una publicación en curso y cómo salieron las últimas, incluyendo el enlace de cada artículo publicado con éxito. La publicación es asíncrona: al llamar a publicar_categoria/publicar_oportunidades_seleccionadas/publicar_titulos_en_categoria con confirmar=true el artículo todavía se está generando, no hay URL disponible todavía — usa esta herramienta un momento después para obtenerla. Solo lectura.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async () => {
      const userId = await getCurrentUserId();
      const runs = await prisma.run.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { category: true, titles: { orderBy: { order: "asc" } } },
      });
      if (runs.length === 0) return toolText("Todavía no hay publicaciones registradas.");

      const enCurso = runs.filter((r) => r.status === "pending" || r.status === "running");
      const lineas = runs.map((r) => {
        const nombre = r.category?.name ?? "sin categoría";
        const detalleTitulos = r.titles
          .map((t) => {
            if (t.status === "success" && t.articleUrl) return `    - "${t.finalTitle ?? t.text}": ${t.articleUrl}`;
            if (t.status === "success") return `    - "${t.finalTitle ?? t.text}": publicado, todavía sin URL registrada`;
            if (t.status === "error") return `    - "${t.text}": error — ${t.errorMessage ?? "sin detalle"}`;
            return `    - "${t.text}": ${t.status}`;
          })
          .join("\n");
        return `${nombre}: ${r.status}, ${r.titles.length} ${r.titles.length === 1 ? "título" : "títulos"}\n${detalleTitulos}`;
      });
      const cabecera =
        enCurso.length > 0
          ? `Hay ${enCurso.length} ${enCurso.length === 1 ? "publicación" : "publicaciones"} en curso.`
          : "No hay ninguna publicación en curso.";
      return toolText(`${cabecera}\nÚltimas ejecuciones:\n${lineas.join("\n")}`);
    },
  },
];
