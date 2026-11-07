import { endSession } from "@/server/auth/session";

/** POST /api/auth/logout — clears the session cookie. */
export async function POST() {
  await endSession();
  return new Response(null, { status: 204 });
}
