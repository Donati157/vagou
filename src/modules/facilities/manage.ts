import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { dataSources, facilities, facilityEntrances, facilityVehicleTypes, floorPlans, floors, operatingHours, parkingSpaces, sectors } from "@/server/db/schema";
import { AppError, ForbiddenError, NotFoundError } from "@/server/lib/errors";
import { audit } from "@/server/lib/audit";
import { pgErrorCode, PG_UNIQUE_VIOLATION } from "@/server/lib/pg";
import type { CurrentUser } from "@/modules/auth/session";
import { assertFacilityAccess, assertFloorAccess, assertOrgAccess, getUserOrganizations } from "./access";
import { fromMinutes, toMinutes, type FacilityInput } from "./schemas";
import type { z } from "zod";
import type { dataSourceInputSchema, entrancesInputSchema, floorSchema, sectorSchema } from "./schemas";

/*
 * Company-side facility management. Every function authorizes the user against the owning
 * organization (tenant isolation) before touching data.
 */

function slugify(t: string) {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);
}

async function uniqueSlug(base: string, exceptId?: string) {
  let slug = slugify(base) || "estacionamento";
  for (let i = 2; i < 50; i++) {
    const [clash] = await db
      .select({ id: facilities.id })
      .from(facilities)
      .where(exceptId ? and(eq(facilities.slug, slug), ne(facilities.id, exceptId)) : eq(facilities.slug, slug));
    if (!clash) return slug;
    slug = `${slugify(base)}-${i}`;
  }
  return `${slugify(base)}-${crypto.randomUUID().slice(0, 6)}`;
}

/** Organization a new facility belongs to: the user's only org, or an explicitly chosen one. */
export async function resolveTargetOrg(user: CurrentUser, organizationId?: string | null) {
  if (organizationId) {
    await assertOrgAccess(user, organizationId);
    return organizationId;
  }
  if (user.role === "PLATFORM_ADMIN") throw new AppError("ORG_REQUIRED", "Escolha a empresa responsável.");
  const orgs = await getUserOrganizations(user.id);
  if (orgs.length === 0) throw new ForbiddenError("Sua conta não está vinculada a uma empresa.");
  return orgs[0].id;
}

function facilityColumns(input: FacilityInput) {
  return {
    name: input.name,
    kind: "SHOPPING" as const, // Vagou is shopping-only
    description: input.description,
    addressLine: input.addressLine,
    neighborhood: input.neighborhood,
    postalCode: input.postalCode,
    lat: input.lat,
    lng: input.lng,
    phone: input.phone,
    declaredCapacity: input.declaredCapacity,
    covered: input.covered,
    accessible: input.accessibleSpaces > 0,
    accessibleSpaces: input.accessibleSpaces,
    evChargers: input.evChargers,
    valet: input.valet,
    security24h: input.security24h,
    maxHeightCm: input.maxHeightCm,
    usefulInfo: input.usefulInfo,
    isPublished: input.isPublished,
  };
}

function hoursRows(facilityId: string, input: FacilityInput) {
  return input.hours.filter((h) => h.enabled).map((h) => ({ facilityId, weekday: h.weekday, opensMinute: toMinutes(h.open), closesMinute: toMinutes(h.close) }));
}

export async function createFacility(user: CurrentUser, input: FacilityInput, organizationId?: string | null) {
  const orgId = await resolveTargetOrg(user, organizationId);
  const slug = await uniqueSlug(input.name);
  return db.transaction(async (tx) => {
    const [f] = await tx.insert(facilities).values({ organizationId: orgId, slug, ...facilityColumns(input) }).returning({ id: facilities.id });
    await tx.insert(facilityVehicleTypes).values(input.vehicleTypes.map((vehicleType) => ({ facilityId: f.id, vehicleType })));
    const hours = hoursRows(f.id, input);
    if (hours.length) await tx.insert(operatingHours).values(hours);
    // Default entrance at the facility pin so "Ir até lá" works from day one.
    await tx.insert(facilityEntrances).values({ facilityId: f.id, name: "Entrada principal", kind: "VEHICLE_BOTH", addressLine: input.addressLine, lat: input.lat, lng: input.lng, isPrimary: true });
    await audit(tx, { actorId: user.id, action: "facility.created", entityType: "facility", entityId: f.id });
    return f;
  });
}

