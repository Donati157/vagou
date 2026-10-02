"use server";

import { revalidatePath } from "next/cache";
import { z } from "@/lib/zod";
import { db } from "@/server/db/client";
import { dataSources, facilities } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { runAction } from "@/server/lib/action";
import { AppError, type ActionResult } from "@/server/lib/errors";
import { audit } from "@/server/lib/audit";
import { requireRole } from "@/modules/auth/session";
import { recordManualCount } from "@/modules/occupancy/service";
import { assertFacilityAccess } from "./access";
import {
  createFacility,
  createFloor,
  createSector,
  deleteFloor,
  deleteSector,
  disconnectDataSource,
  replaceEntrances,
  replaceRates,
  setDataSource,
  setFacilityPublished,
  updateFacility,
  updateFloor,
  updateSector,
} from "./manage";
import { dataSourceInputSchema, entrancesInputSchema, facilityInputSchema, floorSchema, ratesInputSchema, sectorSchema } from "./schemas";

const uuid = z.string().uuid();
const company = () => requireRole("COMPANY_ADMIN", "PLATFORM_ADMIN");
const refresh = (facilityId?: string) => {
  revalidatePath("/company", "layout");
  if (facilityId) revalidatePath("/estacionamentos", "layout");
};

export async function createFacilityAction(input: unknown, organizationId?: string | null): Promise<ActionResult<{ id: string }>> {
  return runAction("create_facility", async () => {
    const user = await company();
    const f = await createFacility(user, facilityInputSchema.parse(input), organizationId ? uuid.parse(organizationId) : null);
    refresh(f.id);
    return f;
  });
}

export async function updateFacilityAction(facilityId: string, input: unknown): Promise<ActionResult<{ slug: string }>> {
  return runAction("update_facility", async () => {
    const user = await company();
    const res = await updateFacility(user, uuid.parse(facilityId), facilityInputSchema.parse(input));
    refresh(facilityId);
    return res;
  });
}

export async function setPublishedAction(facilityId: string, published: boolean): Promise<ActionResult<null>> {
  return runAction("set_published", async () => {
    const user = await company();
    await setFacilityPublished(user, uuid.parse(facilityId), published);
    refresh(facilityId);
    return null;
  });
}

export async function saveRatesAction(facilityId: string, input: unknown): Promise<ActionResult<null>> {
  return runAction("save_rates", async () => {
    const user = await company();
    await replaceRates(user, uuid.parse(facilityId), ratesInputSchema.parse(input));
    refresh(facilityId);
    return null;
  });
}

export async function saveEntrancesAction(facilityId: string, input: unknown): Promise<ActionResult<null>> {
  return runAction("save_entrances", async () => {
    const user = await company();
    await replaceEntrances(user, uuid.parse(facilityId), entrancesInputSchema.parse(input));
    refresh(facilityId);
    return null;
  });
}

export async function createFloorAction(facilityId: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction("create_floor", async () => {
    const user = await company();
    const f = await createFloor(user, uuid.parse(facilityId), floorSchema.parse(input));
    refresh(facilityId);
    return f;
  });
}

export async function updateFloorAction(floorId: string, input: unknown): Promise<ActionResult<null>> {
  return runAction("update_floor", async () => {
    const user = await company();
    await updateFloor(user, uuid.parse(floorId), floorSchema.parse(input));
    refresh();
    return null;
  });
}

export async function deleteFloorAction(floorId: string): Promise<ActionResult<null>> {
  return runAction("delete_floor", async () => {
    const user = await company();
    await deleteFloor(user, uuid.parse(floorId));
    refresh();
    return null;
  });
}

export async function createSectorAction(floorId: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction("create_sector", async () => {
    const user = await company();
    const s = await createSector(user, uuid.parse(floorId), sectorSchema.parse(input));
    refresh();
    return s;
  });
}

export async function updateSectorAction(sectorId: string, input: unknown): Promise<ActionResult<null>> {
  return runAction("update_sector", async () => {
    const user = await company();
    await updateSector(user, uuid.parse(sectorId), sectorSchema.parse(input));
    refresh();
    return null;
  });
}

export async function deleteSectorAction(sectorId: string): Promise<ActionResult<null>> {
  return runAction("delete_sector", async () => {
    const user = await company();
    await deleteSector(user, uuid.parse(sectorId));
    refresh();
    return null;
  });
}

export async function setDataSourceAction(facilityId: string, input: unknown): Promise<ActionResult<null>> {
  return runAction("set_data_source", async () => {
    const user = await company();
    await setDataSource(user, uuid.parse(facilityId), dataSourceInputSchema.parse(input));
    refresh(facilityId);
    return null;
  });
}

export async function disconnectDataSourceAction(facilityId: string): Promise<ActionResult<null>> {
  return runAction("disconnect_data_source", async () => {
    const user = await company();
    await disconnectDataSource(user, uuid.parse(facilityId));
    refresh(facilityId);
    return null;
  });
}

const manualCountSchema = z.object({ available: z.number().int().min(0).max(20000), unavailable: z.number().int().min(0).max(20000).default(0) });

export async function recordManualCountAction(facilityId: string, input: unknown): Promise<ActionResult<null>> {
  return runAction("manual_count", async () => {
    const user = await company();
    const id = uuid.parse(facilityId);
    await assertFacilityAccess(user, id);
    const p = manualCountSchema.parse(input);
    const [src] = await db.select({ kind: dataSources.kind, granularity: dataSources.granularity }).from(dataSources).where(and(eq(dataSources.facilityId, id), eq(dataSources.status, "ACTIVE")));
    if (!src || src.kind !== "MANUAL" || src.granularity !== "AGGREGATE") throw new AppError("NOT_MANUAL", "A contagem manual só está disponível com a fonte “Atualização manual” por contagem.");
    const [f] = await db.select({ capacity: facilities.declaredCapacity }).from(facilities).where(eq(facilities.id, id));
    if (p.available + p.unavailable > f.capacity) throw new AppError("OVER_CAPACITY", `O total não pode passar da capacidade (${f.capacity} vagas).`);
    await recordManualCount(id, f.capacity, p.available, p.unavailable);
    await audit(db, { actorId: user.id, action: "occupancy.manual_count", entityType: "facility", entityId: id, metadata: { available: p.available } });
    refresh(id);
    return null;
  });
}
