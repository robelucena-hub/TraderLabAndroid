import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Creates a Prisma client backed by the `pg` driver adapter (Prisma 7). */
export function createPrismaClient(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) {
    throw new Error("DATABASE_URL não definida. Copie .env.example para .env e ajuste a conexão.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// One client per process, reused across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Shared Prisma client. Created on first use (not at import time) so that
 * `next build` does not need a database connection.
 */
export function db(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}