export async function updateFacility(user: CurrentUser, facilityId: string, input: FacilityInput) {
  await assertFacilityAccess(user, facilityId);
  const [current] = await db.select({ name: facilities.name, slug: facilities.slug }).from(facilities).where(eq(facilities.id, facilityId));
  const slug = current.name === input.name ? current.slug : await uniqueSlug(input.name, facilityId);
  await db.transaction(async (tx) => {
    await tx.update(facilities).set({ ...facilityColumns(input), slug, updatedAt: new Date() }).where(eq(facilities.id, facilityId));
    await tx.delete(facilityVehicleTypes).where(eq(facilityVehicleTypes.facilityId, facilityId));
    await tx.insert(facilityVehicleTypes).values(input.vehicleTypes.map((vehicleType) => ({ facilityId, vehicleType })));
    await tx.delete(operatingHours).where(eq(operatingHours.facilityId, facilityId));
    const hours = hoursRows(facilityId, input);
    if (hours.length) await tx.insert(operatingHours).values(hours);
    await audit(tx, { actorId: user.id, action: "facility.updated", entityType: "facility", entityId: facilityId, metadata: { published: input.isPublished } });
  });
  return { slug };
}

export async function setFacilityPublished(user: CurrentUser, facilityId: string, published: boolean) {
  await assertFacilityAccess(user, facilityId);
  await db.update(facilities).set({ isPublished: published, updatedAt: new Date() }).where(eq(facilities.id, facilityId));
  await audit(db, { actorId: user.id, action: published ? "facility.published" : "facility.unpublished", entityType: "facility", entityId: facilityId });
}

export async function getFacilityForEdit(user: CurrentUser, facilityId: string) {
  await assertFacilityAccess(user, facilityId);
  const [f] = await db.select().from(facilities).where(eq(facilities.id, facilityId));
  const [vehicles, hours] = await Promise.all([
    db.select({ v: facilityVehicleTypes.vehicleType }).from(facilityVehicleTypes).where(eq(facilityVehicleTypes.facilityId, facilityId)),
    db.select().from(operatingHours).where(eq(operatingHours.facilityId, facilityId)),
  ]);
  const input: FacilityInput = {
    name: f.name,
    kind: f.kind,
    description: f.description,
    addressLine: f.addressLine,
    neighborhood: f.neighborhood ?? "",
    postalCode: f.postalCode,
    lat: f.lat,
    lng: f.lng,
    phone: f.phone,
    declaredCapacity: f.declaredCapacity,
    covered: f.covered,
    accessibleSpaces: f.accessibleSpaces,
    evChargers: f.evChargers,
    valet: f.valet,
    security24h: f.security24h,
    maxHeightCm: f.maxHeightCm,
    usefulInfo: f.usefulInfo,
    vehicleTypes: vehicles.map((v) => v.v),
    isPublished: f.isPublished,
    hours: [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
      const h = hours.find((x) => x.weekday === weekday);
      return h ? { weekday, enabled: true, open: fromMinutes(h.opensMinute), close: fromMinutes(h.closesMinute) } : { weekday, enabled: false, open: "07:00", close: "22:00" };
    }),
  };
  return { facility: f, input };
}

export async function replaceEntrances(user: CurrentUser, facilityId: string, input: z.infer<typeof entrancesInputSchema>) {
  await assertFacilityAccess(user, facilityId);
  await db.transaction(async (tx) => {
    await tx.delete(facilityEntrances).where(eq(facilityEntrances.facilityId, facilityId));
    if (input.entrances.length) await tx.insert(facilityEntrances).values(input.entrances.map((e) => ({ facilityId, ...e })));
    await audit(tx, { actorId: user.id, action: "facility.entrances_updated", entityType: "facility", entityId: facilityId });
  });
}

// ── Floors & sectors ──

export async function createFloor(user: CurrentUser, facilityId: string, input: z.infer<typeof floorSchema>) {
  await assertFacilityAccess(user, facilityId);
  try {
    const [f] = await db.insert(floors).values({ facilityId, name: input.name, level: input.level }).returning({ id: floors.id });
    await audit(db, { actorId: user.id, action: "floor.created", entityType: "floor", entityId: f.id });
    return f;
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) throw new AppError("FLOOR_EXISTS", "Já existe um piso com esse nome.");
    throw err;
  }
}

export async function updateFloor(user: CurrentUser, floorId: string, input: z.infer<typeof floorSchema>) {
  await assertFloorAccess(user, floorId);
  try {
    await db.update(floors).set({ name: input.name, level: input.level }).where(eq(floors.id, floorId));
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) throw new AppError("FLOOR_EXISTS", "Já existe um piso com esse nome.");
    throw err;
  }
}

export async function deleteFloor(user: CurrentUser, floorId: string) {
  const f = await assertFloorAccess(user, floorId);
  await db.delete(floors).where(eq(floors.id, floorId));
  await audit(db, { actorId: user.id, action: "floor.deleted", entityType: "floor", entityId: floorId, metadata: { facilityId: f.facilityId } });
}

