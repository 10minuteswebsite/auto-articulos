import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import BingPanel from "./BingPanel";

export default async function BingPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");
  return <BingPanel />;
}
