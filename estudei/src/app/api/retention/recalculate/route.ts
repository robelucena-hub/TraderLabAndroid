import { db } from "@/server/db";
import { withUser } from "@/server/http";
import { recalculateRetention } from "@/server/retention-job";

/** POST /api/retention/recalculate — on-demand refresh of the user's stored retention. */
export const POST = withUser(async (_request, user) => {
  const result = await recalculateRetention(db(), { userId: user.id });
  return Response.json(result);
});
