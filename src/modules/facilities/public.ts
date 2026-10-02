import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lte, sql, type SQL } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/server/db/client";
import { facilities, facilityEntrances, facilityVehicleTypes, floorPlanElements, floorPlans, floors, operatingHours, organizations, parkingSpaces, sectors } from "@/server/db/schema";
import { boundingBox, haversineMeters, type LatLng } from "@/modules/geo/geo";
import { geocoder, SAO_PAULO_CENTER } from "@/modules/geo/geocoding";
import { getLiveAvailability, refreshOccupancy, type LiveAvailability } from "@/modules/occupancy/service";
import { fileUrl } from "@/modules/storage/storage";
import type { SearchParams } from "@/modules/search/params";
import { openStatus } from "./hours";

export type FacilityResult = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  neighborhood: string | null;
  addressLine: string;
  lat: number;
  lng: number;
  distanceMeters: number | null;
  open: boolean;
  openLabel: string;
  /** Floors with a published digital map (the mall's plan). */
  mappedFloors: number;
  covered: boolean;
  accessible: boolean;
  evChargers: number;
  acceptsMotorcycles: boolean;
  availability: LiveAvailability;
};

/** Vagou is shopping-only: public pages list published, active shopping malls. */
const publishedActive = and(eq(facilities.isPublished, true), eq(facilities.status, "ACTIVE"), eq(facilities.kind, "SHOPPING"));

export async function searchFacilities(params: SearchParams, now = new Date()) {
  let center: LatLng | null = null;
  let centerLabel: string | null = null;
  if (params.lat !== undefined && params.lng !== undefined) {
    center = { lat: params.lat, lng: params.lng };
    centerLabel = params.q || "Local selecionado";
  } else if (params.q) {
    // A shopping's own name wins (e.g. "Anália Franco"), then known neighborhoods/landmarks.
    const term = params.q.replace(/[%_\\]/g, "");
    const [mall] = await db
      .select({ name: facilities.name, lat: facilities.lat, lng: facilities.lng })
      .from(facilities)
      .where(and(publishedActive, ilike(facilities.name, `%${term}%`)))
      .limit(1);
    const match = mall ?? geocoder.search(params.q)[0];
    if (match) {
      center = { lat: match.lat, lng: match.lng };
      centerLabel = match.name;
    }
  }
  const unresolvedQuery = !!params.q && !center;
  const radius = params.raio ?? (center ? 3000 : 30000);
  const box = boundingBox(center ?? SAO_PAULO_CENTER, radius);

  const where: SQL[] = [publishedActive!, gte(facilities.lat, box.minLat), lte(facilities.lat, box.maxLat), gte(facilities.lng, box.minLng), lte(facilities.lng, box.maxLng)];
  if (params.acessivel) where.push(eq(facilities.accessible, true));
  if (params.ev) where.push(sql`${facilities.evChargers} > 0`);
  if (params.coberto) where.push(eq(facilities.covered, true));
  if (params.moto) where.push(sql`exists (select 1 from facility_vehicle_types v where v.facility_id = "facilities"."id" and v.vehicle_type = 'MOTORCYCLE')`);

  const rows = await db
    .select({
      id: facilities.id,
      slug: facilities.slug,
      name: facilities.name,
      kind: facilities.kind,
      neighborhood: facilities.neighborhood,
      addressLine: facilities.addressLine,
      lat: facilities.lat,
      lng: facilities.lng,
      covered: facilities.covered,
      accessible: facilities.accessible,
      evChargers: facilities.evChargers,
      declaredCapacity: facilities.declaredCapacity,
    })
    .from(facilities)
    .where(and(...where))
    .limit(200);

  const ids = rows.map((r) => r.id);
  await refreshOccupancy(ids, now);
  const [live, hours, motos] = await Promise.all([
    getLiveAvailability(rows, now),
    ids.length ? db.select().from(operatingHours).where(inArray(operatingHours.facilityId, ids)) : Promise.resolve([]),
    ids.length ? db.select().from(facilityVehicleTypes).where(and(inArray(facilityVehicleTypes.facilityId, ids), eq(facilityVehicleTypes.vehicleType, "MOTORCYCLE"))) : Promise.resolve([]),
  ]);

  let results: FacilityResult[] = rows.map((r) => {
    const os = openStatus(hours.filter((h) => h.facilityId === r.id), now);
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      kind: r.kind,
      neighborhood: r.neighborhood,
      addressLine: r.addressLine,
      lat: r.lat,
      lng: r.lng,
      distanceMeters: center ? haversineMeters(center, r) : null,
      open: os.open,
      openLabel: os.label,
      mappedFloors: live.get(r.id)!.floors.length,
      covered: r.covered,
      accessible: r.accessible,
      evChargers: r.evChargers,
      acceptsMotorcycles: motos.some((m) => m.facilityId === r.id),
      availability: live.get(r.id)!,
    };
  });

  if (center) results = results.filter((r) => (r.distanceMeters ?? 0) <= radius);
  if (params.aberto) results = results.filter((r) => r.open);
  if (params.comVagas) results = results.filter((r) => r.open && (r.availability.state === "AVAILABLE" || r.availability.state === "FEW"));

  const hasSpots = (r: FacilityResult) => (r.open && (r.availability.state === "AVAILABLE" || r.availability.state === "FEW") ? 0 : r.availability.state === "UNKNOWN" && r.open ? 1 : 2);
  const order = params.ordem ?? "relevancia";
  results.sort((a, b) => {
    if (order === "distancia") return (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0);
    if (order === "vagas") return (b.availability.available ?? -1) - (a.availability.available ?? -1);
    if (order === "capacidade") return b.availability.capacity - a.availability.capacity;
    return hasSpots(a) - hasSpots(b) || (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0);
  });

  return {
    center: center ?? SAO_PAULO_CENTER,
    centerLabel,
    hasCenter: !!center,
    unresolvedQuery,
    radius,
    results,
    withSpots: results.filter((r) => hasSpots(r) === 0).length,
    anySimulated: results.some((r) => r.availability.simulated),
  };
}

