import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Drizzle renders columns of single-table queries unqualified ("id"), so interpolating a column
 * inside a correlated subquery (`... where x.col = ${table.col}`) silently binds to the inner
 * table. This guard fails if that pattern reappears; use the literal "table"."column" instead.
 */
function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith(".ts") || e.name.endsWith(".tsx") ? [path.join(dir, e.name)] : []));
}

describe("SQL subquery guard", () => {
  it("never interpolates outer columns inside raw correlated subqueries", () => {
    const schema = fs.readFileSync(path.resolve(import.meta.dirname, "../../src/server/db/schema.ts"), "utf8");
    const tables = [...schema.matchAll(/export const (\w+) = pgTable\(/g)].map((m) => m[1]);
    const pattern = new RegExp(`\\((?:select|exists \\(select) [^\`]*?\\bwhere\\b[^\`]*?\\$\\{(?:${tables.join("|")})\\.[a-zA-Z]+\\}`, "g");
    expect(tables.length).toBeGreaterThan(10);
    const offenders: string[] = [];
    for (const f of files(path.resolve(import.meta.dirname, "../../src"))) {
      const src = fs.readFileSync(f, "utf8");
      for (const m of src.matchAll(pattern)) offenders.push(`${path.relative(process.cwd(), f)}: ${m[0].slice(0, 80)}`);
    }
    expect(offenders).toEqual([]);
  });
});
