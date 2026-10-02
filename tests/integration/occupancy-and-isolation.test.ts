import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDatabase, type Database } from "@/server/db/create";
import * as s from "@/server/db/schema";
import { runMigrations } from "../../scripts/migrate";

let db: Database;
const ids = { orgA: "", orgB: "", userA: "", admin: "", facilityA: "", facilityB: "", floorA: "", spaces: [] as string[] };

beforeAll(async () => {
  db = createDatabase({ inMemory: true });
  (globalThis as unknown as { __vagouDb?: Database }).__vagouDb = db;
  await runMigrations(db);
  const [orgA] = await db.insert(s.organizations).values({ name: "Org A", slug: "org-a" }).returning();
  const [orgB] = await db.insert(s.organizations).values({ name: "Org B", slug: "org-b" }).returning();
  const [userA] = await db.insert(s.users).values({ email: "a@test.dev", passwordHash: "x", role: "COMPANY_ADMIN" }).returning();
  const [admin] = await db.insert(s.users).values({ email: "admin@test.dev", passwordHash: "x", role: "PLATFORM_ADMIN" }).returning();
  await db.insert(s.organizationMembers).values({ organizationId: orgA.id, userId: userA.id });
  const base = { addressLine: "Rua X, 1", lat: -23.56, lng: -46.65, isPublished: true, declaredCapacity: 10 };
  const [fa] = await db.insert(s.facilities).values({ ...base, organizationId: orgA.id, slug: "fa", name: "Facility A" }).returning();
  const [fb] = await db.insert(s.facilities).values({ ...base, organizationId: orgB.id, slug: "fb", name: "Facility B" }).returning();
  const [floor] = await db.insert(s.floors).values({ facilityId: fa.id, name: "G1" }).returning();
  const spaces = await db
    .insert(s.parkingSpaces)
    .values(Array.from({ length: 4 }, (_, i) => ({ facilityId: fa.id, floorId: floor.id, code: `A-${i}`, x: 0.1 * i, y: 0.1 })))
    .returning();
  await db.insert(s.dataSources).values({ facilityId: fa.id, kind: "MANUAL", granularity: "SPACE", name: "Manual", lastSyncAt: new Date() });
  await db.insert(s.floorPlans).values({ floorId: floor.id, originalKey: "k", originalName: "p.png", originalMime: "image/png", originalSize: 1, status: "PUBLISHED", publishedAt: new Date() });
  Object.assign(ids, { orgA: orgA.id, orgB: orgB.id, userA: userA.id, admin: admin.id, facilityA: fa.id, facilityB: fb.id, floorA: floor.id, spaces: spaces.map((x) => x.id) });
});

const companyUser = () => ({ id: ids.userA, email: "a@test.dev", role: "COMPANY_ADMIN" as const, fullName: "A", firstName: "A" });

