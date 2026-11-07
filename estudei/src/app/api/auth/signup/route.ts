import { signupSchema } from "@/lib/validation";
import { hashPassword } from "@/server/auth/password";
import { startSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { handleError, jsonError, parseBody } from "@/server/http";

/** POST /api/auth/signup — creates an account and logs the user in. */
export async function POST(request: Request) {
  const parsed = await parseBody(request, signupSchema);
  if ("response" in parsed) return parsed.response;
  const { name, email, password, timezone } = parsed.data;

  try {
    const existing = await db().user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return jsonError("Já existe uma conta com este e-mail.", 409, { email: "Este e-mail já está cadastrado." });
    }
    const user = await db().user.create({
      data: { name, email, passwordHash: await hashPassword(password), timezone },
      select: { id: true, name: true, email: true },
    });
    await startSession(user.id);
    return Response.json({ user }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
