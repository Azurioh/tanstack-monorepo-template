import type { Clock } from "@/shared/server/ports/clock";

/** Supported log levels, from the most to the least verbose. */
export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

type LogFields = Readonly<Record<string, unknown>>;

/** Structured logger writing one JSON object per line. */
export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

const SECRET_FIELD = /pass(?:word)?|secret|token|authorization|cookie|api[-_]?key/i;
const REDACTED = "[REDACTED]";
// Bounds the cause chain so a cyclic chain (a.cause = b, b.cause = a) still terminates.
const MAX_CAUSE_DEPTH = 5;
const TRUNCATED = "[Truncated]";

function sanitizeError(params: { error: Error; causeDepth: number }): Record<string, unknown> {
  const { error, causeDepth } = params;
  const serialized = { name: error.name, message: error.message, stack: error.stack };
  if (error.cause === undefined) {
    return serialized;
  }
  const cause =
    causeDepth >= MAX_CAUSE_DEPTH
      ? TRUNCATED
      : sanitize({ value: error.cause, causeDepth: causeDepth + 1 });
  return { ...serialized, cause };
}

function sanitize(params: { value: unknown; causeDepth: number }): unknown {
  const { value, causeDepth } = params;
  if (value instanceof Error) {
    return sanitizeError({ error: value, causeDepth });
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitize({ value: item, causeDepth }));
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        SECRET_FIELD.test(key) ? REDACTED : sanitize({ value: nested, causeDepth }),
      ]),
    );
  }
  return value;
}

/**
 * Creates a logger that drops entries below `level`, redacts fields whose name looks like a
 * secret and hands each entry to `write` as a single JSON line.
 */
export function createLogger(params: {
  level: LogLevel;
  clock: Clock;
  write: (line: string) => void;
}): Logger {
  const threshold = LOG_LEVELS.indexOf(params.level);

  function log(level: LogLevel, message: string, fields: LogFields = {}): void {
    if (LOG_LEVELS.indexOf(level) < threshold) {
      return;
    }
    const entry = {
      ...(sanitize({ value: fields, causeDepth: 0 }) as Record<string, unknown>),
      time: params.clock.now().toISOString(),
      level,
      message,
    };
    params.write(JSON.stringify(entry));
  }

  return {
    debug: (message, fields) => log("debug", message, fields),
    info: (message, fields) => log("info", message, fields),
    warn: (message, fields) => log("warn", message, fields),
    error: (message, fields) => log("error", message, fields),
  };
}
