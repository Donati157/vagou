import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Both drivers expose the same query-builder API; we type against postgres-js.
export type Database = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function pgliteDataDir() {
  return process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), ".data", "pglite");
}

/** Connection string of a real PostgreSQL (Vercel/Neon/Supabase integrations expose one of these). */
export function postgresUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || null;
}

export function createDatabase(opts: { inMemory?: boolean } = {}): Database {
  const url = postgresUrl();
  if (url && !opts.inMemory) {
    const client = postgres(url, {
      // Small pool: each serverless instance keeps few connections; poolers multiplex the rest.
      max: Number(process.env.DATABASE_POOL_SIZE ?? 5),
      // Transaction-mode poolers (Neon/Supabase/PgBouncer) don't support prepared statements.
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 15,
      onnotice: () => {}, // ignore informational NOTICEs (e.g. "already exists, skipping")
    });
    return drizzlePostgres(client, { schema });
  }
  if (!opts.inMemory && process.env.VERCEL) {
    // Serverless filesystems are ephemeral/read-only: the embedded database would lose data.
    throw new Error("DATABASE_URL is required in production (configure a PostgreSQL database).");
  }
  if (!opts.inMemory) {
    fs.mkdirSync(pgliteDataDir(), { recursive: true });
    acquireLock();
  }
  const client = new PGlite({ dataDir: opts.inMemory ? undefined : pgliteDataDir(), extensions: { btree_gist } });
  if (!opts.inMemory) {
    // Flush and close cleanly on shutdown so the on-disk database stays consistent.
    const close = () => {
      client
        .close()
        .catch(() => {})
        .finally(() => {
          releaseLock();
          process.exit(0);
        });
    };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
    process.once("exit", releaseLock);
  }
  return drizzlePglite(client, { schema }) as unknown as Database;
}

/**
 * The embedded database supports a single process. Two processes opening the same data
 * directory (e.g. `npm run dev` and `npm run db:seed`) corrupt it, so we guard with a pid lock.
 */
function lockFile() {
  return `${pgliteDataDir()}.lock`;
}

function acquireLock() {
  const file = lockFile();
  if (fs.existsSync(file)) {
    const pid = Number(fs.readFileSync(file, "utf8"));
    let alive = false;
    if (pid && pid !== process.pid) {
      try {
        process.kill(pid, 0);
        alive = true;
      } catch {
        alive = false;
      }
    }
    if (alive) {
      throw new Error(
        `O banco embutido já está em uso pelo processo ${pid} (provavelmente "npm run dev"). ` +
          "Pare-o antes de rodar migrations/seed, ou configure DATABASE_URL para usar um PostgreSQL.",
      );
    }
  }
  fs.writeFileSync(file, String(process.pid));
}

function releaseLock() {
  try {
    if (Number(fs.readFileSync(lockFile(), "utf8")) === process.pid) fs.rmSync(lockFile());
  } catch {
    /* already released */
  }
}
