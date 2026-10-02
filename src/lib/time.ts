/** Time helpers. All business times are interpreted in São Paulo local time. */
export const APP_TZ = "America/Sao_Paulo";

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
});

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
  /** minutes since local midnight */
  minuteOfDay: number;
  /** YYYY-MM-DD */
  dateKey: string;
};

export function localParts(d: Date): LocalParts {
  const p: Record<string, string> = {};
  for (const part of partsFmt.formatToParts(d)) p[part.type] = part.value;
  const hour = Number(p.hour);
  const minute = Number(p.minute);
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour,
    minute,
    weekday: WEEKDAYS[p.weekday],
    minuteOfDay: hour * 60 + minute,
    dateKey: `${p.year}-${p.month}-${p.day}`,
  };
}

/** Offset (minutes) of São Paulo relative to UTC at a given instant (e.g. -180). */
function tzOffsetMinutes(d: Date): number {
  const p = localParts(d);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, d.getUTCSeconds());
  return Math.round((asUtc - d.getTime()) / 60000);
}

/** Converts a local São Paulo date ("2026-10-02") + time ("14:30") to a UTC Date. */
export function zonedToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const offset = tzOffsetMinutes(guess);
  return new Date(guess.getTime() - offset * 60000);
}

/** Start of the local day (00:00 São Paulo) containing `d`, as UTC Date. */
export function startOfLocalDay(d: Date): Date {
  return zonedToUtc(localParts(d).dateKey, "00:00");
}

export function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60000);
}

export function addDays(d: Date, days: number) {
  return addMinutes(d, days * 1440);
}

export function minutesBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

export function toDateInput(d: Date) {
  return localParts(d).dateKey;
}

export function toTimeInput(d: Date) {
  const p = localParts(d);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/** Rounds up to the next multiple of `step` minutes (local wall clock). */
export function ceilToStep(d: Date, step = 30): Date {
  const ms = step * 60000;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}
