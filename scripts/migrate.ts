import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import { createDatabase, postgresUrl } from "../src/server/db/create";
import { loadEnv } from "./env";

loadEnv();

export async function runMigrations(db = createDatabase()) {
  const migrationsFolder = "./drizzle";
  if (postgresUrl()) {
    await migratePostgres(db, { migrationsFolder });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migratePglite(db as any, { migrationsFolder });
  }
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  if (process.env.VERCEL && !postgresUrl()) {
    console.error("✖ DATABASE_URL não configurada. Em produção a Vagou precisa de um PostgreSQL (ex.: Neon via Vercel Marketplace).");
    process.exit(1);
  }
  runMigrations()
    .then(() => {
      console.log("✔ Migrations aplicadas");
      process.exit(0);
    })
    .catch((err) => {
      console.error("✖ Falha ao aplicar migrations", err);
      process.exit(1);
    });
}