/** Public detail page data. Never exposes organization members or internal metadata. */
export const getPublicFacility = cache(async (slug: string, now = new Date()) => {
  const [f] = await db
    .select({
      id: facilities.id,
      slug: facilities.slug,
      name: facilities.name,
      kind: facilities.kind,
      description: facilities.description,
      addressLine: facilities.addressLine,
      neighborhood: facilities.neighborhood,
      city: facilities.city,
      postalCode: facilities.postalCode,
      lat: facilities.lat,
      lng: facilities.lng,
      phone: facilities.phone,
      declaredCapacity: facilities.declaredCapacity,
      covered: facilities.covered,
      accessible: facilities.accessible,
      accessibleSpaces: facilities.accessibleSpaces,
      evChargers: facilities.evChargers,
      valet: facilities.valet,
      security24h: facilities.security24h,
      maxHeightCm: facilities.maxHeightCm,
      usefulInfo: facilities.usefulInfo,
      isPublished: facilities.isPublished,
      status: facilities.status,
      operator: organizations.name,
    })
    .from(facilities)
    .innerJoin(organizations, eq(organizations.id, facilities.organizationId))
    .where(eq(facilities.slug, slug));
  if (!f || !f.isPublished || f.status !== "ACTIVE") return null;

  await refreshOccupancy([f.id], now);
  const [live, hours, entrances, vehicles, typeCounts, plans] = await Promise.all([
    getLiveAvailability([f], now),
    db.select().from(operatingHours).where(eq(operatingHours.facilityId, f.id)),
    db.select().from(facilityEntrances).where(eq(facilityEntrances.facilityId, f.id)),
    db.select({ v: facilityVehicleTypes.vehicleType }).from(facilityVehicleTypes).where(eq(facilityVehicleTypes.facilityId, f.id)),
    db
      .select({ type: parkingSpaces.type, status: parkingSpaces.opStatus, n: sql<number>`count(*)::int` })
      .from(parkingSpaces)
      .where(and(eq(parkingSpaces.facilityId, f.id), sql`${parkingSpaces.archivedAt} is null`))
      .groupBy(parkingSpaces.type, parkingSpaces.opStatus),
    db
      .select({ floorId: floorPlans.floorId, planId: floorPlans.id, previewKey: floorPlans.previewKey, widthPx: floorPlans.widthPx, heightPx: floorPlans.heightPx })
      .from(floorPlans)
      .innerJoin(floors, eq(floors.id, floorPlans.floorId))
      .where(and(eq(floors.facilityId, f.id), eq(floorPlans.status, "PUBLISHED")))
      .orderBy(desc(floorPlans.publishedAt)),
  ]);
  const planByFloor = new Map<string, (typeof plans)[number]>();
  for (const p of plans) if (!planByFloor.has(p.floorId)) planByFloor.set(p.floorId, p);
  const floorIds = [...planByFloor.keys()];
  const planIds = [...planByFloor.values()].map((p) => p.planId);
  const [mapSpaces, mapSectors, mapElements] = floorIds.length
    ? await Promise.all([
        db
          .select({ id: parkingSpaces.id, floorId: parkingSpaces.floorId, code: parkingSpaces.code, type: parkingSpaces.type, status: parkingSpaces.opStatus, sectorId: parkingSpaces.sectorId, x: parkingSpaces.x, y: parkingSpaces.y, w: parkingSpaces.w, h: parkingSpaces.h, rotation: parkingSpaces.rotation })
          .from(parkingSpaces)
          .where(and(inArray(parkingSpaces.floorId, floorIds), sql`${parkingSpaces.archivedAt} is null`)),
        db.select({ id: sectors.id, floorId: sectors.floorId, name: sectors.name, color: sectors.color }).from(sectors).where(inArray(sectors.floorId, floorIds)).orderBy(asc(sectors.name)),
        db.select({ id: floorPlanElements.id, planId: floorPlanElements.floorPlanId, kind: floorPlanElements.kind, label: floorPlanElements.label, x: floorPlanElements.x, y: floorPlanElements.y, w: floorPlanElements.w, h: floorPlanElements.h }).from(floorPlanElements).where(inArray(floorPlanElements.floorPlanId, planIds)),
      ])
    : [[], [], []];
  const availability = live.get(f.id)!;
  const free = (type: string) => typeCounts.filter((t) => t.type === type && t.status === "AVAILABLE").reduce((a, t) => a + t.n, 0);
  const primary = entrances.find((e) => e.isPrimary && e.kind !== "PEDESTRIAN") ?? entrances.find((e) => e.kind !== "PEDESTRIAN") ?? null;
  const publishedFloorIds = new Set(floorIds);
  // The mall's plan: one digital map per published floor, ordered like the floor list (top first).
  const floorMaps = availability.floors
    .filter((fl) => planByFloor.has(fl.floorId))
    .map((fl) => {
      const plan = planByFloor.get(fl.floorId)!;
      const spaces = mapSpaces.filter((sp) => sp.floorId === fl.floorId);
      const secs = mapSectors.filter((sc) => sc.floorId === fl.floorId);
      return {
        floorId: fl.floorId,
        name: fl.name,
        counts: fl.counts,
        imageUrl: fileUrl(plan.previewKey),
        ratio: plan.widthPx && plan.heightPx ? plan.heightPx / plan.widthPx : 0.625,
        spaces,
        elements: mapElements.filter((e) => e.planId === plan.planId),
        sectors: secs.map((sc) => ({ ...sc, total: spaces.filter((sp) => sp.sectorId === sc.id).length, free: spaces.filter((sp) => sp.sectorId === sc.id && sp.status === "AVAILABLE").length })),
      };
    });
  return {
    ...f,
    availability,
    open: openStatus(hours, now),
    hours,
    floorMaps,
    totalSpaces: availability.capacity,
    entrances,
    primaryEntrance: primary,
    vehicleTypes: vehicles.map((v) => v.v),
    freeByType: { PCD: free("PCD"), EV: free("EV"), MOTO: free("MOTO") },
    floorsWithMap: availability.floors.map((fl) => ({ ...fl, hasMap: publishedFloorIds.has(fl.floorId) })),
    navigateTo: primary ? { lat: primary.lat, lng: primary.lng } : { lat: f.lat, lng: f.lng },
  };
});

