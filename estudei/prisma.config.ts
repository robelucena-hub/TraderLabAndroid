import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 reads the connection string and the seed command from here
// instead of from schema.prisma / package.json.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Optional so `prisma generate` (run on npm install) works before .env exists.
    url: process.env.DATABASE_URL,
  },
});
