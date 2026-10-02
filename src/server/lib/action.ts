import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { AppError, type ActionResult } from "./errors";
import { logger } from "./logger";

/**
 * Wraps a server action body: maps domain errors to user messages and keeps
 * technical details in the logs only.
 */
export async function runAction<T>(
  name: string,
  fn: () => Promise<T>,
  fallbackMessage = "Não foi possível concluir a operação. Tente novamente.",
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    unstable_rethrow(err); // let redirect()/notFound() propagate
    if (err instanceof AppError) return { ok: false, error: err.userMessage, code: err.code };
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of err.issues) {
        const key = issue.path.join(".") || "_";
        (fieldErrors[key] ??= []).push(issue.message);
      }
      return { ok: false, error: "Revise os campos destacados.", code: "VALIDATION", fieldErrors };
    }
    logger.error("action_failed", { action: name, err });
    return { ok: false, error: fallbackMessage, code: "INTERNAL" };
  }
}
