import "server-only";
import { and, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db, type Tx } from "@/server/db/client";
import { dataSources, facilities, floors, occupancyEvents, occupancySnapshots, parkingSpaces } from "@/server/db/schema";
import { logger } from "@/server/lib/logger";
import { countStatuses, emptyCounts, toPublicAvailability, totalOf, type PublicAvailability, type StatusCounts } from "./availability";
import { getOccupancyProvider, type SpaceObservation } from "./provider";

type Exec = typeof db | Tx;
type Status = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "UNAVAILABLE";
type SourceKind = "SIMULATION" | "MANUAL" | "CAMERA" | "SENSOR" | "GATE" | "PARKING_MANAGEMENT" | "API";

const SYNC_INTERVAL_SECONDS = 45;
const SNAPSHOT_INTERVAL_MINUTES = 5;

/**
 * Applies status observations from a data source: updates spaces, appends occupancy events
 * for real changes and records a throttled facility snapshot.
 */
export async function applySpaceObservations(exec: Exec, facilityId: string, observations: SpaceObservation[], source: SourceKind, actorId: string | null = null, now = new Date()) {
  if (observations.length === 0) return 0;
  const ids = observations.map((o) => o.spaceId);
  const current = await exec
    .select({ id: parkingSpaces.id, status: parkingSpaces.opStatus })
    .from(parkingSpaces)
    .where(and(eq(parkingSpaces.facilityId, facilityId), inArray(parkingSpaces.id, ids)));
  const before = new Map(current.map((c) => [c.id, c.status]));
  const changed = observations.filter((o) => before.has(o.spaceId) && before.get(o.spaceId) !== o.status);
  if (changed.length === 0) return 0;

  const byStatus = new Map<Status, string[]>();
  for (const o of changed) byStatus.set(o.status, [...(byStatus.get(o.status) ?? []), o.spaceId]);
  for (const [status, list] of byStatus) {
    await exec
      .update(parkingSpaces)
      .set({ opStatus: status, opStatusSource: source, opStatusUpdatedAt: now, updatedAt: now })
      .where(and(eq(parkingSpaces.facilityId, facilityId), inArray(parkingSpaces.id, list)));
  }
  await exec.insert(occupancyEvents).values(changed.map((o) => ({ facilityId, parkingSpaceId: o.spaceId, fromStatus: before.get(o.spaceId)!, toStatus: o.status, source, actorId, observedAt: now })));
  await maybeSnapshot(exec, facilityId, source, now);
  return changed.length;
}

async function maybeSnapshot(exec: Exec, facilityId: string, source: SourceKind, now: Date, force = false) {
  const [last] = await exec
    .select({ capturedAt: occupancySnapshots.capturedAt })
    .from(occupancySnapshots)
    .where(and(eq(occupancySnapshots.facilityId, facilityId), isNull(occupancySnapshots.floorId)))
    .orderBy(desc(occupancySnapshots.capturedAt))
    .limit(1);
  if (!force && last && now.getTime() - last.capturedAt.getTime() < SNAPSHOT_INTERVAL_MINUTES * 60000) return;
  const rows = await exec
    .select({ status: parkingSpaces.opStatus, n: sql<number>`count(*)::int` })
    .from(parkingSpaces)
    .where(and(eq(parkingSpaces.facilityId, facilityId), isNull(parkingSpaces.archivedAt)))
    .groupBy(parkingSpaces.opStatus);
  const c = emptyCounts();
  for (const r of rows) c[r.status.toLowerCase() as keyof StatusCounts] = r.n;
  await exec.insert(occupancySnapshots).values({ facilityId, capturedAt: now, source, total: totalOf(c), ...c });
}

/**
 * Lazily advances pull-based sources (the simulation in V1) for the given facilities.
 * A conditional update "claims" each source so concurrent requests don't double-tick.
 */
