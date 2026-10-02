"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { AVAILABILITY_STYLE } from "@/modules/occupancy/components/availability-pill";
import type { FacilityResult } from "@/modules/facilities/public";

type Props = {
  results: FacilityResult[];
  center: { lat: number; lng: number };
  hasCenter: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
};

const DESTINATION_ICON = L.divIcon({
  className: "",
  iconSize: [0, 0],
  html: `<div style="position:absolute;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:999px;background:#17382A;border:4px solid #fff;box-shadow:0 0 0 6px rgba(23,56,42,.25),0 2px 8px rgba(11,31,22,.35)"></div>`,
});

// Pins drop in once, in sequence, the first time a facility appears (not on every hover/selection,
// because Leaflet replaces the icon element whenever it changes).
const SHOWN = new Set<string>();

/** Pin = facility, labeled with live free spaces ("127", "Lotado", "?"). */
function pinIcon(r: FacilityResult, state: "default" | "hover" | "selected", index: number) {
  const first = !SHOWN.has(r.id);
  SHOWN.add(r.id);
  const a = r.availability;
  const closed = !r.open;
  const st = AVAILABILITY_STYLE[closed ? "UNKNOWN" : a.state];
  const label = closed ? "Fechado" : a.state === "UNKNOWN" ? "?" : a.state === "FULL" ? "Lotado" : String(a.available);
  const bg = state === "selected" ? "#17382A" : st.pin;
  const fg = state === "selected" ? "#ffffff" : st.pinFg;
  const scale = state === "selected" ? 1.18 : state === "hover" ? 1.1 : 1;
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<div role="presentation" style="position:absolute;left:0;top:0;transform:translate(-50%,-100%) scale(${scale});transform-origin:50% 100%;transition:transform var(--dur-fast) var(--ease-pin)"><div class="${first ? "pin-in" : ""}" style="--delay:${Math.min(index, 12) * 45}ms">
      <div style="display:flex;align-items:center;gap:5px;background:${bg};color:${fg};font:700 13px var(--font-outfit),sans-serif;padding:5px 10px 5px 6px;border-radius:999px;box-shadow:${state === "selected" ? "0 0 0 4px rgba(92,184,116,.45)," : ""}0 3px 10px rgba(12,34,25,.3);white-space:nowrap;border:2px solid #fff">
        <span style="display:grid;place-items:center;width:18px;height:18px;border-radius:5px;background:rgba(255,255,255,.22);font-size:11px">P</span>${label}
      </div>
      <div style="width:10px;height:10px;background:${bg};border-right:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(45deg);margin:-7px auto 0"></div>
    </div></div>`,
  });
}

function FitBounds({ results, center, hasCenter }: { results: FacilityResult[]; center: { lat: number; lng: number }; hasCenter: boolean }) {
  const map = useMap();
  const key = results.map((r) => r.id).join(",");
  useEffect(() => {
    const pts = results.map((r) => [r.lat, r.lng] as [number, number]);
    if (hasCenter) pts.push([center.lat, center.lng]);
    const mobile = map.getSize().x < 1024;
    if (pts.length === 0) map.setView([center.lat, center.lng], 14);
    else if (pts.length === 1) map.setView(pts[0], 15);
    else map.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [40, 40], paddingBottomRight: [40, mobile ? 280 : 40], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

function PanTo({ result }: { result: FacilityResult | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (result && !map.getBounds().pad(-0.2).contains([result.lat, result.lng])) map.panTo([result.lat, result.lng]);
  }, [result, map]);
  return null;
}

export default function ResultsMap({ results, center, hasCenter, selectedId, hoveredId, onSelect }: Props) {
  const selected = useMemo(() => results.find((r) => r.id === selectedId), [results, selectedId]);
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={14} scrollWheelZoom className="h-full w-full" zoomControl={false}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds results={results} center={center} hasCenter={hasCenter} />
      <PanTo result={selected} />
      {hasCenter && <Marker position={[center.lat, center.lng]} icon={DESTINATION_ICON} interactive={false} keyboard={false} />}
      {results.map((r, i) => (
        <Marker
          key={r.id}
          position={[r.lat, r.lng]}
          icon={pinIcon(r, r.id === selectedId ? "selected" : r.id === hoveredId ? "hover" : "default", i)}
          zIndexOffset={r.id === selectedId ? 1000 : r.id === hoveredId ? 500 : 0}
          title={`${r.name} — ${r.availability.state === "UNKNOWN" ? "sem dados" : r.availability.state === "FULL" ? "lotado" : `${r.availability.available} vagas livres`}`}
          alt={r.name}
          eventHandlers={{ click: () => onSelect(r.id) }}
        />
      ))}
    </MapContainer>
  );
}
