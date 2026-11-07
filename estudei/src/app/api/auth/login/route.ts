import { loginSchema } from "@/lib/validation";
import { verifyPassword } from "@/server/auth/password";
import { startSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { handleError, jsonError, parseBody } from "@/server/http";

/** POST /api/auth/login — checks credentials and sets the session cookie. */
export async function POST(request: Request) {
  const parsed = await parseBody(request, loginSchema);
  if ("response" in parsed) return parsed.response;
  const { email, password } = parsed.data;

  try {
    const user = await db().user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, passwordHash: true },
    });
    // Same message (and same bcrypt cost) whether the e-mail exists or not.
    if (!(await verifyPassword(password, user?.passwordHash)) || !user) {
      return jsonError("E-mail ou senha incorretos.", 401);
    }
    await startSession(user.id);
    return Response.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    return handleError(error);
  }
}
