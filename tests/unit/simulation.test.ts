import { describe, expect, it } from "vitest";
import { seededRng, simulateAggregate, stepSpaces, targetOccupancy, type SimSpace } from "@/modules/occupancy/simulation";
import { zonedToUtc } from "@/lib/time";

describe("targetOccupancy", () => {
  it("follows the daily curve (offices full at 10h on weekdays, empty at 3h)", () => {
    const mon10 = zonedToUtc("2026-10-05", "10:00");
    const mon3 = zonedToUtc("2026-10-05", "03:00");
    expect(targetOccupancy("COMMERCIAL_BUILDING", mon10)).toBeGreaterThan(0.85);
    expect(targetOccupancy("COMMERCIAL_BUILDING", mon3)).toBeLessThan(0.1);
  });
  it("is lower for offices on weekends", () => {
    expect(targetOccupancy("COMMERCIAL_BUILDING", zonedToUtc("2026-10-10", "10:00"))).toBeLessThan(0.3);
  });
});

describe("stepSpaces", () => {
  const spaces: SimSpace[] = Array.from({ length: 100 }, (_, i) => ({ id: `s${i}`, status: i < 20 ? "OCCUPIED" : i === 99 ? "UNAVAILABLE" : i === 98 ? "RESERVED" : "AVAILABLE" }));
  it("moves occupancy toward the target", () => {
    const changes = stepSpaces(spaces, 0.6, seededRng(1));
    const occupied = new Set(spaces.filter((s) => s.status === "OCCUPIED").map((s) => s.id));
    for (const c of changes) {
      if (c.to === "OCCUPIED") occupied.add(c.id);
      else occupied.delete(c.id);
    }
    expect(occupied.size).toBeGreaterThan(50);
  });
  it("never touches unavailable or operator-reserved spaces", () => {
    const changes = stepSpaces(spaces, 0.9, seededRng(2));
    expect(changes.some((c) => c.id === "s99" || c.id === "s98")).toBe(false);
  });
  it("is deterministic for a seed", () => {
    expect(stepSpaces(spaces, 0.5, seededRng(7))).toEqual(stepSpaces(spaces, 0.5, seededRng(7)));
  });
});

describe("simulateAggregate", () => {
  it("returns consistent totals", () => {
    const c = simulateAggregate(200, 0.7, seededRng(3));
    expect(c.available + c.occupied + c.reserved + c.unavailable).toBe(200);
    expect(c.available).toBeGreaterThanOrEqual(0);
  });
});
