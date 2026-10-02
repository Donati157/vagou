import "server-only";
import { and, asc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { dataSources, floors, occupancyEvents, occupancySnapshots, operatingHours, parkingSpaces, sectors } from "@/server/db/schema";
import type { CurrentUser } from "@/modules/auth/session";
import { assertFacilityAccess } from "@/modules/facilities/access";
import { openStatus } from "@/modules/facilities/hours";
import { addDays, startOfLocalDay } from "@/lib/time";
import { dailySeries, hourlyProfile, summarize, weekdayProfile } from "./analytics";

export const ANALYTICS_PERIODS = { "7d": 7, "30d": 30, "90d": 90 } as const;
export type AnalyticsPeriod = keyof typeof ANALYTICS_PERIODS;
export const parseAnalyticsPeriod = (v?: string): AnalyticsPeriod => (v && v in ANALYTICS_PERIODS ? (v as AnalyticsPeriod) : "7d");

export async function getFacilityAnalytics(user: CurrentUser, facilityId: string, period: AnalyticsPeriod, now = new Date()) {
  await assertFacilityAccess(user, facilityId);
  const from = startOfLocalDay(addDays(now, -(ANALYTICS_PERIODS[period] - 1)));
  const [snaps, hours, [source], sectorRows, turnover] = await Promise.all([
    db
      .select({ capturedAt: occupancySnapshots.capturedAt, total: occupancySnapshots.total, available: occupancySnapshots.available, occupied: occupancySnapshots.occupied, reserved: occupancySnapshots.reserved, unavailable: occupancySnapshots.unavailable, source: occupancySnapshots.source })
      .from(occupancySnapshots)
      .where(and(eq(occupancySnapshots.facilityId, facilityId), isNull(occupancySnapshots.floorId), gte(occupancySnapshots.capturedAt, from)))
      .orderBy(asc(occupancySnapshots.capturedAt)),
    db.select().from(operatingHours).where(eq(operatingHours.facilityId, facilityId)),
    db.select({ kind: dataSources.kind }).from(dataSources).where(and(eq(dataSources.facilityId, facilityId), eq(dataSources.status, "ACTIVE"))),
    db
      .select({
        sectorId: sectors.id,
        sector: sectors.name,
        color: sectors.color,
        floor: floors.name,
        level: floors.level,
        total: sql<number>`count(${parkingSpaces.id})::int`,
        free: sql<number>`count(${parkingSpaces.id}) filter (where ${parkingSpaces.opStatus} = 'AVAILABLE')::int`,
        used: sql<number>`count(${parkingSpaces.id}) filter (where ${parkingSpaces.opStatus} in ('OCCUPIED','RESERVED'))::int`,
        unavailable: sql<number>`count(${parkingSpaces.id}) filter (where ${parkingSpaces.opStatus} = 'UNAVAILABLE')::int`,
      })
      .from(sectors)
      .innerJoin(floors, eq(floors.id, sectors.floorId))
      .leftJoin(parkingSpaces, and(eq(parkingSpaces.sectorId, sectors.id), isNull(parkingSpaces.archivedAt)))
      .where(eq(floors.facilityId, facilityId))
      .groupBy(sectors.id, sectors.name, sectors.color, floors.name, floors.level)
      .orderBy(sql`${floors.level} desc`, asc(sectors.name)),
    db
      .select({ sectorId: parkingSpaces.sectorId, arrivals: sql<number>`count(*)::int` })
      .from(occupancyEvents)
      .innerJoin(parkingSpaces, eq(parkingSpaces.id, occupancyEvents.parkingSpaceId))
      .where(and(eq(occupancyEvents.facilityId, facilityId), eq(occupancyEvents.toStatus, "OCCUPIED"), gte(occupancyEvents.observedAt, from)))
      .groupBy(parkingSpaces.sectorId),
  ]);
  const isOpenAt = (d: Date) => hours.length === 0 || openStatus(hours, d).open;
  const openSnaps = snaps.filter((s) => isOpenAt(s.capturedAt));
  const days = ANALYTICS_PERIODS[period];
  return {
    period,
    simulated: source?.kind === "SIMULATION" || snaps.some((s) => s.source === "SIMULATION"),
    hasData: snaps.length > 0,
    summary: summarize(snaps, isOpenAt),
    hourly: hourlyProfile(openSnaps.length ? openSnaps : snaps),
    daily: dailySeries(snaps),
    weekday: weekdayProfile(openSnaps.length ? openSnaps : snaps),
    sectors: sectorRows
      .filter((r) => r.total > 0)
      .map((r) => {
        const arrivals = turnover.find((t) => t.sectorId === r.sectorId)?.arrivals ?? 0;
        const operational = r.total - r.unavailable;
        return { ...r, occupancy: operational ? r.used / operational : 0, arrivals, turnoverPerSpaceDay: r.total ? arrivals / r.total / days : 0 };
      }),
  };
}

/** Organization-wide occupancy by hour (capacity-weighted) over the last 7 days. */
export async function getCompanyHourly(facilityIds: string[], now = new Date()) {
  if (facilityIds.length === 0) return [];
  const from = addDays(now, -7);
  const rows = await db
    .select({
      hour: sql<number>`extract(hour from ${occupancySnapshots.capturedAt} at time zone 'America/Sao_Paulo')::int`,
      used: sql<number>`sum(${occupancySnapshots.occupied} + ${occupancySnapshots.reserved})::float`,
      operational: sql<number>`sum(${occupancySnapshots.total} - ${occupancySnapshots.unavailable})::float`,
    })
    .from(occupancySnapshots)
    .where(and(sql`${occupancySnapshots.facilityId} in (${sql.join(facilityIds.map((id) => sql`${id}::uuid`), sql`, `)})`, isNull(occupancySnapshots.floorId), gte(occupancySnapshots.capturedAt, from)))
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  return rows.map((r) => ({ hora: `${String(r.hour).padStart(2, "0")}h`, ocupacao: r.operational > 0 ? r.used / r.operational : 0 }));
}
