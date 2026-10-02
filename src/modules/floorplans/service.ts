import "server-only";
import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { dataSources, facilities, floorPlanElements, floorPlans, floors, parkingSpaces, sectors } from "@/server/db/schema";
import { AppError, NotFoundError } from "@/server/lib/errors";
import { audit } from "@/server/lib/audit";
import { logger } from "@/server/lib/logger";
import { pgErrorCode, PG_UNIQUE_VIOLATION } from "@/server/lib/pg";
import type { CurrentUser } from "@/modules/auth/session";
import { assertFloorAccess, assertFloorPlanAccess } from "@/modules/facilities/access";
import { applySpaceObservations } from "@/modules/occupancy/service";
import { fileUrl, newKey, storage, validateUpload } from "@/modules/storage/storage";
import { getPlanAnalyzer } from "./analyzer";
import { imageSize } from "./image-size";
import type { EditorChanges } from "./editor-schema";

/**
 * Mapa Inteligente: upload → processing (ParkingPlanAnalyzer) → review/editor → publish.
 * Spaces of a floor only count publicly once the floor has a PUBLISHED plan.
 */

export async function uploadFloorPlan(user: CurrentUser, floorId: string, original: File, preview: File | null, replaceSpaces: boolean) {
  const { organizationId, facilityId } = await assertFloorAccess(user, floorId);
  const file = await validateUpload(original, "floorplan");
  let previewData: { data: Buffer; mime: string; ext: string } | null = null;
  if (file.mime === "application/pdf") {
    if (!preview) throw new AppError("PDF_PREVIEW", "Não conseguimos ler este PDF no navegador. Envie a planta em PNG ou JPG.");
    const p = await validateUpload(preview, "image");
    previewData = { data: p.data, mime: p.mime, ext: p.ext };
  }
  const prefix = `floorplans/${organizationId}`;
  const originalKey = newKey(prefix, file.ext);
  await storage.put(originalKey, file.data, file.mime);
  let previewKey = originalKey;
  let dims = imageSize(file.data);
  if (previewData) {
    previewKey = newKey(prefix, previewData.ext);
    await storage.put(previewKey, previewData.data, previewData.mime);
    dims = imageSize(previewData.data);
  }
  const [plan] = await db
    .insert(floorPlans)
    .values({
      floorId,
      originalKey,
      originalName: file.safeName,
      originalMime: file.mime,
      originalSize: file.size,
      previewKey,
      widthPx: dims?.width ?? null,
      heightPx: dims?.height ?? null,
      status: "UPLOADED",
      uploadedBy: user.id,
    })
    .returning({ id: floorPlans.id });
  await audit(db, { actorId: user.id, action: "floor_plan.uploaded", entityType: "floor_plan", entityId: plan.id, metadata: { facilityId, mime: file.mime } });
  await analyzeFloorPlan(user, plan.id, replaceSpaces);
  return plan;
}

