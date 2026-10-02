import "server-only";
import { auditLogs, notifications } from "@/server/db/schema";
import type { Database, Tx } from "@/server/db/client";
import { logger } from "./logger";

type Executor = Database | Tx;

export async function audit(
  exec: Executor,
  entry: { actorId: string | null; action: string; entityType: string; entityId?: string; metadata?: Record<string, string | number | boolean | null> },
) {
  try {
    await exec.insert(auditLogs).values(entry);
  } catch (err) {
    logger.warn("audit_write_failed", { action: entry.action, err });
  }
}

export async function notify(exec: Executor, items: Array<{ userId: string; type: string; title: string; body: string; link?: string }>) {
  if (items.length === 0) return;
  await exec.insert(notifications).values(items);
}
