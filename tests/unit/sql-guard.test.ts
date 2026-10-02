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
    const offenders: string[] = [];
    for (const f of files(path.resolve(import.meta.dirname, "../../src"))) {
      const src = fs.readFileSync(f, "utf8");
      for (const m of src.matchAll(/\((?:select|exists \(select) [^`]*?\bwhere\b[^`]*?\$\{[a-zA-Z]+\.[a-zA-Z]+\}/g)) offenders.push(`${path.relative(process.cwd(), f)}: ${m[0].slice(0, 80)}`);
    }
    expect(offenders).toEqual([]);
  });
});
