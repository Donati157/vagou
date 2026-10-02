"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Circle, MapContainer, Marker, TileLayer } from "react-leaflet";

/** Small static map. Private listings show only an approximate area, never the exact point. */
export default function LocationMap({ lat, lng, approximate }: { lat: number; lng: number; approximate: boolean }) {
  const icon = L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<div style="position:absolute;transform:translate(-50%,-100%)"><svg width="34" height="42" viewBox="0 0 48 60"><path d="M24 2C12.4 2 3 11.2 3 22.6 3 37.4 21.2 51.4 22.6 52.4a2.3 2.3 0 0 0 2.8 0C26.8 51.4 45 37.4 45 22.6 45 11.2 35.6 2 24 2Z" fill="#5CB874"/><circle cx="24" cy="22.5" r="10" fill="#fff"/></svg></div>`,
  });
  return (
    <MapContainer center={[lat, lng]} zoom={15} scrollWheelZoom={false} dragging={!L.Browser.mobile} className="h-full w-full">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {approximate ? <Circle center={[lat, lng]} radius={300} pathOptions={{ color: "#17382A", weight: 1.5, fillColor: "#5CB874", fillOpacity: 0.18 }} /> : <Marker position={[lat, lng]} icon={icon} />}
    </MapContainer>
  );
}
