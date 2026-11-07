import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema, toFieldErrors, topicInputSchema, topicUpdateSchema } from "./validation";

const validTopic = {
  title: "  Leis de Newton ",
  subject: "Física",
  notes: "",
  lastReviewedAt: "2026-03-01T12:00:00.000Z",
  reviewCount: "2",
};

describe("topicInputSchema", () => {
  it("trims text, coerces numbers/dates and turns empty notes into null", () => {
    const parsed = topicInputSchema.parse(validTopic);
    expect(parsed.title).toBe("Leis de Newton");
    expect(parsed.reviewCount).toBe(2);
    expect(parsed.lastReviewedAt).toBeInstanceOf(Date);
    expect(parsed.notes).toBeNull();
  });

  it("rejects future dates, zero reviews and short titles with pt-BR messages", () => {
    const result = topicInputSchema.safeParse({
      ...validTopic,
      title: "x",
      lastReviewedAt: "2999-01-01T00:00:00Z",
      reviewCount: 0,
    });
    expect(result.success).toBe(false);
    const errors = toFieldErrors(result.error!);
    expect(errors.title).toMatch(/pelo menos 2 caracteres/);
    expect(errors.lastReviewedAt).toMatch(/futuro/);
    expect(errors.reviewCount).toMatch(/mínimo é 1/);
  });

  it("allows partial updates", () => {
    expect(topicUpdateSchema.parse({ title: "Novo título" })).toEqual({ title: "Novo título" });
  });
});

describe("signupSchema", () => {
  const valid = { name: "Ana", email: " Ana@Exemplo.COM ", password: "12345678", adult: true };

  it("normalizes the e-mail and defaults the time zone", () => {
    const parsed = signupSchema.parse(valid);
    expect(parsed.email).toBe("ana@exemplo.com");
    expect(parsed.timezone).toBe("America/Sao_Paulo");
  });

  it("keeps a valid browser time zone and ignores an invalid one", () => {
    expect(signupSchema.parse({ ...valid, timezone: "Europe/Lisbon" }).timezone).toBe("Europe/Lisbon");
    expect(signupSchema.parse({ ...valid, timezone: "Mars/Olympus" }).timezone).toBe("America/Sao_Paulo");
  });

  it("requires the 18+ confirmation and an 8+ character password", () => {
    const result = signupSchema.safeParse({ ...valid, adult: false, password: "123" });
    const errors = toFieldErrors(result.error!);
    expect(errors.adult).toMatch(/18 anos/);
    expect(errors.password).toMatch(/8 caracteres/);
  });

  it("rejects passwords longer than bcrypt's 72-byte limit", () => {
    expect(signupSchema.safeParse({ ...valid, password: "é".repeat(40) }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("rejects an invalid e-mail", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
});
