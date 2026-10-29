import { describe, expect, it } from "vitest";
import { greetingEnv } from "@/features/greeting/server";
import { loadEnv } from "@/shared/server/config/env";

function load(source: Record<string, string | undefined>) {
  return loadEnv(source, { greeting: greetingEnv });
}

describe("greetingEnv", () => {
  it("parses GREETING_HISTORY_LIMIT as an integer", () => {
    expect(load({ GREETING_HISTORY_LIMIT: "10" }).features.greeting).toEqual({
      GREETING_HISTORY_LIMIT: 10,
    });
  });

  it.each([
    ["missing", {}],
    ["blank", { GREETING_HISTORY_LIMIT: " " }],
    ["not a number", { GREETING_HISTORY_LIMIT: "ten" }],
    ["not an integer", { GREETING_HISTORY_LIMIT: "2.5" }],
    ["below 1", { GREETING_HISTORY_LIMIT: "0" }],
    ["above 100", { GREETING_HISTORY_LIMIT: "101" }],
  ])("rejects GREETING_HISTORY_LIMIT when %s", (_case, source) => {
    expect(() => load(source)).toThrow(
      expect.objectContaining({
        code: "ENV_INVALID",
        message: expect.stringContaining("GREETING_HISTORY_LIMIT (integer 1–100)"),
      }),
    );
  });

  it("is not named when only LOG_LEVEL is invalid", () => {
    expect(() => load({ GREETING_HISTORY_LIMIT: "10", LOG_LEVEL: "verbose" })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("GREETING_HISTORY_LIMIT") }),
    );
  });

  it("is named alongside an invalid LOG_LEVEL", () => {
    expect(() => load({ GREETING_HISTORY_LIMIT: "-1", LOG_LEVEL: "loud" })).toThrow(
      expect.objectContaining({
        message: expect.stringMatching(/LOG_LEVEL.*GREETING_HISTORY_LIMIT/),
      }),
    );
  });
});
