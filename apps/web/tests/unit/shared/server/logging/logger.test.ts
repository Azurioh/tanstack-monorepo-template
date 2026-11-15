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

  it("adds no cause key to an error without a cause", () => {
    const { logger, entries } = setup("info");

    logger.error("Unexpected error", { error: new Error("boom") });

    expect(entries()[0]?.error).not.toHaveProperty("cause");
  });

  it("serializes the cause chain of an error, recursively", () => {
    const { logger, entries } = setup("info");
    const root = new TypeError("socket closed");
    const middle = new Error("query failed", { cause: root });

    logger.error("Unexpected error", { error: new Error("save failed", { cause: middle }) });

    expect(entries()[0]?.error).toEqual({
      name: "Error",
      message: "save failed",
      stack: expect.stringContaining("Error: save failed"),
      cause: {
        name: "Error",
        message: "query failed",
        stack: expect.stringContaining("Error: query failed"),
        cause: {
          name: "TypeError",
          message: "socket closed",
          stack: expect.stringContaining("TypeError: socket closed"),
        },
      },
    });
  });

  it("keeps a non-Error cause and redacts its secret-looking fields", () => {
    const { logger, entries } = setup("info");

    logger.error("Unexpected error", {
      error: new Error("call failed", { cause: { status: 401, apiKey: "k-123" } }),
      other: new Error("parse failed", { cause: "unexpected token" }),
    });

    expect(JSON.stringify(entries())).not.toContain("k-123");
    expect(entries()[0]).toMatchObject({
      error: { cause: { status: 401, apiKey: "[REDACTED]" } },
      other: { cause: "unexpected token" },
    });
  });

  it("truncates a cyclic cause chain with a marker", () => {
    const { logger, entries } = setup("info");
    const first = new Error("first");
    const second = new Error("second", { cause: first });
    first.cause = second;

    logger.error("Unexpected error", { error: first });

    let node: unknown = entries()[0]?.error;
    while (typeof node === "object" && node !== null && "cause" in node) {
      node = node.cause;
    }
    expect(node).toBe("[Truncated]");
  });

  it("truncates a cause chain deeper than the limit with the same marker", () => {
    const { logger, entries } = setup("info");
    const chain = Array.from({ length: 20 }).reduce<Error>(
      (cause, _, index) => new Error(`level ${index}`, { cause }),
      new Error("root"),
    );

    logger.error("Unexpected error", { error: chain });

    const serialized = JSON.stringify(entries()[0]?.error);
    expect(serialized).toContain('"cause":"[Truncated]"');
    expect(serialized).not.toContain('"message":"root"');
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
