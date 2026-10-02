"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "@/lib/zod";
import { db } from "@/server/db/client";
import { facilities, favorites } from "@/server/db/schema";
import { runAction } from "@/server/lib/action";
import { NotFoundError, type ActionResult } from "@/server/lib/errors";
import { requireUser } from "@/modules/auth/session";

export async function toggleFavoriteAction(facilityId: string): Promise<ActionResult<{ favorite: boolean }>> {
  return runAction("toggle_favorite", async () => {
    const user = await requireUser();
    const id = z.string().uuid().parse(facilityId);
    const [f] = await db.select({ id: facilities.id }).from(facilities).where(and(eq(facilities.id, id), eq(facilities.isPublished, true)));
    if (!f) throw new NotFoundError("Estacionamento não encontrado.");
    const [existing] = await db.select().from(favorites).where(and(eq(favorites.userId, user.id), eq(favorites.facilityId, id)));
    if (existing) await db.delete(favorites).where(and(eq(favorites.userId, user.id), eq(favorites.facilityId, id)));
    else await db.insert(favorites).values({ userId: user.id, facilityId: id });
    revalidatePath("/app");
    return { favorite: !existing };
  });
}
