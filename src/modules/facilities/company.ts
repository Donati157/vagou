import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { dataSources, facilities, floors } from "@/server/db/schema";
import type { CurrentUser } from "@/modules/auth/session";
import { getLiveAvailability, refreshOccupancy } from "@/modules/occupancy/service";
import { getUserOrganizations } from "./access";

/** Facilities visible to a company user (tenant-isolated; platform admins see all). */
export async function listCompanyFacilities(user: CurrentUser, now = new Date()) {
  const orgs = user.role === "PLATFORM_ADMIN" ? null : await getUserOrganizations(user.id);
  if (orgs && orgs.length === 0) return { orgs: [], facilities: [] };
  const rows = await db
    .select({
      id: facilities.id,
      slug: facilities.slug,
      name: facilities.name,
      kind: facilities.kind,
      neighborhood: facilities.neighborhood,
      declaredCapacity: facilities.declaredCapacity,
      isPublished: facilities.isPublished,
      organizationId: facilities.organizationId,
    })
    .from(facilities)
    .where(orgs ? inArray(facilities.organizationId, orgs.map((o) => o.id)) : undefined)
    .orderBy(facilities.name);
  const ids = rows.map((r) => r.id);
  await refreshOccupancy(ids, now);
  const [live, sources, floorStats] = await Promise.all([
    getLiveAvailability(rows, now),
    ids.length ? db.select().from(dataSources).where(and(inArray(dataSources.facilityId, ids), eq(dataSources.status, "ACTIVE"))) : Promise.resolve([]),
    ids.length
      ? db
          .select({
            facilityId: floors.facilityId,
            floors: sql<number>`count(distinct ${floors.id})::int`,
            mapped: sql<number>`count(distinct ${floors.id}) filter (where exists (select 1 from floor_plans fp where fp.floor_id = "floors"."id" and fp.status = 'PUBLISHED'))::int`,
          })
          .from(floors)
          .where(inArray(floors.facilityId, ids))
          .groupBy(floors.facilityId)
      : Promise.resolve([]),
  ]);
  return {
    orgs: orgs ?? [],
    facilities: rows.map((r) => ({
      ...r,
      availability: live.get(r.id)!,
      source: sources.find((s) => s.facilityId === r.id) ?? null,
      floors: floorStats.find((f) => f.facilityId === r.id)?.floors ?? 0,
      mappedFloors: floorStats.find((f) => f.facilityId === r.id)?.mapped ?? 0,
    })),
  };
}
