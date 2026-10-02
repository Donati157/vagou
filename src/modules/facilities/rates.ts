/** Informational price estimate from a facility's published rate table (pure). Vagou does not charge drivers. */
export type Rate = {
  label: string;
  vehicleType: string;
  firstPeriodMinutes: number;
  firstPeriodCents: number;
  additionalHourCents: number | null;
  dailyMaxCents: number | null;
};

/**
 * Estimated cost for staying `minutes`:
 * first period at the fixed price, then each started hour at the additional price,
 * every full/partial 24h capped at the daily maximum when one exists.
 */
export function estimateCost(rate: Rate, minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  const dayCost = (m: number) => {
    let c = rate.firstPeriodCents;
    if (m > rate.firstPeriodMinutes) c += Math.ceil((m - rate.firstPeriodMinutes) / 60) * (rate.additionalHourCents ?? rate.firstPeriodCents);
    return rate.dailyMaxCents ? Math.min(c, rate.dailyMaxCents) : c;
  };
  const fullDays = Math.floor(minutes / 1440);
  const rest = minutes % 1440;
  const perDay = rate.dailyMaxCents ?? dayCost(1440);
  return fullDays * perDay + (rest > 0 ? dayCost(rest) : 0);
}

/** "A partir de" price shown on cards: cheapest first period among car rates. */
export function startingPrice(rates: Rate[]): number | null {
  const cars = rates.filter((r) => r.vehicleType === "CAR");
  const pool = cars.length ? cars : rates;
  if (pool.length === 0) return null;
  return Math.min(...pool.map((r) => r.firstPeriodCents));
}
