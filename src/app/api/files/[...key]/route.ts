import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { facilities, floorPlans, floors } from "@/server/db/schema";
import { getCurrentUser } from "@/modules/auth/session";
import { assertOrgAccess } from "@/modules/facilities/access";
import { mimeFromKey, storage } from "@/modules/storage/storage";
import { logger } from "@/server/lib/logger";

/**
 * Serves stored uploads with per-prefix authorization:
 *  - facilities/<facilityId>/*   → public (facility photos)
 *  - floorplans/<orgId>/*        → members of that organization (and platform admins);
 *                                  public only when the plan is PUBLISHED on a published facility
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await params;
  if (parts.some((p) => p === ".." || p.includes("\\") || p.startsWith("."))) return new Response("Not found", { status: 404 });
  const key = parts.join("/");
  const [prefix, owner] = parts;

  if (prefix === "floorplans") {
    const [publicPlan] = await db
      .select({ id: floorPlans.id })
      .from(floorPlans)
      .innerJoin(floors, eq(floors.id, floorPlans.floorId))
      .innerJoin(facilities, eq(facilities.id, floors.facilityId))
      .where(and(eq(floorPlans.status, "PUBLISHED"), eq(facilities.isPublished, true), eq(floorPlans.previewKey, key)))
      .limit(1);
    if (!publicPlan) {
      const user = await getCurrentUser();
      if (!user) return new Response("Unauthorized", { status: 401 });
      try {
        await assertOrgAccess(user, owner);
      } catch {
        return new Response("Forbidden", { status: 403 });
      }
    }
  } else if (prefix !== "facilities") {
    return new Response("Not found", { status: 404 });
  }

  const data = await storage.get(key);
  if (!data) return new Response("Not found", { status: 404 });
  logger.debug("file_served", { prefix });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": mimeFromKey(key),
      "Content-Length": String(data.length),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": prefix === "facilities" ? "public, max-age=86400, immutable" : "private, max-age=300",
    },
  });
}
