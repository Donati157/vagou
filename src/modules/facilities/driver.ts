import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import { facilities, facilityVehicleTypes, favorites, operatingHours, parkingRates } from "@/server/db/schema";
import { getLiveAvailability, refreshOccupancy } from "@/modules/occupancy/service";
import { openStatus } from "./hours";
import { startingPrice } from "./rates";
import type { FacilityResult } from "./public";

/** The driver's saved facilities, shaped like search results (live availability included). */
export async function listFavoriteFacilities(userId: string, now = new Date()): Promise<FacilityResult[]> {
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
    .from(favorites)
    .innerJoin(facilities, eq(facilities.id, favorites.facilityId))
    .where(and(eq(favorites.userId, userId), eq(facilities.isPublished, true)))
    .orderBy(facilities.name);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  await refreshOccupancy(ids, now);
  const [live, hours, rates, motos] = await Promise.all([
    getLiveAvailability(rows, now),
    db.select().from(operatingHours).where(inArray(operatingHours.facilityId, ids)),
    db.select().from(parkingRates).where(inArray(parkingRates.facilityId, ids)),
    db.select().from(facilityVehicleTypes).where(and(inArray(facilityVehicleTypes.facilityId, ids), eq(facilityVehicleTypes.vehicleType, "MOTORCYCLE"))),
  ]);
  return rows.map((r) => {
    const os = openStatus(hours.filter((h) => h.facilityId === r.id), now);
    return {
      ...r,
      distanceMeters: null,
      open: os.open,
      openLabel: os.label,
      startingPriceCents: startingPrice(rates.filter((x) => x.facilityId === r.id)),
      acceptsMotorcycles: motos.some((m) => m.facilityId === r.id),
      availability: live.get(r.id)!,
    };
  });
}
