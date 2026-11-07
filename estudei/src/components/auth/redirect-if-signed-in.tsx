import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";

/** Sends visitors who are already logged in straight to the dashboard. */
export async function RedirectIfSignedIn() {
  if (await getCurrentUser()) redirect("/painel");
  return null;
}
