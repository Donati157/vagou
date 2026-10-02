import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { AppError } from "@/server/lib/errors";

/**
 * File storage adapter. V1 ships LocalFileStorage (files outside /public, served through
 * an authorized route). A SupabaseStorage/S3 adapter can implement the same interface.
 */
export interface FileStorage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

class LocalFileStorage implements FileStorage {
  constructor(private root: string) {}
  private resolve(key: string) {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new AppError("BAD_KEY", "Arquivo inválido.");
    return full;
  }
  async put(key: string, data: Buffer) {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
  }
  async get(key: string) {
    try {
      return await fs.readFile(this.resolve(key));
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    await fs.rm(this.resolve(key), { force: true });
  }
}

export const storage: FileStorage = new LocalFileStorage(
  process.env.UPLOADS_DIR ?? path.join(process.cwd(), ".data", "uploads"),
);

export type AllowedKind = "image" | "floorplan";

const SIGNATURES: Array<{ mime: string; ext: string; test: (b: Buffer) => boolean }> = [
  { mime: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  { mime: "application/pdf", ext: "pdf", test: (b) => b.subarray(0, 5).toString() === "%PDF-" },
];

const RULES: Record<AllowedKind, { mimes: string[]; maxBytes: number; label: string }> = {
  image: { mimes: ["image/png", "image/jpeg", "image/webp"], maxBytes: 5 * 1024 * 1024, label: "PNG, JPG ou WEBP de até 5 MB" },
  floorplan: { mimes: ["image/png", "image/jpeg", "application/pdf"], maxBytes: 15 * 1024 * 1024, label: "PNG, JPG ou PDF de até 15 MB" },
};

/**
 * Validates an uploaded file by size and by its real content signature (never trusting the
 * client-provided MIME type or file name).
 */
export async function validateUpload(file: File, kind: AllowedKind) {
  const rule = RULES[kind];
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) {
    throw new AppError("UPLOAD_EMPTY", "Selecione um arquivo para enviar.");
  }
  if (file.size > rule.maxBytes) throw new AppError("UPLOAD_TOO_LARGE", `Arquivo muito grande. Envie ${rule.label}.`);
  const data = Buffer.from(await file.arrayBuffer());
  const sig = SIGNATURES.find((s) => s.test(data));
  if (!sig || !rule.mimes.includes(sig.mime)) throw new AppError("UPLOAD_TYPE", `Formato não suportado. Envie ${rule.label}.`);
  const safeName = file.name.replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 120) || `arquivo.${sig.ext}`;
  return { data, mime: sig.mime, ext: sig.ext, safeName, size: file.size };
}

export function newKey(prefix: string, ext: string) {
  return `${prefix}/${randomUUID()}.${ext}`;
}

export function mimeFromKey(key: string) {
  const ext = key.split(".").pop()?.toLowerCase();
  return ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : ext === "pdf" ? "application/pdf" : ext === "svg" ? "image/svg+xml" : "application/octet-stream";
}

/** Public URL for a stored key. "public:" keys point to bundled demo assets in /public. */
export function fileUrl(key: string | null | undefined) {
  if (!key) return null;
  if (key.startsWith("public:")) return key.slice("public:".length);
  return `/api/files/${key}`;
}
