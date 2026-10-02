import type { CSSProperties } from "react";
import { FlaskConical, Layers, Navigation } from "lucide-react";

const d = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

/** Status pins nearby: text always states the availability (never color alone). */
const PINS = [
  { x: 118, y: 132, label: "48", fill: "#1f9d55", text: "#fff", delay: 900 },
  { x: 300, y: 92, label: "14", fill: "#e8a317", text: "#3b2a00", delay: 1100 },
  { x: 132, y: 300, label: "Lotado", fill: "#d63c3c", text: "#fff", delay: 1300 },
];

/**
 * Hero story, pure SVG + CSS (no client JS): a route draws itself through the city grid, nearby malls
 * drop their pins, and the destination answers with its availability. Reduced motion shows the end state.
 */
export function HeroRoute() {
  return (
    <figure className="relative mx-auto w-full max-w-[560px]" aria-label="Demonstração: a Vagou traça a rota até o shopping e mostra as vagas livres">
      <svg viewBox="0 0 560 460" className="h-auto w-full" aria-hidden>
        <defs>
          <clipPath id="hr-clip">
            <rect width="560" height="460" rx="28" />
          </clipPath>
          <pattern id="hr-stalls" width="10" height="22" patternUnits="userSpaceOnUse">
            <path d="M0 0v22" stroke="#5cb874" strokeOpacity=".45" strokeWidth="1.2" />
          </pattern>
          <linearGradient id="hr-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b1f16" stopOpacity="0" />
            <stop offset="1" stopColor="#0b1f16" stopOpacity=".55" />
          </linearGradient>
        </defs>
        <g clipPath="url(#hr-clip)">
          <rect width="560" height="460" fill="#163527" />
          {/* City blocks laid out like a plan */}
          {Array.from({ length: 6 }).map((_, row) =>
            Array.from({ length: 7 }).map((__, col) => {
              const x = 14 + col * 82;
              const y = 12 + row * 78;
              if (row === 1 && col === 5) return null; // the mall block is drawn separately
              return <rect key={`${row}-${col}`} x={x} y={y} width="64" height="58" rx="7" fill="#1b3f2f" />;
            }),
          )}
          {/* Avenue */}
          <path d="M-20 392 C 140 360, 250 420, 380 352 S 560 300, 600 312" stroke="#22503b" strokeWidth="22" fill="none" />
          {/* Destination mall: a block with its parking stalls */}
          <g className="fade-in-late" style={d(1500)}>
            <rect x="424" y="90" width="64" height="58" rx="7" fill="#1f4a37" stroke="#5cb874" strokeOpacity=".6" />
            <rect x="430" y="98" width="52" height="22" rx="2" fill="url(#hr-stalls)" />
            <rect x="430" y="120" width="52" height="22" rx="2" fill="url(#hr-stalls)" />
          </g>
          {/* Route glow + route */}
          <path
            d="M87 444 V 314 H 251 V 158 H 415 V 119 H 424"
            stroke="#5cb874"
            strokeOpacity=".18"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            pathLength={1}
            className="route-draw"
            style={d(200)}
          />
          <path
            d="M87 444 V 314 H 251 V 158 H 415 V 119 H 424"
            stroke="#5cb874"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            pathLength={1}
            className="route-draw"
            style={d(200)}
          />
          {/* Origin: you */}
          <circle cx="87" cy="444" r="16" fill="#5cb874" className="beacon" style={d(0)} />
          <circle cx="87" cy="444" r="8" fill="#fff" stroke="#5cb874" strokeWidth="4" />
          {/* Nearby pins */}
          {PINS.map((p) => (
            <g key={p.label} className="pin-in" style={d(p.delay)}>
              <g transform={`translate(${p.x} ${p.y})`}>
                <rect x={-p.label.length * 5 - 16} y="-42" width={p.label.length * 10 + 32} height="28" rx="14" fill={p.fill} stroke="#163527" strokeWidth="3" />
                <text x="0" y="-23" textAnchor="middle" fontFamily="var(--font-outfit), sans-serif" fontWeight="700" fontSize="14" fill={p.text}>
                  {p.label}
                </text>
                <path d="M-6 -15 L0 -6 L6 -15Z" fill={p.fill} />
              </g>
            </g>
          ))}
          {/* Destination pin */}
          <circle cx="456" cy="119" r="26" fill="#1f9d55" className="beacon" style={d(1900)} />
          <g className="pin-in" style={d(1700)}>
            <g transform="translate(456 112)">
              <rect x="-38" y="-50" width="76" height="34" rx="17" fill="#1f9d55" stroke="#fff" strokeWidth="2.5" />
              <text x="0" y="-27" textAnchor="middle" fontFamily="var(--font-outfit), sans-serif" fontWeight="800" fontSize="17" fill="#fff">
                127
              </text>
              <path d="M-7 -17 L0 -7 L7 -17Z" fill="#fff" />
            </g>
          </g>
          <rect width="560" height="460" fill="url(#hr-fade)" />
        </g>
      </svg>

      {/* The answer — what the driver needs, in three readings */}
      <figcaption
        className="fade-in-late relative mx-3 -mt-20 rounded-lg border border-white/10 bg-ink-950/85 p-4 text-white shadow-lg backdrop-blur-sm sm:absolute sm:right-5 sm:bottom-5 sm:mx-0 sm:mt-0 sm:w-[300px]"
        style={d(2100)}
      >
        <p className="flex items-center justify-between text-xs font-semibold tracking-[0.14em] text-green-300 uppercase">
          Vagou encontrou
          <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-300/60 px-2 py-0.5 text-[10px] tracking-normal text-amber-200 normal-case">
            <FlaskConical className="size-3" aria-hidden /> demonstração
          </span>
        </p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-5xl leading-none font-bold tracking-[-0.04em]">
            <span className="count-up inline-block min-w-[3ch]" data-play style={{ "--to": 127, ...d(2200) } as CSSProperties} aria-hidden />
            <span className="sr-only">127</span>
          </span>
          <span className="text-white/75">vagas livres</span>
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-sm">
          <div>
            <dt className="sr-only">Melhor piso agora</dt>
            <dd className="flex items-center gap-1.5 font-semibold">
              <Layers className="size-4 text-green-300" aria-hidden /> G2
            </dd>
            <dd className="text-xs text-white/60">melhor piso agora</dd>
          </div>
          <div>
            <dt className="sr-only">Distância</dt>
            <dd className="flex items-center gap-1.5 font-semibold">
              <Navigation className="size-4 text-green-300" aria-hidden /> 350 m
            </dd>
            <dd className="text-xs text-white/60">do destino</dd>
          </div>
        </dl>
      </figcaption>
    </figure>
  );
}
