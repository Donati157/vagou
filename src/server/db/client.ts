import "server-only";
import { createDatabase, type Database } from "./create";

/**
 * Process-wide database singleton, opened lazily on first use (so build workers that only
 * import modules never open the embedded database). Uses PostgreSQL via DATABASE_URL when
 * configured, otherwise an embedded PostgreSQL (PGlite) persisted on disk — see README.
 */
const globalForDb = globalThis as unknown as { __vagouDb?: Database };

function instance(): Database {
  globalForDb.__vagouDb ??= createDatabase();
  return globalForDb.__vagouDb;
}

export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const real = instance();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export type { Database, Tx } from "./create";
