import { Greeting } from "@/features/greeting/server/domain/greeting";
import { PersonName } from "@/features/greeting/server/domain/person-name";

export { InMemoryGreetingRepository } from "@/features/greeting/server/infrastructure/in-memory-greeting-repository";
export { FixedClock } from "@/shared/server/adapters/fixed-clock";
export { SequentialIdGenerator } from "@/shared/server/adapters/sequential-id-generator";

/**
 * Test builder of a valid greeting.
 *
 * @param overrides.id - defaults to `greeting-1`
 * @param overrides.name - raw name, defaults to `Ada`
 * @param overrides.at - ISO 8601 creation time, defaults to `2026-01-15T10:00:00.000Z`
 * @returns the greeting
 */
export function aGreeting(overrides: { id?: string; name?: string; at?: string }): Greeting {
  return Greeting.create({
    id: overrides.id ?? "greeting-1",
    name: PersonName.create(overrides.name ?? "Ada"),
    now: new Date(overrides.at ?? "2026-01-15T10:00:00.000Z"),
  });
}