export async function refreshOccupancy(facilityIds: string[], now = new Date()) {
  if (facilityIds.length === 0) return;
  const threshold = new Date(now.getTime() - SYNC_INTERVAL_SECONDS * 1000);
  const claimed = await db
    .update(dataSources)
    .set({ lastSyncAt: now, updatedAt: now })
    .where(
      and(
        inArray(dataSources.facilityId, facilityIds),
        eq(dataSources.status, "ACTIVE"),
        eq(dataSources.kind, "SIMULATION"),
        or(isNull(dataSources.lastSyncAt), lt(dataSources.lastSyncAt, threshold)),
      ),
    )
    .returning({ id: dataSources.id, facilityId: dataSources.facilityId, kind: dataSources.kind, granularity: dataSources.granularity, config: dataSources.config });
  for (const src of claimed) {
    try {
      await tickSource(src, now);
    } catch (err) {
      logger.error("occupancy_refresh_failed", { facilityId: src.facilityId, err });
      await db.update(dataSources).set({ lastError: "Falha ao atualizar ocupação" }).where(eq(dataSources.id, src.id));
    }
  }
}

async function tickSource(src: { id: string; facilityId: string; kind: SourceKind; granularity: "SPACE" | "AGGREGATE"; config: Record<string, string | number | boolean> | null }, now: Date) {
  const [f] = await db.select({ kind: facilities.kind, declaredCapacity: facilities.declaredCapacity }).from(facilities).where(eq(facilities.id, src.facilityId));
  if (!f) return;
  const provider = getOccupancyProvider(src.kind);
  const spaces =
    src.granularity === "SPACE"
      ? await db.select({ id: parkingSpaces.id, status: parkingSpaces.opStatus }).from(parkingSpaces).where(and(eq(parkingSpaces.facilityId, src.facilityId), isNull(parkingSpaces.archivedAt)))
      : [];
  const result = await provider.poll({
    facilityId: src.facilityId,
    facilityKind: f.kind,
    granularity: src.granularity,
    spaces,
    capacity: f.declaredCapacity,
    now,
    demand: Number(src.config?.demand ?? 1),
  });
  if (!result) return;
  if (result.kind === "spaces") {
    await db.transaction((tx) => applySpaceObservations(tx, src.facilityId, result.observations, src.kind, null, now));
  } else {
    await db.insert(occupancySnapshots).values({ facilityId: src.facilityId, capturedAt: now, source: src.kind, ...result.counts });
  }
}

/** Operator changes a space status by hand (MANUAL source). Authorization is checked by the caller. */
export async function setSpaceStatusManually(facilityId: string, spaceId: string, status: Status, actorId: string) {
  const now = new Date();
  await db.transaction(async (tx) => {
    await applySpaceObservations(tx, facilityId, [{ spaceId, status }], "MANUAL", actorId, now);
    await tx.update(dataSources).set({ lastSyncAt: now, updatedAt: now }).where(and(eq(dataSources.facilityId, facilityId), eq(dataSources.kind, "MANUAL"), eq(dataSources.status, "ACTIVE")));
  });
}

export type LiveAvailability = PublicAvailability & { hasDigitalMap: boolean; counts: StatusCounts | null; floors: Array<{ floorId: string; name: string; level: number; counts: StatusCounts }> };

const STALE_MINUTES: Partial<Record<SourceKind, number>> = { MANUAL: 180 };

