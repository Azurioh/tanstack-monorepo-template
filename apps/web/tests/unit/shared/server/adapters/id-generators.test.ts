import { describe, expect, it } from "vitest";
import { RandomIdGenerator } from "@/shared/server/adapters/random-id-generator";
import { SequentialIdGenerator } from "@/shared/server/adapters/sequential-id-generator";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("RandomIdGenerator", () => {
  it("returns distinct UUID v4 values", () => {
    const generator = new RandomIdGenerator();
    const first = generator.next();
    const second = generator.next();

    expect(first).toMatch(UUID_V4);
    expect(second).toMatch(UUID_V4);
    expect(first).not.toBe(second);
  });
});

describe("SequentialIdGenerator", () => {
  it("returns predictable ids in order", () => {
    const generator = new SequentialIdGenerator();

    expect([generator.next(), generator.next(), generator.next()]).toEqual([
      "id-1",
      "id-2",
      "id-3",
    ]);
  });

  it("uses the given prefix", () => {
    expect(new SequentialIdGenerator("greeting").next()).toBe("greeting-1");
  });
});
