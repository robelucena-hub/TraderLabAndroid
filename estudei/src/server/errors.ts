import type { FieldErrors } from "@/lib/validation";

/** The requested record does not exist or belongs to another user. */
export class NotFoundError extends Error {
  constructor(message = "Tópico não encontrado.") {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Business-rule violation that the user can fix (HTTP 400/409). */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors?: FieldErrors,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}
