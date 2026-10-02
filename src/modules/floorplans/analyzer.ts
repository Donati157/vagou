import "server-only";
import { standardLayout, STANDARD_SECTORS, type LayoutElement } from "./layout";

/**
 * ParkingPlanAnalyzer abstraction.
 *
 * V1 uses MockParkingPlanAnalyzer (SIMULADA): it does NOT look at the pixels; it proposes a
 * coherent standard layout over the uploaded plan so the review/editor/publish flow can be
 * demonstrated. An AIParkingPlanAnalyzer (computer vision) can implement this interface later
 * without touching the rest of the product.
 */
export type PlanInput = { bytes: Buffer; mime: string; width: number | null; height: number | null; floorName: string };

export type PlanAnalysis = {
  floors: Array<{ name: string }>;
  sectors: Array<{ name: string; color: string }>;
  parkingSpaces: Array<{ code: string; sector: string; type: "COMMON" | "PCD" | "EV" | "MOTO" | "VIP"; x: number; y: number; w: number; h: number; rotation: number; confidence: number }>;
  entrances: LayoutElement[];
  exits: LayoutElement[];
  circulationAreas: LayoutElement[];
  otherElements: LayoutElement[];
  confidence: number;
};

export interface ParkingPlanAnalyzer {
  readonly name: string;
  readonly isDemo: boolean;
  analyzeParkingPlan(input: PlanInput): Promise<PlanAnalysis>;
}

export class MockParkingPlanAnalyzer implements ParkingPlanAnalyzer {
  readonly name = "mock-v1";
  readonly isDemo = true;

  async analyzeParkingPlan(input: PlanInput): Promise<PlanAnalysis> {
    // Simulates processing time so the UI's "processing" state is exercised.
    await new Promise((r) => setTimeout(r, 1200));
    if (input.width !== null && input.height !== null && (input.width < 200 || input.height < 150)) {
      throw new Error("PLAN_TOO_SMALL");
    }
    const digit = Number(input.floorName.replace(/\D/g, "").slice(-1) || "1") % 10;
    const { spaces, elements } = standardLayout();
    // Deterministic pseudo-confidence per space (demo only).
    const conf = (i: number) => Math.round((0.78 + ((i * 37) % 21) / 100) * 100) / 100;
    return {
      floors: [{ name: input.floorName }],
      sectors: STANDARD_SECTORS,
      parkingSpaces: spaces.map((s, i) => ({
        code: `${s.sector}-${digit}${String(s.index).padStart(2, "0")}`,
        sector: s.sector,
        type: s.type,
        x: s.x,
        y: s.y,
        w: s.w,
        h: s.h,
        rotation: 0,
        confidence: conf(i),
      })),
      entrances: elements.filter((e) => e.kind === "ENTRANCE"),
      exits: elements.filter((e) => e.kind === "EXIT"),
      circulationAreas: elements.filter((e) => e.kind === "CIRCULATION"),
      otherElements: elements.filter((e) => e.kind === "RAMP" || e.kind === "ELEVATOR"),
      confidence: 0.87,
    };
  }
}

export function getPlanAnalyzer(): ParkingPlanAnalyzer {
  const configured = process.env.PLAN_ANALYZER ?? "mock";
  if (configured !== "mock") throw new Error(`Plan analyzer "${configured}" is not implemented in V1`);
  return new MockParkingPlanAnalyzer();
}
