import { describe, expect, it } from "vitest";
import { GreetUseCase } from "@/features/greeting/server/application/greet";
import { GreetingError } from "@/features/greeting/server/domain/greeting-error";
import {
  FixedClock,
  InMemoryGreetingRepository,
  SequentialIdGenerator,
} from "@/features/greeting/testing";

const NOW = new Date("2026-01-15T10:00:00.000Z");

function setup() {
  const greetings = new InMemoryGreetingRepository();
  const greet = new GreetUseCase({
    greetings,
    clock: new FixedClock(NOW),
    ids: new SequentialIdGenerator("greeting"),
  });
  return { greetings, greet };
}

describe("GreetUseCase", () => {
  it("returns the greeting as a DTO", async () => {
    const { greet } = setup();

    await expect(greet.execute({ name: "Ada" })).resolves.toEqual({
      id: "greeting-1",
      name: "Ada",
      message: "Hello, Ada!",
      createdAt: "2026-01-15T10:00:00.000Z",
    });
  });

  it("saves the greeting", async () => {
    const { greet, greetings } = setup();

    await greet.execute({ name: "  Ada  " });

    const [saved] = await greetings.listRecent(10);
    expect(saved?.id).toBe("greeting-1");
    expect(saved?.name.value).toBe("Ada");
  });

  it("refuses an invalid name with a GreetingError and saves nothing", async () => {
    const { greet, greetings } = setup();

    await expect(greet.execute({ name: "   " })).rejects.toBeInstanceOf(GreetingError);
    await expect(greet.execute({ name: "a".repeat(51) })).rejects.toMatchObject({
      code: "NAME_TOO_LONG",
    });
    await expect(greetings.listRecent(10)).resolves.toEqual([]);
  });
});
