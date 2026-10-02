/**
 * Demonstrative in-facility route (no real indoor positioning in V1): entrance → nearest
 * aisle → space, using circulation areas from the floor plan. Coordinates are relative (0..1).
 */
type Box = { x: number; y: number; w: number; h: number; kind?: string };

export function demoRoute(entrance: Box | undefined, space: Box, circulation: Box[]): Array<[number, number]> {
  const target: [number, number] = [space.x + space.w / 2, space.y + space.h / 2];
  if (!entrance) return [target];
  const start: [number, number] = [entrance.x + entrance.w / 2, entrance.y];
  const lanes = circulation.filter((c) => c.w > c.h);
  const walkway = circulation.find((c) => c.h > c.w);
  if (lanes.length === 0) return [start, target];
  const laneY = (c: Box) => c.y + c.h / 2;
  const nearestToSpace = lanes.reduce((a, b) => (Math.abs(laneY(a) - target[1]) < Math.abs(laneY(b) - target[1]) ? a : b));
  const nearestToEntrance = lanes.reduce((a, b) => (Math.abs(laneY(a) - start[1]) < Math.abs(laneY(b) - start[1]) ? a : b));
  const pts: Array<[number, number]> = [start, [start[0], laneY(nearestToEntrance)]];
  if (nearestToSpace !== nearestToEntrance && walkway) {
    const wx = walkway.x + walkway.w / 2;
    pts.push([wx, laneY(nearestToEntrance)], [wx, laneY(nearestToSpace)]);
  }
  pts.push([target[0], laneY(nearestToSpace)], target);
  return pts;
}
