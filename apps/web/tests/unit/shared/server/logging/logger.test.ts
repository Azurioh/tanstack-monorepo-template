import { describe, expect, it } from "vitest";
import { FixedClock } from "@/shared/server/adapters/fixed-clock";
import { createLogger, type LogLevel } from "@/shared/server/logging/logger";

const NOW = new Date("2026-01-15T10:00:00.000Z");

function setup(level: LogLevel) {
  const lines: string[] = [];
  const logger = createLogger({
    level,
    clock: new FixedClock(NOW),
    write: (line) => lines.push(line),
  });
  const entries = () => lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  return { logger, lines, entries };
}

describe("createLogger", () => {
  it("writes one JSON line per entry with time, level, message and fields", () => {
    const { logger, lines, entries } = setup("info");

    logger.info("Greeting saved", { greetingId: "id-1" });

    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain("\n");
    expect(entries()).toEqual([
      {
        time: "2026-01-15T10:00:00.000Z",
        level: "info",
        message: "Greeting saved",
        greetingId: "id-1",
      },
    ]);
  });

  it("drops entries below the configured level", () => {
    const { logger, entries } = setup("warn");

    logger.debug("debug");
    logger.info("info");
    logger.warn("warn");
    logger.error("error");

    expect(entries().map((entry) => entry.level)).toEqual(["warn", "error"]);
  });

  it("writes every level when the level is debug", () => {
    const { logger, entries } = setup("debug");

    logger.debug("debug");
    logger.info("info");
    logger.warn("warn");
    logger.error("error");

    expect(entries().map((entry) => entry.level)).toEqual(["debug", "info", "warn", "error"]);
  });

  it("redacts fields whose name looks like a secret, at any depth", () => {
    const { logger, entries } = setup("info");

    logger.info("Request", {
      password: "hunter2",
      request: { headers: { authorization: "Bearer abc", cookie: "sid=1", accept: "*/*" } },
      apiToken: "t",
      clientSecret: "s",
    });

    const serialized = JSON.stringify(entries());
    expect(serialized).not.toMatch(/hunter2|Bearer abc|sid=1|"t"|"s"/);
    expect(entries()[0]).toMatchObject({
      password: "[REDACTED]",
      request: { headers: { authorization: "[REDACTED]", cookie: "[REDACTED]", accept: "*/*" } },
      apiToken: "[REDACTED]",
      clientSecret: "[REDACTED]",
    });
  });

  it("serializes errors with their name, message and stack", () => {
    const { logger, entries } = setup("info");

    logger.error("Unexpected error", { error: new RangeError("boom") });

    expect(entries()[0]?.error).toEqual({
      name: "RangeError",
      message: "boom",
      stack: expect.stringContaining("RangeError: boom"),
    });
  });

  it("keeps the reserved keys when fields try to override them", () => {
    const { logger, entries } = setup("info");

    logger.info("Real message", { message: "spoofed", level: "error", time: "never" });

    expect(entries()[0]).toMatchObject({
      message: "Real message",
      level: "info",
      time: NOW.toISOString(),
    });
  });
});
