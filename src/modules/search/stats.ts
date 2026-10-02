import "server-only";
import { and, countDistinct, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { facilities, parkingSpaces } from "@/server/db/schema";

/** Public, aggregate-only numbers for marketing pages. */
export async function getPublicStats() {
  const [f] = await db
    .select({ facilities: sql<number>`count(*)::int`, neighborhoods: countDistinct(facilities.neighborhood), declared: sql<number>`coalesce(sum(${facilities.declaredCapacity}), 0)::int` })
    .from(facilities)
    .where(and(eq(facilities.isPublished, true), eq(facilities.status, "ACTIVE")));
  const [m] = await db
    .select({ mapped: sql<number>`count(distinct ${parkingSpaces.facilityId})::int`, spaces: sql<number>`count(*)::int` })
    .from(parkingSpaces)
    .where(sql`${parkingSpaces.archivedAt} is null`);
  return { facilities: f.facilities, neighborhoods: Number(f.neighborhoods), mappedFacilities: m.mapped, mappedSpaces: m.spaces };
}
