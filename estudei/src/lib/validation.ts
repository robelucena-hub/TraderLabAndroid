import { z } from "zod";
import { isValidTimeZone } from "@/lib/forgetting-curve";

/**
 * Input schemas shared by the forms (client) and the API routes (server).
 * Messages are in pt-BR because they are shown directly to the user.
 */

const FUTURE_TOLERANCE_MS = 5 * 60 * 1000; // allow small clock differences

export const topicInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Informe um título com pelo menos 2 caracteres.")
    .max(120, "O título pode ter no máximo 120 caracteres."),
  subject: z
    .string()
    .trim()
    .min(2, "Informe a matéria com pelo menos 2 caracteres.")
    .max(60, "A matéria pode ter no máximo 60 caracteres."),
  notes: z
    .string()
    .trim()
    .max(5000, "As anotações podem ter no máximo 5000 caracteres.")
    .nullish()
    .transform((value) => (value ? value : null)),
  lastReviewedAt: z.coerce
    .date({ error: "Informe uma data válida." })
    .refine((date) => date.getTime() <= Date.now() + FUTURE_TOLERANCE_MS, "A data não pode estar no futuro.")
    .refine((date) => date.getFullYear() >= 2000, "Informe uma data a partir do ano 2000."),
  reviewCount: z.coerce
    .number({ error: "Informe um número." })
    .int("Use um número inteiro.")
    .min(1, "O mínimo é 1 (o primeiro estudo).")
    .max(100, "O máximo é 100."),
});

export type TopicInput = z.infer<typeof topicInputSchema>;

/** PATCH body: any subset of the topic fields. */
export const topicUpdateSchema = topicInputSchema.partial();

export type TopicUpdate = z.infer<typeof topicUpdateSchema>;

export const reviewInputSchema = z.object({
  outcome: z.enum(["REMEMBERED", "FORGOT"]).default("REMEMBERED"),
});

const emailSchema = z
  .string({ error: "Informe seu e-mail." })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Informe um e-mail válido." }));

export const signupSchema = z.object({
  name: z
    .string({ error: "Informe seu nome." })
    .trim()
    .min(2, "Informe seu nome (mínimo 2 caracteres).")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  email: emailSchema,
  password: z
    .string({ error: "Informe uma senha." })
    .min(8, "A senha precisa ter pelo menos 8 caracteres.")
    // bcrypt only uses the first 72 bytes of a password.
    .refine((value) => new TextEncoder().encode(value).length <= 72, "A senha é longa demais (máx. 72 bytes)."),
  adult: z.literal(true, { error: "É preciso ter 18 anos ou mais para usar o ESTUDEI." }),
  timezone: z
    .string()
    .optional()
    .transform((value) => (value && isValidTimeZone(value) ? value : "America/Sao_Paulo")),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: "Informe sua senha." }).min(1, "Informe sua senha."),
});

/** Field → first error message, ready to show under each input. */
export type FieldErrors = Record<string, string>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
