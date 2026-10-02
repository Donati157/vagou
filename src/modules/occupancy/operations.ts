import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { dataSources, facilities, floorPlanElements, floorPlans, floors, occupancyEvents, parkingSpaces, profiles, sectors } from "@/server/db/schema";
import { NotFoundError } from "@/server/lib/errors";
import type { CurrentUser } from "@/modules/auth/session";
import { assertFacilityAccess } from "@/modules/facilities/access";
import { fileUrl } from "@/modules/storage/storage";
import { getLiveAvailability, refreshOccupancy } from "./service";

/** Live operational snapshot of one facility (and the selected floor's map) for operators. */
export async function getOperationalState(user: CurrentUser, facilityId: string, floorId: string | null) {
  await assertFacilityAccess(user, facilityId);
  await refreshOccupancy([facilityId]);
  const [source] = await db.select().from(dataSources).where(and(eq(dataSources.facilityId, facilityId), eq(dataSources.status, "ACTIVE")));
  const allFloors = await db
    .select({ id: floors.id, name: floors.name, level: floors.level, published: sql<boolean>`exists (select 1 from floor_plans fp where fp.floor_id = "floors"."id" and fp.status = 'PUBLISHED')` })
    .from(floors)
    .where(eq(floors.facilityId, facilityId))
    .orderBy(desc(floors.level));
  const mapped = allFloors.filter((f) => f.published);
  const current = mapped.find((f) => f.id === floorId) ?? mapped[0] ?? null;
  const [f] = await db.select({ declaredCapacity: facilities.declaredCapacity }).from(facilities).where(eq(facilities.id, facilityId));
  const live = (await getLiveAvailability([{ id: facilityId, declaredCapacity: f.declaredCapacity }])).get(facilityId)!;

  let map = null;
  if (current) {
    const [plan] = await db
      .select({ id: floorPlans.id, previewKey: floorPlans.previewKey, widthPx: floorPlans.widthPx, heightPx: floorPlans.heightPx })
      .from(floorPlans)
      .where(and(eq(floorPlans.floorId, current.id), eq(floorPlans.status, "PUBLISHED")))
      .orderBy(desc(floorPlans.publishedAt))
      .limit(1);
    const [spaces, secs, elements] = await Promise.all([
      db
        .select({ id: parkingSpaces.id, code: parkingSpaces.code, type: parkingSpaces.type, status: parkingSpaces.opStatus, source: parkingSpaces.opStatusSource, updatedAt: parkingSpaces.opStatusUpdatedAt, sectorId: parkingSpaces.sectorId, x: parkingSpaces.x, y: parkingSpaces.y, w: parkingSpaces.w, h: parkingSpaces.h, rotation: parkingSpaces.rotation })
        .from(parkingSpaces)
        .where(and(eq(parkingSpaces.floorId, current.id), isNull(parkingSpaces.archivedAt)))
        .orderBy(parkingSpaces.code),
      db.select({ id: sectors.id, name: sectors.name, color: sectors.color }).from(sectors).where(eq(sectors.floorId, current.id)).orderBy(sectors.name),
      db.select({ id: floorPlanElements.id, kind: floorPlanElements.kind, label: floorPlanElements.label, x: floorPlanElements.x, y: floorPlanElements.y, w: floorPlanElements.w, h: floorPlanElements.h }).from(floorPlanElements).where(eq(floorPlanElements.floorPlanId, plan.id)),
    ]);
    map = { floorId: current.id, imageUrl: fileUrl(plan.previewKey), ratio: plan.widthPx && plan.heightPx ? plan.heightPx / plan.widthPx : 0.625, spaces, sectors: secs, elements };
  }
  return {
    source: source ? { kind: source.kind, granularity: source.granularity, lastSyncAt: source.lastSyncAt, name: source.name } : null,
    floors: allFloors,
    live,
    map,
    serverTime: new Date(),
  };
}

export type OperationalState = Awaited<ReturnType<typeof getOperationalState>>;

/** Recent status history of one space (operator side panel). */
export async function getSpaceHistory(user: CurrentUser, facilityId: string, spaceId: string) {
  await assertFacilityAccess(user, facilityId);
  const [space] = await db.select({ id: parkingSpaces.id }).from(parkingSpaces).where(and(eq(parkingSpaces.id, spaceId), eq(parkingSpaces.facilityId, facilityId)));
  if (!space) throw new NotFoundError("Vaga não encontrada.");
  return db
    .select({ id: occupancyEvents.id, from: occupancyEvents.fromStatus, to: occupancyEvents.toStatus, source: occupancyEvents.source, at: occupancyEvents.observedAt, actor: profiles.fullName })
    .from(occupancyEvents)
    .leftJoin(profiles, eq(profiles.userId, occupancyEvents.actorId))
    .where(eq(occupancyEvents.parkingSpaceId, spaceId))
    .orderBy(desc(occupancyEvents.observedAt))
    .limit(12);
}
