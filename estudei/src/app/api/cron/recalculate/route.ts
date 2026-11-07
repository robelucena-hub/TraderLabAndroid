import { timingSafeEqual } from "node:crypto";
import { db } from "@/server/db";
import { handleError, jsonError } from "@/server/http";
import { recalculateRetention } from "@/server/retention-job";

/**
 * Scheduled job endpoint: recalculates stored retention for ALL users.
 * Call it from any scheduler (Vercel Cron, GitHub Actions, crontab + curl):
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://seu-dominio/api/cron/recalculate
 */
async function handle(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return jsonError("CRON_SECRET não configurado no servidor.", 503);

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return jsonError("Não autorizado.", 401);
  }

  try {
    return Response.json(await recalculateRetention(db()));
  } catch (error) {
    return handleError(error);
  }
}

export const GET = handle;
export const POST = handle;
