import { describe, expect, it } from "vitest";
import { openStatus, weekSummary } from "@/modules/facilities/hours";
import { zonedToUtc } from "@/lib/time";

const shopping = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensMinute: 540, closesMinute: 1380 })).concat([{ weekday: 0, opensMinute: 660, closesMinute: 1260 }]);

describe("openStatus", () => {
  it("is open with closing time during business hours", () => {
    expect(openStatus(shopping, zonedToUtc("2026-10-05", "15:00"))).toEqual({ open: true, label: "Aberto · fecha às 23:00" });
  });
  it("tells when it opens later today or tomorrow", () => {
    expect(openStatus(shopping, zonedToUtc("2026-10-05", "07:00")).label).toBe("Fechado · abre às 09:00");
    expect(openStatus(shopping, zonedToUtc("2026-10-10", "23:30")).label).toBe("Fechado · abre amanhã às 11:00");
  });
  it("recognises 24h facilities", () => {
    const always = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensMinute: 0, closesMinute: 1440 }));
    expect(openStatus(always, new Date()).label).toBe("Aberto 24 horas");
  });
  it("summarises the week", () => {
    expect(weekSummary(shopping)[6]).toEqual({ weekday: 0, day: "Dom", text: "11:00–21:00" });
  });
});
