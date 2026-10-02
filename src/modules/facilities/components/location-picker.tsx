"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

const icon = L.divIcon({
  className: "",
  iconSize: [0, 0],
  html: `<div style="position:absolute;transform:translate(-50%,-100%)"><svg width="36" height="45" viewBox="0 0 48 60"><path d="M24 2C12.4 2 3 11.2 3 22.6 3 37.4 21.2 51.4 22.6 52.4a2.3 2.3 0 0 0 2.8 0C26.8 51.4 45 37.4 45 22.6 45 11.2 35.6 2 24 2Z" fill="#17382A"/><circle cx="24" cy="22.5" r="9" fill="#5CB874"/></svg></div>`,
});

function Clicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, Math.max(map.getZoom(), 15));
  }, [center, map]);
  return null;
}

/** Click-to-place map used in the shopping registration form to set the facility's location. */
export default function LocationPicker({ value, center, onPick }: { value: { lat: number; lng: number } | null; center: [number, number]; onPick: (lat: number, lng: number) => void }) {
  return (
    <MapContainer center={center} zoom={14} className="h-full w-full" scrollWheelZoom>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Clicker onPick={onPick} />
      <Recenter center={center} />
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={icon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = (e.target as L.Marker).getLatLng();
              onPick(p.lat, p.lng);
            },
          }}
        />
      )}
    </MapContainer>
  );
}