/** Runs the configured analyzer and materializes sectors, spaces and elements for review. */
export async function analyzeFloorPlan(user: CurrentUser, floorPlanId: string, replaceSpaces: boolean) {
  const { floorId, facilityId } = await assertFloorPlanAccess(user, floorPlanId);
  const [plan] = await db.select().from(floorPlans).where(eq(floorPlans.id, floorPlanId));
  const [floor] = await db.select().from(floors).where(eq(floors.id, floorId));
  await db.update(floorPlans).set({ status: "PROCESSING", analysisError: null }).where(eq(floorPlans.id, floorPlanId));
  const analyzer = getPlanAnalyzer();
  try {
    const bytes = (await storage.get(plan.previewKey ?? plan.originalKey)) ?? Buffer.alloc(0);
    const result = await analyzer.analyzeParkingPlan({ bytes, mime: plan.originalMime, width: plan.widthPx, height: plan.heightPx, floorName: floor.name });
    await db.transaction(async (tx) => {
      const existing = await tx.select({ id: parkingSpaces.id, code: parkingSpaces.code }).from(parkingSpaces).where(and(eq(parkingSpaces.floorId, floorId), isNull(parkingSpaces.archivedAt)));
      const createSpaces = existing.length === 0 || replaceSpaces;
      // sectors (reuse by name)
      const currentSectors = await tx.select().from(sectors).where(eq(sectors.floorId, floorId));
      const sectorIds = new Map(currentSectors.map((s) => [s.name, s.id]));
      for (const s of result.sectors) {
        if (sectorIds.has(s.name)) continue;
        const [row] = await tx.insert(sectors).values({ floorId, name: s.name, color: s.color }).returning({ id: sectors.id });
        sectorIds.set(s.name, row.id);
      }
      if (createSpaces) {
        if (existing.length) await tx.update(parkingSpaces).set({ archivedAt: new Date() }).where(inArray(parkingSpaces.id, existing.map((e) => e.id)));
        // avoid code clashes with other floors of the facility
        const taken = new Set(
          (await tx.select({ code: parkingSpaces.code }).from(parkingSpaces).where(and(eq(parkingSpaces.facilityId, facilityId), isNull(parkingSpaces.archivedAt)))).map((r) => r.code),
        );
        const rows = result.parkingSpaces.map((p) => {
          let code = p.code;
          for (let i = 2; taken.has(code); i++) code = `${p.code}-${i}`;
          taken.add(code);
          return { facilityId, floorId, sectorId: sectorIds.get(p.sector) ?? null, code, type: p.type, x: p.x, y: p.y, w: p.w, h: p.h, rotation: p.rotation, opStatus: "AVAILABLE" as const, opStatusSource: "MANUAL" as const };
        });
        for (let i = 0; i < rows.length; i += 300) await tx.insert(parkingSpaces).values(rows.slice(i, i + 300));
      }
      const elements = [...result.entrances, ...result.exits, ...result.circulationAreas, ...result.otherElements];
      await tx.delete(floorPlanElements).where(eq(floorPlanElements.floorPlanId, floorPlanId));
      if (elements.length) await tx.insert(floorPlanElements).values(elements.map((e) => ({ floorPlanId, kind: e.kind, label: e.label, x: e.x, y: e.y, w: e.w, h: e.h, rotation: e.rotation ?? 0, confidence: result.confidence })));
      await tx.update(floorPlans).set({ status: "ANALYZED", analyzer: analyzer.name, confidence: result.confidence, analyzedAt: new Date() }).where(eq(floorPlans.id, floorPlanId));
    });
    await audit(db, { actorId: user.id, action: "floor_plan.analyzed", entityType: "floor_plan", entityId: floorPlanId, metadata: { analyzer: analyzer.name, spaces: result.parkingSpaces.length } });
  } catch (err) {
    logger.error("floor_plan_analysis_failed", { floorPlanId, err });
    const message = err instanceof Error && err.message === "PLAN_TOO_SMALL" ? "A imagem é pequena demais para análise. Envie a planta em maior resolução." : "Não foi possível analisar a planta. Você pode tentar de novo ou desenhar as vagas no editor.";
    await db.update(floorPlans).set({ status: "FAILED", analysisError: message, analyzer: analyzer.name }).where(eq(floorPlans.id, floorPlanId));
  }
}

export async function publishFloorPlan(user: CurrentUser, floorPlanId: string) {
  const { floorId, facilityId } = await assertFloorPlanAccess(user, floorPlanId);
  const [plan] = await db.select({ status: floorPlans.status }).from(floorPlans).where(eq(floorPlans.id, floorPlanId));
  if (plan.status !== "ANALYZED" && plan.status !== "FAILED") throw new AppError("NOT_PUBLISHABLE", "Esta planta não pode ser publicada no estado atual.");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(parkingSpaces).where(and(eq(parkingSpaces.floorId, floorId), isNull(parkingSpaces.archivedAt)));
  if (n === 0) throw new AppError("EMPTY_MAP", "O mapa não tem vagas. Adicione vagas no editor antes de publicar.");
  await db.transaction(async (tx) => {
    await tx.update(floorPlans).set({ status: "SUPERSEDED" }).where(and(eq(floorPlans.floorId, floorId), eq(floorPlans.status, "PUBLISHED"), ne(floorPlans.id, floorPlanId)));
    await tx.update(floorPlans).set({ status: "PUBLISHED", publishedAt: new Date() }).where(eq(floorPlans.id, floorPlanId));
    // A simulated count-only source becomes per-space once a digital map exists.
    await tx
      .update(dataSources)
      .set({ granularity: "SPACE", updatedAt: new Date() })
      .where(and(eq(dataSources.facilityId, facilityId), eq(dataSources.status, "ACTIVE"), eq(dataSources.kind, "SIMULATION"), eq(dataSources.granularity, "AGGREGATE")));
    await audit(tx, { actorId: user.id, action: "floor_plan.published", entityType: "floor_plan", entityId: floorPlanId, metadata: { spaces: n } });
  });
}

