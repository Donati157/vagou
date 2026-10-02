import { defineConfig } from "drizzle-kit";

// Migrations are generated from src/server/db/schema.ts and applied by `npm run db:migrate`
// (which works with both the embedded PGlite database and a real PostgreSQL via DATABASE_URL).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
});
