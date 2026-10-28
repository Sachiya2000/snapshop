import { defineConfig } from "prisma/config";

// Next.js reads .env.local itself; the Prisma CLI does not. On Vercel the file
// doesn't exist and DATABASE_URL comes from the environment.
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Not read via env(), which throws when unset: `prisma generate` (postinstall)
  // must work without a database URL. Migrations and queries still need it.
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