/** Everything the editor needs for one floor (latest plan + spaces + sectors + elements). */
export async function getFloorEditorData(user: CurrentUser, floorId: string) {
  const { facilityId } = await assertFloorAccess(user, floorId);
  const [floor] = await db.select().from(floors).where(eq(floors.id, floorId));
  const [f] = await db.select({ name: facilities.name }).from(facilities).where(eq(facilities.id, facilityId));
  const plans = await db.select().from(floorPlans).where(eq(floorPlans.floorId, floorId)).orderBy(desc(floorPlans.createdAt)).limit(5);
  const plan = plans[0] ?? null;
  const [spaces, secs, elements] = await Promise.all([
    db
      .select({ id: parkingSpaces.id, code: parkingSpaces.code, type: parkingSpaces.type, status: parkingSpaces.opStatus, sectorId: parkingSpaces.sectorId, x: parkingSpaces.x, y: parkingSpaces.y, w: parkingSpaces.w, h: parkingSpaces.h, rotation: parkingSpaces.rotation })
      .from(parkingSpaces)
      .where(and(eq(parkingSpaces.floorId, floorId), isNull(parkingSpaces.archivedAt)))
      .orderBy(parkingSpaces.code),
    db.select({ id: sectors.id, name: sectors.name, color: sectors.color }).from(sectors).where(eq(sectors.floorId, floorId)).orderBy(sectors.name),
    plan ? db.select().from(floorPlanElements).where(eq(floorPlanElements.floorPlanId, plan.id)) : Promise.resolve([]),
  ]);
  return {
    facilityId,
    facilityName: f.name,
    floor,
    plan: plan
      ? { id: plan.id, status: plan.status, analyzer: plan.analyzer, confidence: plan.confidence, analysisError: plan.analysisError, originalName: plan.originalName, imageUrl: fileUrl(plan.previewKey), widthPx: plan.widthPx, heightPx: plan.heightPx, publishedAt: plan.publishedAt, analyzedAt: plan.analyzedAt }
      : null,
    history: plans.map((p) => ({ id: p.id, status: p.status, createdAt: p.createdAt, originalName: p.originalName })),
    spaces,
    sectors: secs,
    elements,
    analyzerIsDemo: getPlanAnalyzer().isDemo,
  };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Persists a batch of editor changes. Every id must belong to the floor (tenant safety);
 * status changes go through the occupancy pipeline so they are recorded as MANUAL events.
 */
export async function saveEditorChanges(user: CurrentUser, floorId: string, changes: EditorChanges) {
  const { facilityId } = await assertFloorAccess(user, floorId);
  const ids = [...changes.updated.map((u) => u.id), ...changes.deleted];
  if (ids.length) {
    const owned = await db.select({ id: parkingSpaces.id }).from(parkingSpaces).where(and(inArray(parkingSpaces.id, ids), eq(parkingSpaces.floorId, floorId)));
    if (owned.length !== new Set(ids).size) throw new NotFoundError("Algumas vagas não pertencem a este piso. Recarregue o editor.");
  }
  const sectorIds = new Set([...changes.created, ...changes.updated].map((s) => s.sectorId).filter(Boolean) as string[]);
  if (sectorIds.size) {
    const ok = await db.select({ id: sectors.id }).from(sectors).where(and(inArray(sectors.id, [...sectorIds]), eq(sectors.floorId, floorId)));
    if (ok.length !== sectorIds.size) throw new NotFoundError("Setor inválido para este piso.");
  }
  const geom = (s: { x: number; y: number; w: number; h: number; rotation: number }) => ({
    w: Math.min(0.5, Math.max(0.004, s.w)),
    h: Math.min(0.5, Math.max(0.004, s.h)),
    x: clamp01(s.x),
    y: clamp01(s.y),
    rotation: ((Math.round(s.rotation) % 360) + 360) % 360,
  });
  try {
    await db.transaction(async (tx) => {
      const now = new Date();
      if (changes.deleted.length) await tx.update(parkingSpaces).set({ archivedAt: now, updatedAt: now }).where(and(inArray(parkingSpaces.id, changes.deleted), eq(parkingSpaces.floorId, floorId)));
      const statusChanges: Array<{ spaceId: string; status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "UNAVAILABLE" }> = [];
      for (const u of changes.updated) {
        await tx
          .update(parkingSpaces)
          .set({ code: u.code, type: u.type, sectorId: u.sectorId, ...geom(u), updatedAt: now })
          .where(and(eq(parkingSpaces.id, u.id), eq(parkingSpaces.floorId, floorId)));
        statusChanges.push({ spaceId: u.id, status: u.status });
      }
      if (changes.created.length) {
        await tx.insert(parkingSpaces).values(changes.created.map((c) => ({ facilityId, floorId, code: c.code, type: c.type, sectorId: c.sectorId, opStatus: c.status, opStatusSource: "MANUAL" as const, ...geom(c) })));
      }
      await applySpaceObservations(tx, facilityId, statusChanges, "MANUAL", user.id, now);
      await audit(tx, { actorId: user.id, action: "floor_map.edited", entityType: "floor", entityId: floorId, metadata: { created: changes.created.length, updated: changes.updated.length, deleted: changes.deleted.length } });
    });
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) throw new AppError("DUPLICATE_CODE", "Existem vagas com o mesmo nome neste estacionamento. Use nomes únicos.");
    throw err;
  }
}
