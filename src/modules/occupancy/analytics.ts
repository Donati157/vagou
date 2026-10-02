/**
 * Occupancy analytics (pure). Inputs are facility snapshots; all times in São Paulo local time.
 * Occupancy = (occupied + reserved) / operational spaces (total − unavailable).
 */
import { localParts } from "@/lib/time";
import { WEEKDAY_SHORT } from "@/lib/labels";

export type Snapshot = { capturedAt: Date; total: number; available: number; occupied: number; reserved: number; unavailable: number };

export const occupancyOf = (s: Snapshot) => {
  const operational = s.total - s.unavailable;
  return operational > 0 ? (s.occupied + s.reserved) / operational : 0;
};

/** Average occupancy and average free spaces by hour of day (0–23). */
export function hourlyProfile(snaps: Snapshot[]) {
  const acc = Array.from({ length: 24 }, () => ({ occ: 0, free: 0, used: 0, n: 0 }));
  for (const s of snaps) {
    const h = localParts(s.capturedAt).hour;
    acc[h].occ += occupancyOf(s);
    acc[h].free += s.available;
    acc[h].used += s.occupied + s.reserved;
    acc[h].n++;
  }
  return acc.map((a, hour) => ({
    hora: `${String(hour).padStart(2, "0")}h`,
    hour,
    ocupacao: a.n ? a.occ / a.n : 0,
    livres: a.n ? Math.round(a.free / a.n) : 0,
    utilizadas: a.n ? Math.round(a.used / a.n) : 0,
    samples: a.n,
  }));
}

/** Daily average and peak occupancy. */
export function dailySeries(snaps: Snapshot[]) {
  const byDay = new Map<string, { sum: number; n: number; peak: number }>();
  for (const s of snaps) {
    const k = localParts(s.capturedAt).dateKey;
    const o = occupancyOf(s);
    const e = byDay.get(k) ?? { sum: 0, n: 0, peak: 0 };
    e.sum += o;
    e.n++;
    e.peak = Math.max(e.peak, o);
    byDay.set(k, e);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ({ dia: `${k.slice(8, 10)}/${k.slice(5, 7)}`, dateKey: k, media: v.sum / v.n, pico: v.peak }));
}

/** Occupancy by weekday (Seg..Dom). */
export function weekdayProfile(snaps: Snapshot[]) {
  const acc = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
  for (const s of snaps) {
    const wd = localParts(s.capturedAt).weekday;
    acc[wd].sum += occupancyOf(s);
    acc[wd].n++;
  }
  return [1, 2, 3, 4, 5, 6, 0].map((wd) => ({ dia: WEEKDAY_SHORT[wd], ocupacao: acc[wd].n ? acc[wd].sum / acc[wd].n : 0 }));
}

/**
 * Headline numbers. Idle capacity = average free spaces while open, expressed also as
 * "space-hours" left unused over the period (assumes roughly hourly snapshots).
 */
export function summarize(snaps: Snapshot[], isOpenAt: (d: Date) => boolean = () => true) {
  if (snaps.length === 0) return null;
  const open = snaps.filter((s) => isOpenAt(s.capturedAt));
  const base = open.length ? open : snaps;
  const avg = base.reduce((a, s) => a + occupancyOf(s), 0) / base.length;
  const peak = base.reduce((best, s) => (occupancyOf(s) > occupancyOf(best) ? s : best), base[0]);
  const hours = hourlyProfile(base).filter((h) => h.samples > 0);
  const peakHour = hours.reduce((a, b) => (b.ocupacao > a.ocupacao ? b : a), hours[0]);
  const quietHour = hours.reduce((a, b) => (b.ocupacao < a.ocupacao ? b : a), hours[0]);
  const avgFree = base.reduce((a, s) => a + s.available, 0) / base.length;
  const sorted = [...base].sort((a, b) => +a.capturedAt - +b.capturedAt);
  let idleSpaceHours = 0;
  for (let i = 1; i < sorted.length; i++) {
    const dtHours = Math.min(2, (sorted[i].capturedAt.getTime() - sorted[i - 1].capturedAt.getTime()) / 3_600_000);
    idleSpaceHours += sorted[i - 1].available * dtHours;
  }
  const fullShare = base.filter((s) => s.available === 0).length / base.length;
  return { avgOccupancy: avg, peakOccupancy: occupancyOf(peak), peakAt: peak.capturedAt, peakHour: peakHour?.hour ?? null, quietHour: quietHour?.hour ?? null, avgFree, idleSpaceHours: Math.round(idleSpaceHours), fullShare };
}
