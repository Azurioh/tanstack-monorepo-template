import { describe, expect, it } from "vitest";
import { FixedClock } from "@/shared/server/adapters/fixed-clock";
import { SystemClock } from "@/shared/server/adapters/system-clock";

describe("SystemClock", () => {
  it("returns the current time", () => {
    const before = Date.now();
    const now = new SystemClock().now().getTime();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});

describe("FixedClock", () => {
  it("always returns the configured instant", () => {
    const clock = new FixedClock(new Date("2026-01-15T10:00:00.000Z"));

    expect(clock.now().toISOString()).toBe("2026-01-15T10:00:00.000Z");
    expect(clock.now().toISOString()).toBe("2026-01-15T10:00:00.000Z");
  });

  it("is not affected by a caller mutating a returned date", () => {
    const clock = new FixedClock(new Date("2026-01-15T10:00:00.000Z"));

    clock.now().setUTCFullYear(2000);

    expect(clock.now().toISOString()).toBe("2026-01-15T10:00:00.000Z");
  });
});
