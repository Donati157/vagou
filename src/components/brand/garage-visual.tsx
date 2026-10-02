import type { CSSProperties } from "react";

const COLS = 9;
const ROWS = [86, 176, 318, 408, 550, 640];
const AISLES = [266, 498];
const STALL_W = 46;
const STALL_H = 74;
const X0 = 46;
const GAP = 54;
const TARGET = { row: 3, col: 6 };

// Deterministic base occupancy; a few stalls change status very slowly (cars arriving / leaving).
function base(row: number, col: number) {
  return (row * 5 + col * 7) % 10 < 6 ? "occupied" : "free";
}
function cycles(row: number, col: number) {
  return (row * 3 + col * 5) % 7 === 0;
}

/**
 * Decorative garage for the auth panel: a floor plan seen from above where availability changes
 * slowly, a route arrives at a free space and the Vagou pin marks it. Colors keep their meaning
 * (green = livre, red = ocupada). Reduced motion freezes it in its final state.
 */
export function GarageVisual() {
  return (
    <svg viewBox="0 0 600 760" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="gv-vignette" cx="62%" cy="38%" r="75%">
          <stop offset="0" stopColor="#17382a" stopOpacity="0" />
          <stop offset="1" stopColor="#0b1f16" stopOpacity=".9" />
        </radialGradient>
      </defs>
      <rect width="600" height="760" fill="#17382a" />
      {/* Aisle markings */}
      {AISLES.map((y) => (
        <path key={y} d={`M0 ${y} H 600`} stroke="#5cb874" strokeOpacity=".22" strokeWidth="2" strokeDasharray="18 14" />
      ))}
      {/* Stalls: outlines (paint) + occupancy */}
      {ROWS.map((y, ri) =>
        Array.from({ length: COLS }).map((_, ci) => {
          const x = X0 + ci * GAP;
          const isTarget = ri === TARGET.row && ci === TARGET.col;
          const status = isTarget ? "free" : base(ri, ci);
          const anim = !isTarget && cycles(ri, ci);
          const style = { "--dur": `${22 + ((ri * 7 + ci * 11) % 9) * 3}s`, "--delay": `-${(ri * 13 + ci * 17) % 20}s` } as CSSProperties;
          return (
            <g key={`${ri}-${ci}`}>
              <rect x={x} y={y} width={STALL_W} height={STALL_H} rx="4" fill="none" stroke="#ffffff" strokeOpacity=".09" strokeWidth="1.5" />
              <rect x={x + 5} y={y + 5} width={STALL_W - 10} height={STALL_H - 10} rx="5" fill="#1f9d55" fillOpacity={status === "free" || anim ? 0.55 : 0} />
              {(status === "occupied" || anim) && (
                <g className={anim ? "stall-cycle" : undefined} style={anim ? style : undefined} opacity={anim ? undefined : 1}>
                  <rect x={x + 5} y={y + 5} width={STALL_W - 10} height={STALL_H - 10} rx="5" fill="#d63c3c" fillOpacity=".55" />
                  <rect x={x + 13} y={y + 16} width={STALL_W - 26} height={STALL_H - 32} rx="6" fill="#ffffff" fillOpacity=".22" />
                </g>
              )}
            </g>
          );
        }),
      )}
      {/* Route to the free space */}
      <path
        d={`M-10 ${AISLES[1]} H ${X0 + TARGET.col * GAP + STALL_W / 2} V ${ROWS[TARGET.row] + STALL_H / 2}`}
        stroke="#5cb874"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        pathLength={1}
        className="route-draw"
        style={{ "--delay": "400ms" } as CSSProperties}
      />
      {/* Beacon + pin */}
      <circle cx={X0 + TARGET.col * GAP + STALL_W / 2} cy={ROWS[TARGET.row] + STALL_H / 2} r="30" fill="#5cb874" className="beacon" style={{ "--delay": "1900ms" } as CSSProperties} />
      <g className="pin-in" style={{ "--delay": "1700ms" } as CSSProperties}>
        <g transform={`translate(${X0 + TARGET.col * GAP + STALL_W / 2 - 24} ${ROWS[TARGET.row] - 46})`}>
          <path d="M24 2C12.4 2 3 11.2 3 22.6 3 37.4 21.2 51.4 22.6 52.4a2.3 2.3 0 0 0 2.8 0C26.8 51.4 45 37.4 45 22.6 45 11.2 35.6 2 24 2Z" fill="#5cb874" />
          <circle cx="24" cy="22.5" r="13" fill="#fff" />
          <path d="M16.2 27.6v-4.2l2.1-5.7a2.4 2.4 0 0 1 2.3-1.6h6.8a2.4 2.4 0 0 1 2.3 1.6l2.1 5.7v4.2a1 1 0 0 1-1 1h-1.3a1 1 0 0 1-1-1v-1H19.5v1a1 1 0 0 1-1 1h-1.3a1 1 0 0 1-1-1Z" fill="#17382a" />
        </g>
      </g>
      <rect width="600" height="760" fill="url(#gv-vignette)" />
    </svg>
  );
}
