"use server";

import { and, eq } from "drizzle-orm";
import { z } from "@/lib/zod";
import { db } from "@/server/db/client";
import { parkingSpaces } from "@/server/db/schema";
import { runAction } from "@/server/lib/action";
import { NotFoundError, type ActionResult } from "@/server/lib/errors";
import { requireRole } from "@/modules/auth/session";
import { assertFacilityAccess } from "@/modules/facilities/access";
import { getSpaceHistory } from "./operations";
import { setSpaceStatusManually } from "./service";

const uuid = z.string().uuid();

export async function setSpaceStatusAction(facilityId: string, spaceId: string, status: string): Promise<ActionResult<null>> {
  return runAction("set_space_status", async () => {
    const user = await requireRole("COMPANY_ADMIN", "PLATFORM_ADMIN");
    const fid = uuid.parse(facilityId);
    const sid = uuid.parse(spaceId);
    await assertFacilityAccess(user, fid);
    const [space] = await db.select({ id: parkingSpaces.id }).from(parkingSpaces).where(and(eq(parkingSpaces.id, sid), eq(parkingSpaces.facilityId, fid)));
    if (!space) throw new NotFoundError("Vaga não encontrada.");
    await setSpaceStatusManually(fid, sid, z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "UNAVAILABLE"]).parse(status), user.id);
    return null;
  });
}

export async function spaceHistoryAction(facilityId: string, spaceId: string) {
  return runAction("space_history", async () => {
    const user = await requireRole("COMPANY_ADMIN", "PLATFORM_ADMIN");
    return getSpaceHistory(user, uuid.parse(facilityId), uuid.parse(spaceId));
  });
}
