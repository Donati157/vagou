import "server-only";
import { seededRng, simulateAggregate, stepSpaces, targetOccupancy, type SimSpace } from "./simulation";
import type { StatusCounts } from "./availability";

/**
 * OccupancyProvider — decouples where occupancy comes from from how it is shown.
 *
 * Implemented in V1:
 *  - SimulationOccupancyProvider (SIMULADA): demo fallback, always labeled as simulated.
 *  - ManualOccupancyProvider (FUNCIONAL): operators change statuses in the operational map (push-only).
 * Prepared (interface + registry only, PREPARADA): Camera, Sensor, Gate, ParkingManagement, API providers.
 */
export type SpaceObservation = { spaceId: string; status: SimSpace["status"] };

export type PollContext = {
  facilityId: string;
  facilityKind: string;
  granularity: "SPACE" | "AGGREGATE";
  spaces: SimSpace[];
  capacity: number;
  now: Date;
  /** Per-facility demand multiplier from the data source config (demo tuning). */
  demand: number;
};

export type PollResult = { kind: "spaces"; observations: SpaceObservation[] } | { kind: "aggregate"; counts: StatusCounts & { total: number } } | null;

export interface OccupancyProvider {
  readonly kind: "SIMULATION" | "MANUAL" | "CAMERA" | "SENSOR" | "GATE" | "PARKING_MANAGEMENT" | "API";
  readonly isSimulated: boolean;
  /** Pull-based providers return fresh observations; push-based providers return null. */
  poll(ctx: PollContext): Promise<PollResult>;
}

export class SimulationOccupancyProvider implements OccupancyProvider {
  readonly kind = "SIMULATION" as const;
  readonly isSimulated = true;
  async poll(ctx: PollContext): Promise<PollResult> {
    const rng = seededRng(Math.floor(ctx.now.getTime() / 1000) ^ hash(ctx.facilityId));
    const target = targetOccupancy(ctx.facilityKind, ctx.now, ctx.demand);
    if (ctx.granularity === "AGGREGATE") return { kind: "aggregate", counts: simulateAggregate(ctx.capacity, target, rng) };
    return { kind: "spaces", observations: stepSpaces(ctx.spaces, target, rng).map((c) => ({ spaceId: c.id, status: c.to })) };
  }
}

export class ManualOccupancyProvider implements OccupancyProvider {
  readonly kind = "MANUAL" as const;
  readonly isSimulated = false;
  async poll(): Promise<PollResult> {
    return null; // updates are pushed by operators through the operational map
  }
}

/** Placeholder for integrations that are architected but not connected in V1. */
class NotConnectedProvider implements OccupancyProvider {
  readonly isSimulated = false;
  constructor(readonly kind: "CAMERA" | "SENSOR" | "GATE" | "PARKING_MANAGEMENT" | "API") {}
  async poll(): Promise<PollResult> {
    return null; // future: CameraOccupancyProvider, SensorOccupancyProvider, GateSystemProvider, ParkingManagementProvider…
  }
}

export function getOccupancyProvider(kind: OccupancyProvider["kind"]): OccupancyProvider {
  if (kind === "SIMULATION") return new SimulationOccupancyProvider();
  if (kind === "MANUAL") return new ManualOccupancyProvider();
  return new NotConnectedProvider(kind);
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
