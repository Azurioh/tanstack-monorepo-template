import { describe, expect, it } from "vitest";
import { Greeting } from "@/features/greeting/server/domain/greeting";
import { PersonName } from "@/features/greeting/server/domain/person-name";
import { FixedClock } from "@/features/greeting/testing";

const NOW = new Date("2026-01-15T10:00:00.000Z");

function aGreeting() {
  return Greeting.create({
    id: "greeting-1",
    name: PersonName.create("Ada"),
    now: new FixedClock(NOW).now(),
  });
}

describe("Greeting", () => {
  it("builds the message from the name", () => {
    expect(aGreeting().message).toBe("Hello, Ada!");
  });

  it("keeps the id and the name", () => {
    const greeting = aGreeting();

    expect(greeting.id).toBe("greeting-1");
    expect(greeting.name.value).toBe("Ada");
  });

  it("takes createdAt from the injected clock", () => {
    expect(aGreeting().createdAt).toEqual(NOW);
  });

  it("is immutable, including its creation date", () => {
    const greeting = aGreeting();

    greeting.createdAt.setFullYear(2000);

    expect(Object.isFrozen(greeting)).toBe(true);
    expect(greeting.createdAt).toEqual(NOW);
  });

  it("is not affected by later changes to the date it was created with", () => {
    const now = new Date(NOW);
    const greeting = Greeting.create({ id: "greeting-1", name: PersonName.create("Ada"), now });

    now.setFullYear(2000);

    expect(greeting.createdAt).toEqual(NOW);
  });
});
