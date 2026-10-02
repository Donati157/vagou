/** Decorative city map with live-looking pins (pure SVG, no map tiles needed). */
export function HeroMap() {
  const pins = [
    { x: 142, y: 120, p: "127", c: "#2f8048", t: "#fff" },
    { x: 300, y: 84, p: "14", c: "#e8a317", t: "#3b2a00" },
    { x: 382, y: 214, p: "Lotado", c: "#d63c3c", t: "#fff" },
    { x: 214, y: 268, p: "48", c: "#5CB874", t: "#0c2219" },
    { x: 452, y: 118, p: "63", c: "#2f8048", t: "#fff" },
  ];
  return (
    <svg viewBox="0 0 560 380" className="h-auto w-full" aria-hidden>
      <defs>
        <pattern id="blocks" width="56" height="56" patternUnits="userSpaceOnUse">
          <rect width="56" height="56" fill="#1f4a37" />
          <rect x="6" y="6" width="44" height="44" rx="6" fill="#23523d" />
        </pattern>
      </defs>
      <rect width="560" height="380" rx="24" fill="url(#blocks)" />
      <path d="M-10 300 C 120 250, 200 330, 330 250 S 520 160, 580 190" stroke="#2f6b51" strokeWidth="26" fill="none" />
      <path d="M90 -10 L 160 400" stroke="#2a5d46" strokeWidth="18" />
      <path d="M-10 150 L 580 120" stroke="#2a5d46" strokeWidth="14" />
      <path d="M380 -10 L 340 400" stroke="#2a5d46" strokeWidth="14" />
      <path d="M150 120 C 220 140, 260 200, 214 268" stroke="#5CB874" strokeWidth="4" strokeDasharray="2 10" strokeLinecap="round" fill="none" />
      <circle cx="150" cy="120" r="9" fill="#fff" stroke="#5CB874" strokeWidth="4" />
      {pins.map((pin, i) => (
        <g key={i} transform={`translate(${pin.x} ${pin.y})`}>
          <rect x="-34" y="-44" width="68" height="28" rx="14" fill={pin.c} stroke="#fff" strokeWidth="2" />
          <text x="0" y="-25" textAnchor="middle" fontFamily="var(--font-outfit), sans-serif" fontWeight="700" fontSize="14" fill={pin.t}>
            {pin.p}
          </text>
          <path d="M-6 -17 L0 -8 L6 -17Z" fill={pin.c} />
        </g>
      ))}
    </svg>
  );
}
