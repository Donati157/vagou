"use server";

import { revalidatePath } from "next/cache";
import { z } from "@/lib/zod";
import { runAction } from "@/server/lib/action";
import type { ActionResult } from "@/server/lib/errors";
import { requireRole } from "@/modules/auth/session";
import { setUserStatus } from "./service";

export async function setUserStatusAction(userId: string, status: "ACTIVE" | "SUSPENDED"): Promise<ActionResult<null>> {
  return runAction("admin_set_user_status", async () => {
    const admin = await requireRole("PLATFORM_ADMIN");
    await setUserStatus(admin, z.string().uuid().parse(userId), z.enum(["ACTIVE", "SUSPENDED"]).parse(status));
    revalidatePath("/admin/usuarios");
    return null;
  });
}
