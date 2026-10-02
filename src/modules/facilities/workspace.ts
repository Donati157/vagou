import "server-only";
import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/server/db/client";
import { dataSources, facilities, organizations } from "@/server/db/schema";
import type { CurrentUser } from "@/modules/auth/session";
import { assertFacilityAccess } from "./access";

/** Header data for the company facility workspace (authorized, memoized per request). */
export const getFacilityHeader = cache(async (user: CurrentUser, facilityId: string) => {
  await assertFacilityAccess(user, facilityId);
  const [f] = await db
    .select({ id: facilities.id, name: facilities.name, slug: facilities.slug, isPublished: facilities.isPublished, kind: facilities.kind, neighborhood: facilities.neighborhood, declaredCapacity: facilities.declaredCapacity, orgName: organizations.name })
    .from(facilities)
    .innerJoin(organizations, eq(organizations.id, facilities.organizationId))
    .where(eq(facilities.id, facilityId));
  const [source] = await db.select().from(dataSources).where(and(eq(dataSources.facilityId, facilityId), eq(dataSources.status, "ACTIVE")));
  return { ...f, source: source ?? null };
});
