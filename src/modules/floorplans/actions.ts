"use server";

import { revalidatePath } from "next/cache";
import { z } from "@/lib/zod";
import { runAction } from "@/server/lib/action";
import { AppError, type ActionResult } from "@/server/lib/errors";
import { requireRole } from "@/modules/auth/session";
import { editorChangesSchema } from "./editor-schema";
import { analyzeFloorPlan, publishFloorPlan, saveEditorChanges, uploadFloorPlan } from "./service";

const uuid = z.string().uuid();
const company = () => requireRole("COMPANY_ADMIN", "PLATFORM_ADMIN");

export async function uploadFloorPlanAction(floorId: string, fd: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction("upload_floor_plan", async () => {
    const user = await company();
    const file = fd.get("file");
    if (!(file instanceof File)) throw new AppError("UPLOAD_EMPTY", "Selecione a planta para enviar.");
    const preview = fd.get("preview");
    const plan = await uploadFloorPlan(user, uuid.parse(floorId), file, preview instanceof File && preview.size > 0 ? preview : null, fd.get("replace") === "1");
    revalidatePath("/company", "layout");
    return plan;
  });
}

export async function reanalyzeFloorPlanAction(floorPlanId: string, replaceSpaces: boolean): Promise<ActionResult<null>> {
  return runAction("reanalyze_floor_plan", async () => {
    const user = await company();
    await analyzeFloorPlan(user, uuid.parse(floorPlanId), replaceSpaces);
    revalidatePath("/company", "layout");
    return null;
  });
}

export async function publishFloorPlanAction(floorPlanId: string): Promise<ActionResult<null>> {
  return runAction("publish_floor_plan", async () => {
    const user = await company();
    await publishFloorPlan(user, uuid.parse(floorPlanId));
    revalidatePath("/company", "layout");
    revalidatePath("/estacionamentos", "layout");
    return null;
  });
}

export async function saveEditorAction(floorId: string, changes: unknown): Promise<ActionResult<null>> {
  return runAction("save_floor_editor", async () => {
    const user = await company();
    await saveEditorChanges(user, uuid.parse(floorId), editorChangesSchema.parse(changes));
    revalidatePath("/company", "layout");
    revalidatePath("/estacionamentos", "layout");
    return null;
  });
}
