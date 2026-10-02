import "server-only";
import { and, asc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/server/db/client";
import { facilities, facilityEntrances, facilityVehicleTypes, floorPlanElements, floorPlans, floors, operatingHours, organizations, parkingRates, parkingSpaces, sectors } from "@/server/db/schema";
import { boundingBox, haversineMeters, type LatLng } from "@/modules/geo/geo";
import { geocoder, SAO_PAULO_CENTER } from "@/modules/geo/geocoding";
import { getLiveAvailability, refreshOccupancy, type LiveAvailability } from "@/modules/occupancy/service";
import { fileUrl } from "@/modules/storage/storage";
import type { SearchParams } from "@/modules/search/params";
import { openStatus } from "./hours";
import { startingPrice } from "./rates";

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
  startingPriceCents: number | null;
  covered: boolean;
  accessible: boolean;
  evChargers: number;
  acceptsMotorcycles: boolean;
  availability: LiveAvailability;
};

const publishedActive = and(eq(facilities.isPublished, true), eq(facilities.status, "ACTIVE"));

export async function searchFacilities(params: SearchParams, now = new Date()) {
  let center: LatLng | null = null;
  let centerLabel: string | null = null;
  if (params.lat !== undefined && params.lng !== undefined) {
    center = { lat: params.lat, lng: params.lng };
    centerLabel = params.q || "Local selecionado";
  } else if (params.q) {
    const match = geocoder.search(params.q)[0];
    if (match) {
      center = match;
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
  const [live, hours, rates, motos] = await Promise.all([
    getLiveAvailability(rows, now),
    ids.length ? db.select().from(operatingHours).where(inArray(operatingHours.facilityId, ids)) : Promise.resolve([]),
    ids.length ? db.select().from(parkingRates).where(inArray(parkingRates.facilityId, ids)) : Promise.resolve([]),
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
      startingPriceCents: startingPrice(rates.filter((x) => x.facilityId === r.id)),
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
  if (params.precoMax) results = results.filter((r) => r.startingPriceCents !== null && r.startingPriceCents <= params.precoMax! * 100);

  const hasSpots = (r: FacilityResult) => (r.open && (r.availability.state === "AVAILABLE" || r.availability.state === "FEW") ? 0 : r.availability.state === "UNKNOWN" && r.open ? 1 : 2);
  const order = params.ordem ?? "relevancia";
  results.sort((a, b) => {
    if (order === "distancia") return (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0);
    if (order === "vagas") return (b.availability.available ?? -1) - (a.availability.available ?? -1);
    if (order === "preco") return (a.startingPriceCents ?? Infinity) - (b.startingPriceCents ?? Infinity);
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
  const [live, hours, rates, entrances, vehicles, typeCounts, plans] = await Promise.all([
    getLiveAvailability([f], now),
    db.select().from(operatingHours).where(eq(operatingHours.facilityId, f.id)),
    db.select().from(parkingRates).where(eq(parkingRates.facilityId, f.id)).orderBy(asc(parkingRates.sortOrder)),
    db.select().from(facilityEntrances).where(eq(facilityEntrances.facilityId, f.id)),
    db.select({ v: facilityVehicleTypes.vehicleType }).from(facilityVehicleTypes).where(eq(facilityVehicleTypes.facilityId, f.id)),
    db
      .select({ type: parkingSpaces.type, status: parkingSpaces.opStatus, n: sql<number>`count(*)::int` })
      .from(parkingSpaces)
      .where(and(eq(parkingSpaces.facilityId, f.id), sql`${parkingSpaces.archivedAt} is null`))
      .groupBy(parkingSpaces.type, parkingSpaces.opStatus),
    db
      .select({ floorId: floorPlans.floorId })
      .from(floorPlans)
      .innerJoin(floors, eq(floors.id, floorPlans.floorId))
      .where(and(eq(floors.facilityId, f.id), eq(floorPlans.status, "PUBLISHED"))),
  ]);
  const availability = live.get(f.id)!;
  const free = (type: string) => typeCounts.filter((t) => t.type === type && t.status === "AVAILABLE").reduce((a, t) => a + t.n, 0);
  const primary = entrances.find((e) => e.isPrimary && e.kind !== "PEDESTRIAN") ?? entrances.find((e) => e.kind !== "PEDESTRIAN") ?? null;
  const publishedFloorIds = new Set(plans.map((p) => p.floorId));
  return {
    ...f,
    availability,
    open: openStatus(hours, now),
    hours,
    rates,
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