export type PublicFacility = NonNullable<Awaited<ReturnType<typeof getPublicFacility>>>;

/** Public digital map of one floor (only for published plans of published facilities). */
export async function getPublicFloorMap(slug: string, floorId: string) {
  const f = await getPublicFacility(slug);
  if (!f) return null;
  const [floor] = await db.select().from(floors).where(and(eq(floors.id, floorId), eq(floors.facilityId, f.id)));
  if (!floor) return null;
  const [plan] = await db
    .select()
    .from(floorPlans)
    .where(and(eq(floorPlans.floorId, floorId), eq(floorPlans.status, "PUBLISHED")))
    .orderBy(sql`${floorPlans.publishedAt} desc`)
    .limit(1);
  if (!plan) return null;
  const [spaces, secs, elements] = await Promise.all([
    db
      .select({ id: parkingSpaces.id, code: parkingSpaces.code, type: parkingSpaces.type, status: parkingSpaces.opStatus, sectorId: parkingSpaces.sectorId, x: parkingSpaces.x, y: parkingSpaces.y, w: parkingSpaces.w, h: parkingSpaces.h, rotation: parkingSpaces.rotation })
      .from(parkingSpaces)
      .where(and(eq(parkingSpaces.floorId, floorId), sql`${parkingSpaces.archivedAt} is null`)),
    db.select({ id: sectors.id, name: sectors.name, color: sectors.color }).from(sectors).where(eq(sectors.floorId, floorId)).orderBy(asc(sectors.name)),
    db.select().from(floorPlanElements).where(eq(floorPlanElements.floorPlanId, plan.id)),
  ]);
  return { facility: f, floor, plan: { imageUrl: fileUrl(plan.previewKey), widthPx: plan.widthPx, heightPx: plan.heightPx }, spaces, sectors: secs, elements };
}