describe("organization isolation", () => {
  it("allows members to access their own facility", async () => {
    const { assertFacilityAccess } = await import("@/modules/facilities/access");
    await expect(assertFacilityAccess(companyUser(), ids.facilityA)).resolves.toBeTruthy();
  });
  it("forbids access to another organization's facility", async () => {
    const { assertFacilityAccess, assertOrgAccess } = await import("@/modules/facilities/access");
    await expect(assertFacilityAccess(companyUser(), ids.facilityB)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(assertOrgAccess(companyUser(), ids.orgB)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("lets platform admins in and keeps drivers out", async () => {
    const { assertOrgAccess } = await import("@/modules/facilities/access");
    await expect(assertOrgAccess({ ...companyUser(), id: ids.admin, role: "PLATFORM_ADMIN" }, ids.orgB)).resolves.toBeUndefined();
    await expect(assertOrgAccess({ ...companyUser(), role: "DRIVER" }, ids.orgA)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("rejects spaces that do not belong to the floor", async () => {
    const { assertSpacesInFloor } = await import("@/modules/facilities/access");
    await expect(assertSpacesInFloor(ids.spaces, ids.floorA)).resolves.toBeUndefined();
    await expect(assertSpacesInFloor([...ids.spaces, "00000000-0000-0000-0000-000000000000"], ids.floorA)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("occupancy pipeline", () => {
  it("records manual status changes as events and updates live availability", async () => {
    const { setSpaceStatusManually, getLiveAvailability } = await import("@/modules/occupancy/service");
    await setSpaceStatusManually(ids.facilityA, ids.spaces[0], "OCCUPIED", ids.userA);
    await setSpaceStatusManually(ids.facilityA, ids.spaces[1], "OCCUPIED", ids.userA);
    await setSpaceStatusManually(ids.facilityA, ids.spaces[1], "OCCUPIED", ids.userA); // no-op: unchanged
    const events = await db.select().from(s.occupancyEvents).where(eq(s.occupancyEvents.facilityId, ids.facilityA));
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.source === "MANUAL" && e.actorId === ids.userA)).toBe(true);
    const live = await getLiveAvailability([{ id: ids.facilityA, declaredCapacity: 10 }]);
    const a = live.get(ids.facilityA)!;
    expect(a.available).toBe(2);
    expect(a.capacity).toBe(4);
    expect(a.simulated).toBe(false);
    expect(a.floors[0].counts.occupied).toBe(2);
  });
  it("ignores spaces of floors without a published map", async () => {
    const { getLiveAvailability } = await import("@/modules/occupancy/service");
    const [draftFloor] = await db.insert(s.floors).values({ facilityId: ids.facilityA, name: "G2" }).returning();
    await db.insert(s.parkingSpaces).values({ facilityId: ids.facilityA, floorId: draftFloor.id, code: "B-1", x: 0.5, y: 0.5 });
    const a = (await getLiveAvailability([{ id: ids.facilityA, declaredCapacity: 10 }])).get(ids.facilityA)!;
    expect(a.capacity).toBe(4);
  });
  it("shows facilities without a data source as unknown", async () => {
    const { getLiveAvailability } = await import("@/modules/occupancy/service");
    const live = await getLiveAvailability([{ id: ids.facilityB, declaredCapacity: 10 }]);
    expect(live.get(ids.facilityB)!.state).toBe("UNKNOWN");
  });
});

describe("platform admin authorization", () => {
  it("rejects non-admins on admin services", async () => {
    const { listUsers } = await import("@/modules/admin/service");
    await expect(listUsers(companyUser(), { page: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("suspended accounts cannot sign in and lose their sessions", async () => {
    const { setUserStatus } = await import("@/modules/admin/service");
    const { authenticate } = await import("@/modules/auth/service");
    const { hashPassword } = await import("@/modules/auth/password");
    const [u] = await db.insert(s.users).values({ email: "driver@test.dev", passwordHash: await hashPassword("Senha1234"), role: "DRIVER" }).returning();
    await db.insert(s.sessions).values({ id: "sess-hash", userId: u.id, expiresAt: new Date(Date.now() + 3600_000) });
    await expect(authenticate("driver@test.dev", "Senha1234")).resolves.toMatchObject({ id: u.id });
    const admin = { ...companyUser(), id: ids.admin, role: "PLATFORM_ADMIN" as const };
    await setUserStatus(admin, u.id, "SUSPENDED");
    await expect(authenticate("driver@test.dev", "Senha1234")).rejects.toMatchObject({ code: "SUSPENDED" });
    expect(await db.select().from(s.sessions).where(eq(s.sessions.userId, u.id))).toHaveLength(0);
    await expect(setUserStatus(admin, ids.admin, "SUSPENDED")).rejects.toMatchObject({ code: "SELF" });
  });
  it("rejects wrong passwords without revealing whether the e-mail exists", async () => {
    const { authenticate } = await import("@/modules/auth/service");
    await expect(authenticate("driver@test.dev", "errada123")).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    await expect(authenticate("ninguem@test.dev", "errada123")).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });
});

describe("database file storage (serverless hosting)", () => {
  it("stores, reads, overwrites and deletes files in PostgreSQL", async () => {
    const { DatabaseFileStorage } = await import("@/modules/storage/drivers");
    const store = new DatabaseFileStorage(db);
    const key = "floorplans/org/plan.png";
    await store.put(key, Buffer.from([1, 2, 3]), "image/png");
    expect([...(await store.get(key))!]).toEqual([1, 2, 3]);
    await store.put(key, Buffer.from([9]), "image/png");
    expect([...(await store.get(key))!]).toEqual([9]);
    await store.delete(key);
    expect(await store.get(key)).toBeNull();
  });
});
