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

function sanitize(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        SECRET_FIELD.test(key) ? REDACTED : sanitize(nested),
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
      ...(sanitize(fields) as Record<string, unknown>),
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
