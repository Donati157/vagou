import { describe, expect, it } from "vitest";
import { dailySeries, hourlyProfile, occupancyOf, summarize, weekdayProfile, type Snapshot } from "@/modules/occupancy/analytics";
import { zonedToUtc } from "@/lib/time";

const snap = (date: string, time: string, occupied: number, total = 100, unavailable = 0): Snapshot => ({
  capturedAt: zonedToUtc(date, time),
  total,
  unavailable,
  reserved: 0,
  occupied,
  available: total - unavailable - occupied,
});

describe("occupancy analytics", () => {
  const snaps = [snap("2026-10-05", "09:00", 40), snap("2026-10-05", "10:00", 90), snap("2026-10-06", "09:00", 60), snap("2026-10-06", "10:00", 100), snap("2026-10-06", "11:00", 50, 100, 10)];

  it("computes occupancy over operational spaces", () => {
    expect(occupancyOf(snap("2026-10-05", "12:00", 45, 100, 10))).toBeCloseTo(0.5);
  });

  it("averages by hour of day in São Paulo time", () => {
    const h = hourlyProfile(snaps);
    expect(h[9].ocupacao).toBeCloseTo(0.5);
    expect(h[10].ocupacao).toBeCloseTo(0.95);
    expect(h[10].livres).toBe(5);
    expect(h[3].samples).toBe(0);
  });

  it("builds daily average and peak", () => {
    const d = dailySeries(snaps);
    expect(d).toHaveLength(2);
    expect(d[0]).toMatchObject({ dia: "05/10", pico: 0.9 });
    expect(d[1].pico).toBe(1);
  });

  it("profiles weekdays (Mon first)", () => {
    expect(weekdayProfile(snaps)[0].dia).toBe("Seg");
    expect(weekdayProfile(snaps)[0].ocupacao).toBeCloseTo(0.65);
  });

  it("summarizes peaks, idle capacity and time full", () => {
    const s = summarize(snaps)!;
    expect(s.peakHour).toBe(10);
    expect(s.peakOccupancy).toBe(1);
    expect(s.fullShare).toBeCloseTo(0.2);
    expect(s.idleSpaceHours).toBeGreaterThan(0);
    expect(summarize([])).toBeNull();
  });
});
