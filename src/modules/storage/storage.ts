import "server-only";
import { randomUUID } from "node:crypto";
import { AppError } from "@/server/lib/errors";
import { db } from "@/server/db/client";
import { createStorage, type FileStorage } from "./drivers";

/** Active storage driver (disk in development, PostgreSQL on serverless hosting). See drivers.ts. */
export const storage: FileStorage = createStorage(db);

export type AllowedKind = "image" | "floorplan";

const SIGNATURES: Array<{ mime: string; ext: string; test: (b: Buffer) => boolean }> = [
  { mime: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  { mime: "application/pdf", ext: "pdf", test: (b) => b.subarray(0, 5).toString() === "%PDF-" },
];

/**
 * Serverless platforms cap request bodies (Vercel: 4.5 MB), so uploads are limited accordingly.
 * The browser downsizes larger plans before sending (see plan-uploader.tsx).
 */
export const MAX_UPLOAD_BYTES = process.env.VERCEL ? 4 * 1024 * 1024 : 15 * 1024 * 1024;
const mb = (b: number) => `${Math.round(b / 1024 / 1024)} MB`;

const RULES: Record<AllowedKind, { mimes: string[]; maxBytes: number; label: string }> = {
  image: { mimes: ["image/png", "image/jpeg", "image/webp"], maxBytes: Math.min(5 * 1024 * 1024, MAX_UPLOAD_BYTES), label: `PNG, JPG ou WEBP de até ${mb(Math.min(5 * 1024 * 1024, MAX_UPLOAD_BYTES))}` },
  floorplan: { mimes: ["image/png", "image/jpeg", "application/pdf"], maxBytes: MAX_UPLOAD_BYTES, label: `PNG, JPG ou PDF de até ${mb(MAX_UPLOAD_BYTES)}` },
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
