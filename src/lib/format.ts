import { APP_TZ } from "./time";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatMoney = (cents: number) => brl.format(cents / 100);
export const formatMoneyShort = (cents: number) =>
  cents >= 100_000_00 ? `R$ ${(cents / 100_000_00).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi` : cents >= 1_000_00 ? `R$ ${(cents / 1_000_00).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : brl.format(cents / 100);

export const formatNumber = (n: number) => n.toLocaleString("pt-BR");
export const formatPercent = (ratio: number, digits = 0) =>
  `${(ratio * 100).toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`;

const dateFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: APP_TZ, day: "2-digit", month: "short" });
const dateLongFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: APP_TZ, weekday: "long", day: "numeric", month: "long" });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: APP_TZ, hour: "2-digit", minute: "2-digit" });
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: APP_TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fullDateFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: APP_TZ, day: "2-digit", month: "2-digit", year: "numeric" });

export const formatDate = (d: Date) => dateFmt.format(d).replace(".", "");
const dayFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: APP_TZ, day: "2-digit" });
const monthFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: APP_TZ, month: "short" });
export const formatDayMonth = (d: Date) => ({ day: dayFmt.format(d), month: monthFmt.format(d).replace(".", "") });
export const formatDateLong = (d: Date) => dateLongFmt.format(d);
export const formatTime = (d: Date) => timeFmt.format(d);
export const formatDateTime = (d: Date) => dateTimeFmt.format(d);
export const formatFullDate = (d: Date) => fullDateFmt.format(d);

export function formatDuration(minutes: number) {
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  return [d ? `${d}d` : "", h ? `${h}h` : "", m ? `${m}min` : ""].filter(Boolean).join(" ") || "0min";
}

export function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

export function formatRelative(d: Date, now = new Date()) {
  const s = Math.round((now.getTime() - d.getTime()) / 1000);
  if (s < 10) return "agora mesmo";
  if (s < 60) return `há ${s} s`;
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  return formatDateTime(d);
}
