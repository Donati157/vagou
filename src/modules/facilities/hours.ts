/** Operating-hours rules (pure, São Paulo time). */
import { addDays, localParts, startOfLocalDay } from "@/lib/time";
import { WEEKDAY_SHORT } from "@/lib/labels";

export type HoursWindow = { weekday: number; opensMinute: number; closesMinute: number };

const fmt = (m: number) => (m >= 1440 ? "24:00" : `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);

export function is24x7(hours: HoursWindow[]) {
  return [0, 1, 2, 3, 4, 5, 6].every((d) => hours.some((h) => h.weekday === d && h.opensMinute === 0 && h.closesMinute === 1440));
}

/** Open/closed now + a short human status ("Fecha às 22:00", "Abre amanhã às 07:00"). */
export function openStatus(hours: HoursWindow[], now: Date): { open: boolean; label: string } {
  if (hours.length === 0) return { open: false, label: "Horário não informado" };
  if (is24x7(hours)) return { open: true, label: "Aberto 24 horas" };
  const p = localParts(now);
  const today = hours.filter((h) => h.weekday === p.weekday).sort((a, b) => a.opensMinute - b.opensMinute);
  const current = today.find((h) => h.opensMinute <= p.minuteOfDay && p.minuteOfDay < h.closesMinute);
  if (current) {
    // closing at midnight but open again at 00:00 next day → keep it simple
    return { open: true, label: current.closesMinute >= 1440 ? "Aberto até meia-noite" : `Aberto · fecha às ${fmt(current.closesMinute)}` };
  }
  const laterToday = today.find((h) => h.opensMinute > p.minuteOfDay);
  if (laterToday) return { open: false, label: `Fechado · abre às ${fmt(laterToday.opensMinute)}` };
  for (let i = 1; i <= 7; i++) {
    const day = localParts(startOfLocalDay(addDays(now, i))).weekday;
    const w = hours.filter((h) => h.weekday === day).sort((a, b) => a.opensMinute - b.opensMinute)[0];
    if (w) return { open: false, label: `Fechado · abre ${i === 1 ? "amanhã" : WEEKDAY_SHORT[day].toLowerCase()} às ${fmt(w.opensMinute)}` };
  }
  return { open: false, label: "Fechado" };
}

/** Week summary for detail pages: Seg..Dom → "07:00–23:00" | "24 horas" | "Fechado". */
export function weekSummary(hours: HoursWindow[]) {
  return [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const w = hours.filter((h) => h.weekday === d).sort((a, b) => a.opensMinute - b.opensMinute);
    const text = w.length === 0 ? "Fechado" : w.every((x) => x.opensMinute === 0 && x.closesMinute === 1440) ? "24 horas" : w.map((x) => `${fmt(x.opensMinute)}–${fmt(x.closesMinute)}`).join(", ");
    return { weekday: d, day: WEEKDAY_SHORT[d], text };
  });
}

export { fmt as formatMinute };
