import { describe, expect, it } from "vitest";
import { availabilityHeadline, countStatuses, toPublicAvailability } from "@/modules/occupancy/availability";

const now = new Date("2026-10-02T15:00:00Z");
const fresh = new Date("2026-10-02T14:58:00Z");

describe("countStatuses", () => {
  it("counts each operational status", () => {
    expect(countStatuses(["AVAILABLE", "OCCUPIED", "OCCUPIED", "RESERVED", "UNAVAILABLE", "AVAILABLE"])).toEqual({ available: 2, occupied: 2, reserved: 1, unavailable: 1 });
  });
});

describe("toPublicAvailability", () => {
  const counts = { available: 40, occupied: 55, reserved: 3, unavailable: 2 };
  it("reports available spaces from a fresh source", () => {
    const a = toPublicAvailability({ counts, capacity: 100, updatedAt: fresh, sourceKind: "SENSOR", now });
    expect(a.state).toBe("AVAILABLE");
    expect(a.available).toBe(40);
    expect(a.simulated).toBe(false);
    expect(a.occupancy).toBeCloseTo(58 / 98);
  });
  it("flags simulated data so the UI can label it", () => {
    expect(toPublicAvailability({ counts, capacity: 100, updatedAt: fresh, sourceKind: "SIMULATION", now }).simulated).toBe(true);
  });
  it("marks few and full states", () => {
    expect(toPublicAvailability({ counts: { ...counts, available: 5, occupied: 90 }, capacity: 100, updatedAt: fresh, sourceKind: "SENSOR", now }).state).toBe("FEW");
    expect(toPublicAvailability({ counts: { ...counts, available: 0, occupied: 95 }, capacity: 100, updatedAt: fresh, sourceKind: "SENSOR", now }).state).toBe("FULL");
  });
  it("never shows stale or sourceless data as current", () => {
    expect(toPublicAvailability({ counts, capacity: 100, updatedAt: new Date("2026-10-02T14:00:00Z"), sourceKind: "SENSOR", now }).state).toBe("UNKNOWN");
    expect(toPublicAvailability({ counts, capacity: 100, updatedAt: fresh, sourceKind: null, now }).state).toBe("UNKNOWN");
    expect(toPublicAvailability({ counts: null, capacity: 100, updatedAt: fresh, sourceKind: "SENSOR", now }).available).toBeNull();
  });
  it("honours a longer validity window (manual counts)", () => {
    const old = new Date("2026-10-02T13:30:00Z");
    expect(toPublicAvailability({ counts, capacity: 100, updatedAt: old, sourceKind: "MANUAL", now, staleAfterMinutes: 180 }).state).toBe("AVAILABLE");
  });
  it("builds human headlines", () => {
    expect(availabilityHeadline(toPublicAvailability({ counts, capacity: 100, updatedAt: fresh, sourceKind: "SENSOR", now }))).toBe("40 vagas disponíveis");
    expect(availabilityHeadline(toPublicAvailability({ counts: { ...counts, available: 0 }, capacity: 100, updatedAt: fresh, sourceKind: "SENSOR", now }))).toBe("Lotado");
  });
});
