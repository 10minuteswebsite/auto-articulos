import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import LinkedInPanel from "./LinkedInPanel";

export default async function LinkedInPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");
  return <LinkedInPanel />;
}
