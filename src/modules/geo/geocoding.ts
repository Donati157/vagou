/**
 * Geocoding adapter.
 * V1 (SIMULADA): LocalGazetteerGeocoder resolves well-known São Paulo neighborhoods and
 * landmarks offline. PREPARADA: a Google/Mapbox/Nominatim implementation can satisfy the same
 * interface once credentials exist.
 */
import type { LatLng } from "./geo";

export type Place = LatLng & { name: string; region: string };

export interface Geocoder {
  search(query: string): Place[];
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const SAO_PAULO_PLACES: Place[] = [
  { name: "Avenida Paulista", region: "Bela Vista", lat: -23.5614, lng: -46.6559 },
  { name: "MASP", region: "Avenida Paulista", lat: -23.5614, lng: -46.6558 },
  { name: "Faria Lima", region: "Itaim Bibi", lat: -23.5868, lng: -46.6823 },
  { name: "Itaim Bibi", region: "Zona Oeste", lat: -23.5846, lng: -46.6766 },
  { name: "Pinheiros", region: "Zona Oeste", lat: -23.5672, lng: -46.6919 },
  { name: "Largo da Batata", region: "Pinheiros", lat: -23.5666, lng: -46.6936 },
  { name: "Vila Madalena", region: "Zona Oeste", lat: -23.5535, lng: -46.6911 },
  { name: "Jardins", region: "Zona Oeste", lat: -23.5671, lng: -46.6646 },
  { name: "Oscar Freire", region: "Jardins", lat: -23.5647, lng: -46.6705 },
  { name: "Moema", region: "Zona Sul", lat: -23.6011, lng: -46.6649 },
  { name: "Parque Ibirapuera", region: "Moema", lat: -23.5874, lng: -46.6576 },
  { name: "Vila Olímpia", region: "Zona Sul", lat: -23.5955, lng: -46.6866 },
  { name: "Brooklin", region: "Zona Sul", lat: -23.6125, lng: -46.6942 },
  { name: "Berrini", region: "Brooklin", lat: -23.6064, lng: -46.6956 },
  { name: "Aeroporto de Congonhas", region: "Campo Belo", lat: -23.6261, lng: -46.6564 },
  { name: "Centro", region: "Sé", lat: -23.5489, lng: -46.6388 },
  { name: "Praça da Sé", region: "Centro", lat: -23.5503, lng: -46.6339 },
  { name: "República", region: "Centro", lat: -23.5432, lng: -46.6425 },
  { name: "Consolação", region: "Centro", lat: -23.5531, lng: -46.6597 },
  { name: "Higienópolis", region: "Centro", lat: -23.5445, lng: -46.6566 },
  { name: "Allianz Parque", region: "Perdizes", lat: -23.5275, lng: -46.6783 },
  { name: "Perdizes", region: "Zona Oeste", lat: -23.5352, lng: -46.6783 },
  { name: "Barra Funda", region: "Zona Oeste", lat: -23.5256, lng: -46.6668 },
  { name: "Tatuapé", region: "Zona Leste", lat: -23.5401, lng: -46.5762 },
  { name: "Anália Franco", region: "Tatuapé", lat: -23.5623, lng: -46.5594 },
  { name: "Mooca", region: "Zona Leste", lat: -23.5569, lng: -46.5996 },
  { name: "Santana", region: "Zona Norte", lat: -23.5022, lng: -46.6252 },
  { name: "Morumbi", region: "Zona Sul", lat: -23.6003, lng: -46.7206 },
  { name: "Liberdade", region: "Centro", lat: -23.5587, lng: -46.6352 },
  { name: "Vila Mariana", region: "Zona Sul", lat: -23.5891, lng: -46.6343 },
  { name: "Paraíso", region: "Zona Sul", lat: -23.5755, lng: -46.6407 },
  { name: "Butantã", region: "Zona Oeste", lat: -23.5717, lng: -46.7083 },
  { name: "Lapa", region: "Zona Oeste", lat: -23.5225, lng: -46.7035 },
];

export const SAO_PAULO_CENTER: Place = { name: "São Paulo", region: "SP", lat: -23.5614, lng: -46.6559 };

class LocalGazetteerGeocoder implements Geocoder {
  search(query: string): Place[] {
    const q = normalize(query);
    if (!q) return [];
    const scored = SAO_PAULO_PLACES.map((p) => {
      const name = normalize(p.name);
      const region = normalize(p.region);
      let score = 0;
      if (name === q) score = 100;
      else if (name.startsWith(q)) score = 80;
      else if (name.includes(q)) score = 60;
      else if (q.split(" ").every((t) => name.includes(t) || region.includes(t))) score = 40;
      else if (region.includes(q)) score = 30;
      return { p, score };
    }).filter((x) => x.score > 0);
    return scored.sort((a, b) => b.score - a.score).map((x) => x.p);
  }
}

export const geocoder: Geocoder = new LocalGazetteerGeocoder();
