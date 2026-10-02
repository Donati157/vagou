import zlib from "node:zlib";
import { standardLayout } from "../../src/modules/floorplans/layout";

/** Tiny RGB rasterizer + PNG encoder to generate fictional floor plans for the demo. */
type RGB = [number, number, number];

class Canvas {
  data: Buffer;
  constructor(public w: number, public h: number, bg: RGB) {
    this.data = Buffer.alloc(w * h * 3);
    this.fill(0, 0, w, h, bg);
  }
  fill(x: number, y: number, w: number, h: number, c: RGB) {
    const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.w, Math.round(x + w)), y1 = Math.min(this.h, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      const i = (yy * this.w + xx) * 3;
      this.data[i] = c[0]; this.data[i + 1] = c[1]; this.data[i + 2] = c[2];
    }
  }
  stroke(x: number, y: number, w: number, h: number, t: number, c: RGB) {
    this.fill(x, y, w, t, c); this.fill(x, y + h - t, w, t, c);
    this.fill(x, y, t, h, c); this.fill(x + w - t, y, t, h, c);
  }
  hatch(x: number, y: number, w: number, h: number, c: RGB, step = 10) {
    for (let yy = Math.round(y); yy < y + h; yy++) for (let xx = Math.round(x); xx < x + w; xx++) {
      if ((xx + yy) % step === 0) this.fill(xx, yy, 1, 1, c);
    }
  }
  png(): Buffer {
    const raw = Buffer.alloc((this.w * 3 + 1) * this.h);
    for (let y = 0; y < this.h; y++) {
      raw[y * (this.w * 3 + 1)] = 0;
      this.data.copy(raw, y * (this.w * 3 + 1) + 1, y * this.w * 3, (y + 1) * this.w * 3);
    }
    const chunk = (type: string, body: Buffer) => {
      const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
      const tb = Buffer.concat([Buffer.from(type), body]);
      const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(tb) >>> 0);
      return Buffer.concat([len, tb, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.w, 0); ihdr.writeUInt32BE(this.h, 4);
    ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]);
  }
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf: Buffer) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

export function renderSamplePlan(width = 1600, height = 1000, variant = 0): Buffer {
  const c = new Canvas(width, height, [250, 250, 248]);
  const W = (v: number) => v * width, H = (v: number) => v * height;
  const { spaces, elements } = standardLayout();
  // slab
  c.fill(W(0.03), H(0.03), W(0.94), H(0.93), [238, 240, 238]);
  for (const e of elements) {
    if (e.kind === "CIRCULATION") c.fill(W(e.x), H(e.y), W(e.w), H(e.h), [226, 229, 227]);
  }
  // lane dashes
  for (const yc of [0.2175, 0.5575, 0.89]) for (let x = 0.06; x < 0.94; x += 0.03) c.fill(W(x), H(yc) - 1, W(0.015), 3, [200, 170, 60]);
  // stalls
  for (const s of spaces) {
    c.stroke(W(s.x - 0.003), H(s.y - 0.004), W(s.w + 0.006), H(s.h + 0.008), 2, [70, 78, 74]);
    if (s.type === "PCD") c.fill(W(s.x + s.w / 2) - 6, H(s.y + s.h / 2) - 6, 12, 12, [37, 99, 235]);
    if (s.type === "EV") c.fill(W(s.x + s.w / 2) - 6, H(s.y + s.h / 2) - 6, 12, 12, [31, 157, 85]);
  }
  // columns
  for (let x = 0.1; x < 0.95; x += 0.16) for (const y of [0.27, 0.61]) c.fill(W(x), H(y), 14, 14, [120, 126, 122]);
  // elements
  for (const e of elements) {
    if (e.kind === "ENTRANCE") c.fill(W(e.x), H(e.y), W(e.w), H(e.h), [92, 184, 116]);
    if (e.kind === "EXIT") c.fill(W(e.x), H(e.y), W(e.w), H(e.h), [214, 60, 60]);
    if (e.kind === "RAMP") { c.fill(W(e.x), H(e.y), W(e.w), H(e.h), [215, 218, 216]); c.hatch(W(e.x), H(e.y), W(e.w), H(e.h), [120, 126, 122], 8); }
    if (e.kind === "ELEVATOR") { c.fill(W(e.x), H(e.y), W(e.w), H(e.h), [200, 205, 202]); c.stroke(W(e.x), H(e.y), W(e.w), H(e.h), 3, [60, 66, 63]); }
  }
  // outer walls
  c.stroke(W(0.03), H(0.03), W(0.94), H(0.93), 8, [40, 46, 43]);
  // openings for entrance/exit
  c.fill(W(0.07), H(0.955), W(0.12), 10, [92, 184, 116]);
  c.fill(W(0.81), H(0.955), W(0.12), 10, [214, 60, 60]);
  if (variant === 1) c.fill(W(0.03), H(0.03), W(0.02), H(0.02), [40, 46, 43]);
  return c.png();
}
