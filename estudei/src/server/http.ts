import "server-only";
import type { z } from "zod";
import type { SessionUser } from "@/lib/types";
import { toFieldErrors, type FieldErrors } from "@/lib/validation";
import { getCurrentUser } from "./auth/session";
import { NotFoundError, ValidationError } from "./errors";

/** Error body returned by every API route. */
export interface ApiError {
  error: string;
  fieldErrors?: FieldErrors;
}

export function jsonError(error: string, status: number, fieldErrors?: FieldErrors): Response {
  const body: ApiError = fieldErrors ? { error, fieldErrors } : { error };
  return Response.json(body, { status });
}

/**
 * Parses and validates a JSON body. Returns the data or a 400 response.
 * With `allowEmpty`, an empty body is validated as `{}` (schema defaults apply).
 */
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
  { allowEmpty = false }: { allowEmpty?: boolean } = {},
): Promise<{ data: z.infer<T> } | { response: Response }> {
  let raw: unknown;
  try {
    const text = await request.text();
    raw = allowEmpty && text.trim() === "" ? {} : JSON.parse(text);
  } catch {
    return { response: jsonError("Corpo da requisição inválido (JSON esperado).", 400) };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { response: jsonError("Verifique os campos destacados.", 400, toFieldErrors(result.error)) };
  }
  return { data: result.data };
}

/** Maps service errors to HTTP responses. Unknown errors become a 500. */
export function handleError(error: unknown): Response {
  if (error instanceof NotFoundError) return jsonError(error.message, 404);
  if (error instanceof ValidationError) return jsonError(error.message, error.status, error.fieldErrors);
  console.error(error);
  return jsonError("Erro interno. Tente novamente em instantes.", 500);
}

type AuthedHandler<C> = (request: Request, user: SessionUser, context: C) => Promise<Response>;

/**
 * Wraps a Route Handler: rejects anonymous requests with 401 and turns thrown
 * service errors into JSON responses.
 */
export function withUser<C>(handler: AuthedHandler<C>) {
  return async (request: Request, context: C): Promise<Response> => {
    try {
      const user = await getCurrentUser();
      if (!user) return jsonError("Sessão expirada. Entre novamente.", 401);
      return await handler(request, user, context);
    } catch (error) {
      return handleError(error);
    }
  };
}
