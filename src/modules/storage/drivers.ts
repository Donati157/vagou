import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { Database } from "@/server/db/create";
import { storedFiles } from "@/server/db/schema";

/**
 * File storage drivers (no "server-only" so CLI scripts can use them too).
 *  - LocalFileStorage: files on disk outside /public (development, single-server hosting)
 *  - DatabaseFileStorage: files in PostgreSQL (serverless hosting without persistent disk)
 * A cloud object-storage driver (S3/R2/Vercel Blob) can implement the same interface later.
 */
export interface FileStorage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

export class LocalFileStorage implements FileStorage {
  constructor(private root: string) {}
  private resolve(key: string) {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("BAD_STORAGE_KEY");
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

export class DatabaseFileStorage implements FileStorage {
  constructor(private db: Database) {}
  async put(key: string, data: Buffer, contentType: string) {
    await this.db
      .insert(storedFiles)
      .values({ key, contentType, size: data.length, data })
      .onConflictDoUpdate({ target: storedFiles.key, set: { contentType, size: data.length, data } });
  }
  async get(key: string) {
    const [row] = await this.db.select({ data: storedFiles.data }).from(storedFiles).where(eq(storedFiles.key, key));
    return row ? row.data : null;
  }
  async delete(key: string) {
    await this.db.delete(storedFiles).where(eq(storedFiles.key, key));
  }
}

/** "database" when a real PostgreSQL is configured (unless overridden), otherwise "local". */
export function storageDriverName(): "database" | "local" {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "database" || explicit === "local") return explicit;
  return process.env.DATABASE_URL || process.env.POSTGRES_URL ? "database" : "local";
}

export function localUploadsDir() {
  return process.env.UPLOADS_DIR ?? path.join(process.cwd(), ".data", "uploads");
}

export function createStorage(db: Database): FileStorage {
  return storageDriverName() === "database" ? new DatabaseFileStorage(db) : new LocalFileStorage(localUploadsDir());
}
