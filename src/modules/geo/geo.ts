/** Geo helpers (pure). */
export type LatLng = { lat: number; lng: number };

export function haversineMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function boundingBox(center: LatLng, radiusMeters: number) {
  const dLat = radiusMeters / 111_320;
  const dLng = radiusMeters / (111_320 * Math.cos((center.lat * Math.PI) / 180));
  return { minLat: center.lat - dLat, maxLat: center.lat + dLat, minLng: center.lng - dLng, maxLng: center.lng + dLng };
}

/**
 * Deterministic privacy fuzz (~150–300 m) for private listings, so the public map never
 * reveals the exact address before a booking. Same seed → same offset (no averaging attacks).
 */
export function fuzzLocation(point: LatLng, seed: string): LatLng {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const angle = ((h >>> 0) % 360) * (Math.PI / 180);
  const dist = 150 + ((h >>> 8) % 150);
  return {
    lat: point.lat + (dist * Math.cos(angle)) / 111_320,
    lng: point.lng + (dist * Math.sin(angle)) / (111_320 * Math.cos((point.lat * Math.PI) / 180)),
  };
}
