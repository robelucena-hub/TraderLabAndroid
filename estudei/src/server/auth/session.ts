import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { SessionUser } from "@/lib/types";
import { db } from "../db";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionToken, verifySessionToken } from "./jwt";

/** Starts a session (call from Route Handlers only). */
export async function startSession(userId: string): Promise<void> {
  const token = await createSessionToken(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * The logged-in user, or null. Verifies the token AND checks the user still
 * exists. Memoized per request with React's cache().
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const userId = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return db().user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, timezone: true },
  });
});

/** For pages: the logged-in user, or a redirect to the login page. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
}
