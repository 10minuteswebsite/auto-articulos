import { authorize, saveConfig } from "@/lib/blog-ia-wizard";
import { buildWizardDeps, json, loadActor } from "@/lib/blog-ia-wizard-runtime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PUT(request: Request) {
  const actor = await loadActor();
  const who = authorize(actor); // el userId sale SIEMPRE de la sesión, nunca del cuerpo
  if (!who.ok) return json(who);
  const body = await request.json().catch(() => null);
  return json(await saveConfig(buildWizardDeps(), who.value, body));
}
