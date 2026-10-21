import { NextResponse } from "next/server";
import { authorize, authorizeRead, ensureBlog, getState, toView } from "@/lib/blog-ia-wizard";
import { buildWizardDeps, json, loadActor, prismaWizardStore } from "@/lib/blog-ia-wizard-runtime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Estado actual. Un administrador puede LEER otra cuenta con ?userId=. */
export async function GET(request: Request) {
  const actor = await loadActor();
  const target = new URL(request.url).searchParams.get("userId");
  const who = authorizeRead(actor, target);
  if (!who.ok) return json(who);
  const deps = buildWizardDeps();
  if (who.value !== actor.userId) return NextResponse.json(toView(await prismaWizardStore.get(who.value), deps));
  return NextResponse.json(await getState(deps, who.value));
}

/** Crear o continuar el registro BLOG IA de la cuenta (idempotente). */
export async function POST() {
  const actor = await loadActor();
  const who = authorize(actor);
  if (!who.ok) return json(who);
  const deps = buildWizardDeps();
  await ensureBlog(deps, who.value);
  return NextResponse.json(await getState(deps, who.value));
}
