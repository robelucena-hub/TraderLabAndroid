import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/server/auth/jwt";

/**
 * Optimistic auth check: visitors without a valid session token are sent to
 * the login page before the protected page even renders. Pages and API routes
 * still verify the session themselves (this is only a fast first filter).
 */
export async function proxy(request: NextRequest) {
  const userId = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (userId) return NextResponse.next();

  const loginUrl = new URL("/entrar", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/painel/:path*", "/revisoes/:path*", "/topicos/:path*"],
};
