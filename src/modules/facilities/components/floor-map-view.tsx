import { SPACE_STATUS_STYLE } from "@/components/ui/space-status";
import type { SpaceStatus } from "@/lib/labels";

type Space = { id: string; code: string; type: string; status: SpaceStatus; x: number; y: number; w: number; h: number; rotation: number };
type PlanElement = { id: string; kind: string; label: string | null; x: number; y: number; w: number; h: number };

/**
 * Read-only digital floor map: plan image + spaces colored by status, each with a pattern
 * and a <title> so status never depends on color alone.
 */
export function FloorMapView({ imageUrl, ratio, spaces, elements, highlightStatus, route = [] }: { imageUrl: string | null; ratio: number; spaces: Space[]; elements: PlanElement[]; highlightStatus?: SpaceStatus | null; route?: Array<[number, number]> }) {
  const H = 1000 * ratio; // uniform scale keeps rotated spaces undistorted
  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-asphalt-100 bg-surface" style={{ aspectRatio: `${1 / ratio}` }}>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-fill opacity-70" />
      )}
      <svg viewBox={`0 0 1000 ${1000 * ratio}`} className="absolute inset-0 h-full w-full" role="img" aria-label="Mapa das vagas do piso">
        <defs>
          <pattern id="fm-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="3" height="8" fill="rgba(0,0,0,.35)" />
          </pattern>
          <pattern id="fm-dots" width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="3.5" cy="3.5" r="1.4" fill="rgba(0,0,0,.35)" />
          </pattern>
        </defs>
        {elements
          .filter((e) => e.kind === "ENTRANCE" || e.kind === "EXIT")
          .map((e) => (
            <rect key={e.id} x={e.x * 1000} y={e.y * H} width={e.w * 1000} height={e.h * H} fill={e.kind === "ENTRANCE" ? "#2f8048" : "#d63c3c"}>
              <title>{e.label ?? (e.kind === "ENTRANCE" ? "Entrada" : "Saída")}</title>
            </rect>
          ))}
        {route.length > 1 && (
          <polyline points={route.map(([x, y]) => `${x * 1000},${y * H}`).join(" ")} fill="none" stroke="#17382A" strokeWidth="5" strokeDasharray="12 8" strokeLinecap="round" strokeLinejoin="round">
            <title>Rota ilustrativa até o setor recomendado</title>
          </polyline>
        )}
        {spaces.map((s) => {
          const st = SPACE_STATUS_STYLE[s.status];
          const dim = highlightStatus && highlightStatus !== s.status;
          const cx = (s.x + s.w / 2) * 1000;
          const cy = (s.y + s.h / 2) * H;
          return (
            <g key={s.id} transform={s.rotation ? `rotate(${s.rotation} ${cx} ${cy})` : undefined} opacity={dim ? 0.25 : 1}>
              <title>{`${s.code} — ${s.status === "AVAILABLE" ? "livre" : s.status === "OCCUPIED" ? "ocupada" : s.status === "RESERVED" ? "reservada pelo shopping" : "indisponível"}`}</title>
              <rect x={s.x * 1000} y={s.y * H} width={s.w * 1000} height={s.h * H} rx="3" fill={st.fill} stroke="#fff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              {s.status === "UNAVAILABLE" && <rect x={s.x * 1000} y={s.y * H} width={s.w * 1000} height={s.h * H} fill="url(#fm-hatch)" />}
              {s.status === "RESERVED" && <rect x={s.x * 1000} y={s.y * H} width={s.w * 1000} height={s.h * H} fill="url(#fm-dots)" />}
              {s.status === "OCCUPIED" && <rect x={s.x * 1000 + s.w * 250} y={s.y * H + s.h * H * 0.2} width={s.w * 500} height={s.h * H * 0.6} rx="3" fill="rgba(255,255,255,.45)" />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function SpaceLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-asphalt-700" aria-label="Legenda">
      {(["AVAILABLE", "OCCUPIED", "RESERVED", "UNAVAILABLE"] as const).map((k) => {
        const st = SPACE_STATUS_STYLE[k];
        return (
          <li key={k} className="flex items-center gap-2">
            <span className={`relative inline-block size-4 rounded-sm ${st.pattern}`} style={{ background: st.fill }} aria-hidden />
            <st.Icon className={`size-4 ${st.text}`} aria-hidden />
            {k === "AVAILABLE" ? "Livre" : k === "OCCUPIED" ? "Ocupada" : k === "RESERVED" ? "Reservada pelo shopping" : "Indisponível"}
          </li>
        );
      })}
    </ul>
  );
}