/** Live, public-safe availability for many facilities with a fixed number of queries. */
export async function getLiveAvailability(facilityRows: Array<{ id: string; declaredCapacity: number }>, now = new Date()): Promise<Map<string, LiveAvailability>> {
  const out = new Map<string, LiveAvailability>();
  if (facilityRows.length === 0) return out;
  const ids = facilityRows.map((f) => f.id);
  const [sources, spaceRows, floorRows, latest] = await Promise.all([
    db.select({ facilityId: dataSources.facilityId, kind: dataSources.kind, granularity: dataSources.granularity, lastSyncAt: dataSources.lastSyncAt }).from(dataSources).where(and(inArray(dataSources.facilityId, ids), eq(dataSources.status, "ACTIVE"))),
    db
      .select({ facilityId: parkingSpaces.facilityId, floorId: parkingSpaces.floorId, status: parkingSpaces.opStatus, n: sql<number>`count(*)::int` })
      .from(parkingSpaces)
      .where(and(inArray(parkingSpaces.facilityId, ids), isNull(parkingSpaces.archivedAt)))
      .groupBy(parkingSpaces.facilityId, parkingSpaces.floorId, parkingSpaces.opStatus),
    db.select({ id: floors.id, facilityId: floors.facilityId, name: floors.name, level: floors.level }).from(floors).where(inArray(floors.facilityId, ids)),
    db
      .selectDistinctOn([occupancySnapshots.facilityId], {
        facilityId: occupancySnapshots.facilityId,
        capturedAt: occupancySnapshots.capturedAt,
        available: occupancySnapshots.available,
        occupied: occupancySnapshots.occupied,
        reserved: occupancySnapshots.reserved,
        unavailable: occupancySnapshots.unavailable,
        total: occupancySnapshots.total,
      })
      .from(occupancySnapshots)
      .where(and(inArray(occupancySnapshots.facilityId, ids), isNull(occupancySnapshots.floorId)))
      .orderBy(occupancySnapshots.facilityId, desc(occupancySnapshots.capturedAt)),
  ]);

  for (const f of facilityRows) {
    const src = sources.find((s) => s.facilityId === f.id) ?? null;
    const mine = spaceRows.filter((r) => r.facilityId === f.id);
    const hasDigitalMap = mine.length > 0;
    let counts: StatusCounts | null = null;
    let capacity = f.declaredCapacity;
    let updatedAt = src?.lastSyncAt ?? null;
    const floorCounts: LiveAvailability["floors"] = [];
    if (hasDigitalMap) {
      counts = emptyCounts();
      for (const r of mine) counts[r.status.toLowerCase() as keyof StatusCounts] += r.n;
      capacity = totalOf(counts);
      for (const fl of floorRows.filter((x) => x.facilityId === f.id).sort((a, b) => b.level - a.level)) {
        const fc = emptyCounts();
        for (const r of mine.filter((x) => x.floorId === fl.id)) fc[r.status.toLowerCase() as keyof StatusCounts] += r.n;
        if (totalOf(fc) > 0) floorCounts.push({ floorId: fl.id, name: fl.name, level: fl.level, counts: fc });
      }
    } else {
      const snap = latest.find((s) => s.facilityId === f.id);
      if (snap) {
        counts = { available: snap.available, occupied: snap.occupied, reserved: snap.reserved, unavailable: snap.unavailable };
        capacity = snap.total || capacity;
        updatedAt = snap.capturedAt;
      }
    }
    const staleAfterMinutes = src ? (STALE_MINUTES[src.kind] ?? 15) : 15;
    const pub = toPublicAvailability({ counts, capacity, updatedAt, sourceKind: src?.kind ?? null, now, staleAfterMinutes });
    out.set(f.id, { ...pub, hasDigitalMap, counts, floors: floorCounts });
  }
  return out;
}

export { countStatuses };

/** Manual aggregate count (facilities without a digital map). Authorization is checked by the caller. */
export async function recordManualCount(facilityId: string, capacity: number, available: number, unavailable = 0) {
  const now = new Date();
  const total = Math.max(capacity, available + unavailable);
  const occupied = total - available - unavailable;
  await db.transaction(async (tx) => {
    await tx.insert(occupancySnapshots).values({ facilityId, capturedAt: now, source: "MANUAL", total, available, occupied, reserved: 0, unavailable });
    await tx.update(dataSources).set({ lastSyncAt: now, updatedAt: now }).where(and(eq(dataSources.facilityId, facilityId), eq(dataSources.status, "ACTIVE")));
  });
}
