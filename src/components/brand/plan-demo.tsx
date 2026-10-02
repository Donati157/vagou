import type { CSSProperties } from "react";

type S = "free" | "occupied" | "unavailable";

// Deterministic, illustrative occupancy (no randomness → identical server/client render).
function statusAt(row: number, col: number): S {
  const k = (row * 7 + col * 3) % 11;
  if (k === 4) return "unavailable";
  return k % 3 === 0 ? "free" : "occupied";
}

const FILL: Record<S, string> = { free: "#1f9d55", occupied: "#d63c3c", unavailable: "#8c9893" };
// Two double-loaded aisles: row, aisle, row | row, aisle, row.
const ROWS = [{ y: 30 }, { y: 130 }, { y: 186 }, { y: 286 }];
const AISLES = [106, 262];
const COLS = 14;
const TARGET = { row: 2, col: 9 }; // the recommended free space

/**
 * Illustrative floor plan (marketing): stalls in rows facing aisles, status with color + pattern + car
 * glyph, PcD stalls with a symbol, and the route from the entrance to the recommended free space.
 */
export function PlanDemo() {
  return (
    <svg viewBox="0 0 640 360" className="h-auto w-full" role="img" aria-label="Exemplo ilustrativo de planta de piso com vagas livres em verde, ocupadas em vermelho e indisponíveis em cinza hachurado">
      <defs>
        <pattern id="pd-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="2.4" height="6" fill="rgba(0,0,0,.35)" />
        </pattern>
      </defs>
      {/* Slab + aisles */}
      <rect x="8" y="8" width="624" height="344" rx="18" className="fill-surface stroke-asphalt-200" strokeWidth="1.5" />
      <path d={AISLES.map((y) => `M30 ${y} H 610`).join(" ")} className="stroke-asphalt-300" strokeWidth="1.2" strokeDasharray="10 8" />
      {/* Entrance */}
      <g>
        <rect x="0" y="244" width="16" height="36" rx="4" fill="#1f9d55" />
        <text x="22" y="240" fontSize="11" fontWeight="600" className="fill-asphalt-500" fontFamily="var(--font-inter), sans-serif">
          Entrada
        </text>
      </g>
      {/* Stalls */}
      {ROWS.map((r, ri) => (
        <g key={ri} className="reveal" style={{ animationRangeStart: `entry ${ri * 8}%` } as CSSProperties}>
          {Array.from({ length: COLS }).map((_, ci) => {
            const x = 56 + ci * 39;
            const s: S = ri === TARGET.row && ci === TARGET.col ? "free" : statusAt(ri, ci);
            const pcd = ri === 0 && ci < 2;
            return (
              <g key={ci}>
                <rect x={x} y={r.y} width="33" height="52" rx="4" fill={FILL[s]} />
                {s === "unavailable" && <rect x={x} y={r.y} width="33" height="52" rx="4" fill="url(#pd-hatch)" />}
                {s === "occupied" && !pcd && <rect x={x + 8} y={r.y + 11} width="17" height="30" rx="5" fill="rgba(255,255,255,.42)" />}
                {pcd && (
                  <text x={x + 16.5} y={r.y + 32} textAnchor="middle" fontSize="16" fill="#fff" aria-hidden>
                    {"\u267F\uFE0E"}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      ))}
      {/* Route from the entrance to the recommended space */}
      <path
        d={`M16 ${AISLES[1]} H ${56 + TARGET.col * 39 + 16.5} V ${ROWS[TARGET.row].y + 40}`}
        fill="none"
        stroke="#17382a"
        className="reveal-draw dark:stroke-green-300"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
      <circle cx={56 + TARGET.col * 39 + 16.5} cy={ROWS[TARGET.row].y + 26} r="22" fill="#1f9d55" className="beacon" />
      <rect x={56 + TARGET.col * 39 - 3} y={ROWS[TARGET.row].y - 3} width="39" height="58" rx="6" fill="none" stroke="#5cb874" strokeWidth="3" />
    </svg>
  );
}
