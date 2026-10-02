/**
 * Standard parking-floor geometry (relative 0..1 coordinates).
 * Shared by the demo analyzer and the sample floor-plan generator so the demo analysis lines
 * up with the sample plan. Real analyzers will return arbitrary geometry in the same shape.
 */
export type Rect = { x: number; y: number; w: number; h: number; rotation?: number };
export type LayoutSpace = Rect & { sector: string; index: number; type: "COMMON" | "PCD" | "EV" | "MOTO" | "VIP" };
export type LayoutElement = Rect & { kind: "ENTRANCE" | "EXIT" | "CIRCULATION" | "RAMP" | "ELEVATOR"; label: string };

export const STANDARD_SECTORS = [
  { name: "A", color: "#3B82F6" },
  { name: "B", color: "#8B5CF6" },
  { name: "C", color: "#0EA5E9" },
  { name: "D", color: "#F97316" },
];

// Rows: [top y, facing]. Each row has 10 stalls per half (left/right of the central walkway).
const ROWS = [0.05, 0.29, 0.39, 0.63, 0.73];
const STALL_H = 0.095;
const STALL_W = 0.04;
const LEFT_X0 = 0.06;
const RIGHT_X0 = 0.54;
const PER_HALF = 10;

export function standardLayout(): { spaces: LayoutSpace[]; elements: LayoutElement[] } {
  const counters: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  const spaces: LayoutSpace[] = [];
  ROWS.forEach((y, rowIdx) => {
    for (const half of ["L", "R"] as const) {
      const upper = rowIdx <= 2;
      const sector = upper ? (half === "L" ? "A" : "B") : half === "L" ? "C" : "D";
      for (let i = 0; i < PER_HALF; i++) {
        const x = (half === "L" ? LEFT_X0 : RIGHT_X0) + i * STALL_W;
        const index = ++counters[sector];
        let type: LayoutSpace["type"] = "COMMON";
        if (rowIdx === 4 && half === "L" && i < 3) type = "PCD";
        else if (sector === "D" && rowIdx === 4 && i >= 6) type = "EV";
        else if (sector === "A" && rowIdx === 0 && i < 2) type = "VIP";
        else if (sector === "B" && rowIdx === 0 && i >= 8) type = "MOTO";
        spaces.push({ x: x + 0.003, y: y + 0.004, w: STALL_W - 0.006, h: STALL_H - 0.008, sector, index, type });
      }
    }
  });
  const elements: LayoutElement[] = [
    { kind: "CIRCULATION", label: "Corredor norte", x: 0.04, y: 0.155, w: 0.92, h: 0.125 },
    { kind: "CIRCULATION", label: "Corredor central", x: 0.04, y: 0.495, w: 0.92, h: 0.125 },
    { kind: "CIRCULATION", label: "Corredor sul", x: 0.04, y: 0.835, w: 0.92, h: 0.11 },
    { kind: "CIRCULATION", label: "Passarela de pedestres", x: 0.465, y: 0.05, w: 0.07, h: 0.78 },
    { kind: "ENTRANCE", label: "Entrada principal", x: 0.07, y: 0.945, w: 0.12, h: 0.035 },
    { kind: "EXIT", label: "Saída", x: 0.81, y: 0.945, w: 0.12, h: 0.035 },
    { kind: "RAMP", label: "Rampa de acesso", x: 0.955, y: 0.36, w: 0.03, h: 0.2 },
    { kind: "ELEVATOR", label: "Elevadores", x: 0.475, y: 0.012, w: 0.05, h: 0.035 },
  ];
  return { spaces, elements };
}

export function spaceCode(sector: string, index: number, floorDigit: number) {
  return `${sector}-${floorDigit}${String(index).padStart(2, "0")}`;
}
