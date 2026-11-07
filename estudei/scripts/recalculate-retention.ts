/**
 * Scheduled job: recalculates the stored retention of every topic.
 *
 *   npm run job:recalculate
 *
 * Example crontab entry (every hour):
 *   0 * * * * cd /caminho/para/estudei && npm run job:recalculate >> /var/log/estudei-job.log 2>&1
 */
import "dotenv/config";
import { createPrismaClient } from "../src/server/db";
import { recalculateRetention } from "../src/server/retention-job";

const prisma = createPrismaClient();

try {
  const result = await recalculateRetention(prisma);
  console.log(`[estudei] ${result.updated} tópico(s) recalculado(s) em ${result.calculatedAt}`);
} catch (error) {
  console.error("[estudei] Falha ao recalcular a retenção:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
