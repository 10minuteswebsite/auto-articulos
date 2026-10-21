import { authorize, reactivate } from "@/lib/blog-ia-wizard";
import { buildWizardDeps, json, loadActor } from "@/lib/blog-ia-wizard-runtime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const actor = await loadActor();
  const who = authorize(actor);
  if (!who.ok) return json(who);
  return json(await reactivate(buildWizardDeps(), who.value, actor.articulosAllowed));
}
