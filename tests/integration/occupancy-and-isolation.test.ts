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
  it("shows facilities without a data source as unknown", async () => {
    const { getLiveAvailability } = await import("@/modules/occupancy/service");
    const live = await getLiveAvailability([{ id: ids.facilityB, declaredCapacity: 10 }]);
    expect(live.get(ids.facilityB)!.state).toBe("UNKNOWN");
  });
});
