import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/server/db/client";
import { facilities, floorPlans, floors, organizationMembers, organizations, parkingSpaces, sectors } from "@/server/db/schema";
import { ForbiddenError, NotFoundError } from "@/server/lib/errors";
import type { CurrentUser } from "@/modules/auth/session";

/** Organizations the user belongs to (tenant isolation boundary). */
export const getUserOrganizations = cache(async (userId: string) => {
  return db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug, type: organizations.type, role: organizationMembers.role })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(eq(organizationMembers.userId, userId));
});

export async function assertOrgAccess(user: CurrentUser, organizationId: string) {
  if (user.role === "PLATFORM_ADMIN") return;
  if (user.role !== "COMPANY_ADMIN") throw new ForbiddenError();
  const orgs = await getUserOrganizations(user.id);
  if (!orgs.some((o) => o.id === organizationId)) throw new ForbiddenError();
}

export async function assertFacilityAccess(user: CurrentUser, facilityId: string) {
  const [f] = await db.select({ organizationId: facilities.organizationId }).from(facilities).where(eq(facilities.id, facilityId));
  if (!f) throw new NotFoundError("Estacionamento não encontrado.");
  await assertOrgAccess(user, f.organizationId);
  return f;
}

export async function assertFloorAccess(user: CurrentUser, floorId: string) {
  const [f] = await db
    .select({ facilityId: floors.facilityId, organizationId: facilities.organizationId })
    .from(floors)
    .innerJoin(facilities, eq(facilities.id, floors.facilityId))
    .where(eq(floors.id, floorId));
  if (!f) throw new NotFoundError("Piso não encontrado.");
  await assertOrgAccess(user, f.organizationId);
  return f;
}

export async function assertFloorPlanAccess(user: CurrentUser, floorPlanId: string) {
  const [f] = await db
    .select({ floorId: floorPlans.floorId, facilityId: floors.facilityId, organizationId: facilities.organizationId })
    .from(floorPlans)
    .innerJoin(floors, eq(floors.id, floorPlans.floorId))
    .innerJoin(facilities, eq(facilities.id, floors.facilityId))
    .where(eq(floorPlans.id, floorPlanId));
  if (!f) throw new NotFoundError("Planta não encontrada.");
  await assertOrgAccess(user, f.organizationId);
  return f;
}

/** Verifies every space id belongs to the given floor (prevents cross-tenant edits by id guessing). */
export async function assertSpacesInFloor(spaceIds: string[], floorId: string) {
  if (spaceIds.length === 0) return;
  const rows = await db
    .select({ id: parkingSpaces.id })
    .from(parkingSpaces)
    .where(and(inArray(parkingSpaces.id, spaceIds), eq(parkingSpaces.floorId, floorId)));
  if (rows.length !== new Set(spaceIds).size) throw new ForbiddenError();
}

export async function assertSectorInFloor(sectorId: string, floorId: string) {
  const [s] = await db.select({ id: sectors.id }).from(sectors).where(and(eq(sectors.id, sectorId), eq(sectors.floorId, floorId)));
  if (!s) throw new ForbiddenError();
}
