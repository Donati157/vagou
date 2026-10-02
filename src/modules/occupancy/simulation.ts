/**
 * Simulation model (pure, seedable). Produces plausible occupancy for demos when no real
 * data source is connected. Output is always tagged SIMULATION by the caller.
 */
import { localParts } from "@/lib/time";

export type Rng = () => number;

export function seededRng(seed: number): Rng {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const PROFILES = {
  SHOPPING: [0.05, 0.03, 0.02, 0.02, 0.02, 0.03, 0.06, 0.12, 0.2, 0.3, 0.45, 0.58, 0.7, 0.74, 0.72, 0.74, 0.8, 0.86, 0.88, 0.84, 0.72, 0.55, 0.32, 0.12],
  COMMERCIAL_BUILDING: [0.04, 0.03, 0.03, 0.03, 0.03, 0.05, 0.15, 0.45, 0.78, 0.9, 0.93, 0.92, 0.85, 0.88, 0.92, 0.9, 0.82, 0.62, 0.35, 0.18, 0.1, 0.07, 0.05, 0.04],
  DEFAULT: [0.18, 0.15, 0.12, 0.1, 0.1, 0.12, 0.2, 0.35, 0.55, 0.65, 0.7, 0.74, 0.76, 0.75, 0.74, 0.76, 0.78, 0.74, 0.65, 0.55, 0.45, 0.35, 0.28, 0.22],
} as const;

/** Target share of operational spaces occupied at a given instant. */
export function targetOccupancy(kind: string, at: Date, demand = 1): number {
  const p = localParts(at);
  const profile = kind === "SHOPPING" ? PROFILES.SHOPPING : kind === "COMMERCIAL_BUILDING" ? PROFILES.COMMERCIAL_BUILDING : PROFILES.DEFAULT;
  const h = profile[p.hour] + (profile[(p.hour + 1) % 24] - profile[p.hour]) * (p.minute / 60);
  const weekend = p.weekday === 0 || p.weekday === 6;
  const factor = kind === "COMMERCIAL_BUILDING" ? (weekend ? 0.25 : 1) : kind === "SHOPPING" ? (weekend ? 1.12 : 0.95) : weekend ? 0.85 : 1;
  return Math.max(0, Math.min(0.99, h * factor * demand));
}

export type SimSpace = { id: string; status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "UNAVAILABLE" };

/**
 * Moves the space set toward the target occupancy with some churn (cars leaving/arriving).
 * Never touches UNAVAILABLE (maintenance) or RESERVED (operator-defined) spaces.
 */
export function stepSpaces(spaces: SimSpace[], target: number, rng: Rng, churn = 0.04): Array<{ id: string; to: SimSpace["status"] }> {
  const movable = spaces.filter((s) => s.status === "AVAILABLE" || s.status === "OCCUPIED");
  if (movable.length === 0) return [];
  const occupied = movable.filter((s) => s.status === "OCCUPIED");
  const free = movable.filter((s) => s.status === "AVAILABLE");
  const desired = Math.round(target * movable.length);
  const changes: Array<{ id: string; to: SimSpace["status"] }> = [];
  const shuffle = <T,>(arr: T[]) => arr.map((v) => [rng(), v] as const).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  const delta = desired - occupied.length;
  // natural churn: some leave and others arrive even at equilibrium
  const churnCount = Math.min(occupied.length, free.length, Math.round(movable.length * churn * rng()));
  const leaving = shuffle(occupied).slice(0, churnCount + Math.max(0, -delta));
  const arriving = shuffle(free).slice(0, churnCount + Math.max(0, delta));
  for (const s of leaving) changes.push({ id: s.id, to: "AVAILABLE" });
  for (const s of arriving) changes.push({ id: s.id, to: "OCCUPIED" });
  return changes;
}

/** Aggregate (count-only) simulation for facilities without a digital map. */
export function simulateAggregate(capacity: number, target: number, rng: Rng) {
  const unavailable = Math.round(capacity * 0.02);
  const operational = capacity - unavailable;
  const noise = (rng() - 0.5) * 0.06;
  const occupied = Math.max(0, Math.min(operational, Math.round(operational * Math.min(1, target + noise))));
  return { total: capacity, available: operational - occupied, occupied, reserved: 0, unavailable };
}