export async function createSector(user: CurrentUser, floorId: string, input: z.infer<typeof sectorSchema>) {
  await assertFloorAccess(user, floorId);
  try {
    const [s] = await db.insert(sectors).values({ floorId, name: input.name, color: input.color }).returning({ id: sectors.id });
    return s;
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) throw new AppError("SECTOR_EXISTS", "Já existe um setor com esse nome neste piso.");
    throw err;
  }
}

export async function updateSector(user: CurrentUser, sectorId: string, input: z.infer<typeof sectorSchema>) {
  const [s] = await db.select({ floorId: sectors.floorId }).from(sectors).where(eq(sectors.id, sectorId));
  if (!s) throw new NotFoundError("Setor não encontrado.");
  await assertFloorAccess(user, s.floorId);
  try {
    await db.update(sectors).set(input).where(eq(sectors.id, sectorId));
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) throw new AppError("SECTOR_EXISTS", "Já existe um setor com esse nome neste piso.");
    throw err;
  }
}

export async function deleteSector(user: CurrentUser, sectorId: string) {
  const [s] = await db.select({ floorId: sectors.floorId }).from(sectors).where(eq(sectors.id, sectorId));
  if (!s) throw new NotFoundError("Setor não encontrado.");
  await assertFloorAccess(user, s.floorId);
  await db.delete(sectors).where(eq(sectors.id, sectorId)); // spaces keep existing with sector_id = null
}

export async function listFloorsWithSectors(user: CurrentUser, facilityId: string) {
  await assertFacilityAccess(user, facilityId);
  const fl = await db.select().from(floors).where(eq(floors.facilityId, facilityId)).orderBy(sql`${floors.level} desc`);
  if (fl.length === 0) return [];
  const ids = fl.map((f) => f.id);
  const [secs, counts, plans] = await Promise.all([
    db.select().from(sectors).where(sql`${sectors.floorId} in (${sql.join(ids.map((i) => sql`${i}::uuid`), sql`, `)})`).orderBy(sectors.name),
    db
      .select({ floorId: parkingSpaces.floorId, n: sql<number>`count(*)::int` })
      .from(parkingSpaces)
      .where(and(sql`${parkingSpaces.floorId} in (${sql.join(ids.map((i) => sql`${i}::uuid`), sql`, `)})`, sql`${parkingSpaces.archivedAt} is null`))
      .groupBy(parkingSpaces.floorId),
    db
      .select({ floorId: floorPlans.floorId, id: floorPlans.id, status: floorPlans.status, createdAt: floorPlans.createdAt })
      .from(floorPlans)
      .where(sql`${floorPlans.floorId} in (${sql.join(ids.map((i) => sql`${i}::uuid`), sql`, `)})`)
      .orderBy(sql`${floorPlans.createdAt} desc`),
  ]);
  return fl.map((f) => {
    const myPlans = plans.filter((p) => p.floorId === f.id);
    return {
      ...f,
      sectors: secs.filter((s) => s.floorId === f.id),
      spaces: counts.find((c) => c.floorId === f.id)?.n ?? 0,
      publishedPlan: myPlans.find((p) => p.status === "PUBLISHED") ?? null,
      latestPlan: myPlans[0] ?? null,
    };
  });
}

// ── Data source ──

export async function setDataSource(user: CurrentUser, facilityId: string, input: z.infer<typeof dataSourceInputSchema>) {
  await assertFacilityAccess(user, facilityId);
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(dataSources).set({ status: "INACTIVE", updatedAt: now }).where(and(eq(dataSources.facilityId, facilityId), eq(dataSources.status, "ACTIVE")));
    await tx.insert(dataSources).values({
      facilityId,
      kind: input.kind,
      granularity: input.granularity,
      name: input.kind === "SIMULATION" ? "Simulação de demonstração" : "Atualização manual pela equipe",
      status: "ACTIVE",
      lastSyncAt: input.kind === "MANUAL" ? now : null,
    });
    await audit(tx, { actorId: user.id, action: "data_source.changed", entityType: "facility", entityId: facilityId, metadata: { kind: input.kind, granularity: input.granularity } });
  });
}

export async function disconnectDataSource(user: CurrentUser, facilityId: string) {
  await assertFacilityAccess(user, facilityId);
  await db.update(dataSources).set({ status: "INACTIVE", updatedAt: new Date() }).where(and(eq(dataSources.facilityId, facilityId), eq(dataSources.status, "ACTIVE")));
  await audit(db, { actorId: user.id, action: "data_source.disconnected", entityType: "facility", entityId: facilityId });
}
