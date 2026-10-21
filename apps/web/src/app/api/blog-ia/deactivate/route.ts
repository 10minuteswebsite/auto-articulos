import { authorize, deactivate } from "@/lib/blog-ia-wizard";
import { buildWizardDeps, json, loadActor } from "@/lib/blog-ia-wizard-runtime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Desactiva el blog (503 público, contenido conservado, publicaciones detenidas). No cambia el método de publicación. */
export async function POST() {
  const actor = await loadActor();
  const who = authorize(actor); // el userId sale SIEMPRE de la sesión
  if (!who.ok) return json(who);
  return json(await deactivate(buildWizardDeps(), who.value));
}
