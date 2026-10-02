import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createDatabase, type Database } from "@/server/db/create";
import * as s from "@/server/db/schema";
import { runMigrations } from "../../scripts/migrate";

// Auth runs on request cookies; without a session cookie the guard must redirect to login.
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

let db: Database;
const ids = { driver: "", lonely: "", published: "", draft: "" };

beforeAll(async () => {
  db = createDatabase({ inMemory: true });
  (globalThis as unknown as { __vagouDb?: Database }).__vagouDb = db;
  await runMigrations(db);
  const [org] = await db.insert(s.organizations).values({ name: "Org", slug: "org" }).returning();
  const [driver] = await db.insert(s.users).values({ email: "d@test.dev", passwordHash: "x", role: "DRIVER" }).returning();
  const [lonely] = await db.insert(s.users).values({ email: "l@test.dev", passwordHash: "x", role: "DRIVER" }).returning();
  const base = { organizationId: org.id, addressLine: "Rua X, 1", lat: -23.56, lng: -46.65, declaredCapacity: 10, kind: "SHOPPING" as const };
  const [published] = await db.insert(s.facilities).values({ ...base, slug: "shopping-a", name: "Shopping A", isPublished: true }).returning();
  const [draft] = await db.insert(s.facilities).values({ ...base, slug: "shopping-b", name: "Shopping B", isPublished: false }).returning();
  await db.insert(s.favorites).values([
    { userId: driver.id, facilityId: published.id },
    { userId: driver.id, facilityId: draft.id },
  ]);
  Object.assign(ids, { driver: driver.id, lonely: lonely.id, published: published.id, draft: draft.id });
});

describe("driver favorites", () => {
  it("returns an empty list (not an error) for a driver without favorites", async () => {
    const { listFavoriteFacilities } = await import("@/modules/facilities/driver");
    await expect(listFavoriteFacilities(ids.lonely)).resolves.toEqual([]);
  });

  it("lists a valid favorite shaped like a search result, and hides unpublished ones", async () => {
    const { listFavoriteFacilities } = await import("@/modules/facilities/driver");
    const favs = await listFavoriteFacilities(ids.driver);
    expect(favs.map((f) => f.slug)).toEqual(["shopping-a"]);
    expect(favs[0]).toMatchObject({ name: "Shopping A", mappedFloors: 0, distanceMeters: null });
    expect(favs[0].availability).toBeDefined();
  });

  it("cannot keep orphan favorites: removing a shopping removes its favorites", async () => {
    await db.delete(s.facilities).where(eq(s.facilities.id, ids.draft));
    const rows = await db.select().from(s.favorites).where(eq(s.favorites.facilityId, ids.draft));
    expect(rows).toEqual([]);
  });

  it("sends unauthenticated visitors of /app to login", async () => {
    const { requireAreaPage } = await import("@/modules/auth/session");
    await expect(requireAreaPage("driver", "/app")).rejects.toThrow("REDIRECT:/entrar?next=%2Fapp");
  });
});
