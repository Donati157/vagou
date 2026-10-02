import { execSync } from "node:child_process";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Regression guard for the /app (Favoritos) crash: FacilityCard attached event handlers without being a
 * Client Component. It worked inside the client-side search view, but the Server Component /app page
 * rendering it threw "Event handlers cannot be passed to Client Component props".
 * Any component file that attaches DOM event handlers must declare "use client".
 */
describe("client component boundary", () => {
  it('every .tsx file that attaches event handlers declares "use client"', () => {
    const files = execSync("git ls-files 'src/**/*.tsx'", { encoding: "utf8" }).split("\n").filter(Boolean);
    const offenders = files.filter((f) => {
      const src = fs.readFileSync(f, "utf8");
      return /\son[A-Z][A-Za-z]+=\{/.test(src) && !/^\s*["']use client["']/.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it("FacilityCard (rendered by the server /app page) is a Client Component", () => {
    expect(fs.readFileSync("src/modules/search/components/result-card.tsx", "utf8")).toMatch(/^"use client";/);
  });
});
