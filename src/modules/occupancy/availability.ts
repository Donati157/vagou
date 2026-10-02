/**
 * Public availability semantics (pure). Turns raw counts + source metadata into what a driver sees.
 * Simulated data is always flagged so the UI can label it — never shown as real telemetry.
 */
export type StatusCounts = { available: number; occupied: number; reserved: number; unavailable: number };
export type AvailabilityState = "AVAILABLE" | "FEW" | "FULL" | "UNKNOWN";

export const STALE_AFTER_MINUTES = 15;
export const FEW_RATIO = 0.1;
export const FEW_ABSOLUTE = 10;

export function emptyCounts(): StatusCounts {
  return { available: 0, occupied: 0, reserved: 0, unavailable: 0 };
}

export function countStatuses(statuses: Iterable<string>): StatusCounts {
  const c = emptyCounts();
  for (const s of statuses) {
    if (s === "AVAILABLE") c.available++;
    else if (s === "OCCUPIED") c.occupied++;
    else if (s === "RESERVED") c.reserved++;
    else if (s === "UNAVAILABLE") c.unavailable++;
  }
  return c;
}

export const totalOf = (c: StatusCounts) => c.available + c.occupied + c.reserved + c.unavailable;

export type PublicAvailability = {
  state: AvailabilityState;
  available: number | null;
  capacity: number;
  /** Occupied share of operational spaces (0..1), null when unknown. */
  occupancy: number | null;
  updatedAt: Date | null;
  simulated: boolean;
  sourceKind: string | null;
};

export function toPublicAvailability(input: {
  counts: StatusCounts | null;
  capacity: number;
  updatedAt: Date | null;
  sourceKind: string | null;
  now: Date;
  /** Data older than this is not shown as current availability. */
  staleAfterMinutes?: number;
}): PublicAvailability {
  const { counts, capacity, updatedAt, sourceKind, now, staleAfterMinutes = STALE_AFTER_MINUTES } = input;
  const simulated = sourceKind === "SIMULATION";
  const stale = !updatedAt || now.getTime() - updatedAt.getTime() > staleAfterMinutes * 60000;
  if (!counts || !sourceKind || stale) {
    return { state: "UNKNOWN", available: null, capacity, occupancy: null, updatedAt, simulated, sourceKind };
  }
  const operational = counts.available + counts.occupied + counts.reserved;
  const occupancy = operational > 0 ? (counts.occupied + counts.reserved) / operational : null;
  const state: AvailabilityState =
    counts.available === 0 ? "FULL" : counts.available <= Math.max(FEW_ABSOLUTE, Math.round(operational * FEW_RATIO)) && counts.available < operational ? "FEW" : "AVAILABLE";
  return { state, available: counts.available, capacity, occupancy, updatedAt, simulated, sourceKind };
}

export const AVAILABILITY_LABEL: Record<AvailabilityState, string> = {
  AVAILABLE: "Vagas disponíveis",
  FEW: "Poucas vagas",
  FULL: "Lotado",
  UNKNOWN: "Sem informação de vagas",
};

export function availabilityHeadline(a: PublicAvailability) {
  if (a.state === "UNKNOWN") return "Sem dados de ocupação";
  if (a.state === "FULL") return "Lotado";
  return `${a.available} ${a.available === 1 ? "vaga disponível" : "vagas disponíveis"}`;
}
