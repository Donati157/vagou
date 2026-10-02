import "server-only";

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const SENSITIVE = /pass(word)?|token|secret|authorization|cookie|card|cvv|email|phone|cpf/i;

/** Drops values of keys that look sensitive so they never reach logs. */
function redact(fields: Fields): Fields {
  const out: Fields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (SENSITIVE.test(k)) out[k] = "[redacted]";
    else if (v instanceof Error) out[k] = { name: v.name, message: v.message, stack: v.stack?.split("\n").slice(0, 6).join("\n") };
    else out[k] = v;
  }
  return out;
}

/** Hook for a future error-tracking integration (Sentry, Datadog…). */
export interface ErrorReporter {
  capture(error: unknown, context: Fields): void;
}
let reporter: ErrorReporter | null = null;
export function setErrorReporter(r: ErrorReporter) {
  reporter = r;
}

function emit(level: Level, msg: string, fields: Fields = {}) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const line = JSON.stringify({ level, msg, time: new Date().toISOString(), ...redact(fields) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else if (process.env.NODE_ENV !== "test") console.log(line);
}

export const logger = {
  debug: (msg: string, f?: Fields) => emit("debug", msg, f),
  info: (msg: string, f?: Fields) => emit("info", msg, f),
  warn: (msg: string, f?: Fields) => emit("warn", msg, f),
  error: (msg: string, f: Fields = {}) => {
    emit("error", msg, f);
    reporter?.capture(f.err ?? msg, f);
  },
};
