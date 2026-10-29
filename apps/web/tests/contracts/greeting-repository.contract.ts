import { describe, expect, it } from "vitest";
import type { GreetingRepository } from "@/features/greeting/server";
import { aGreeting } from "@/features/greeting/testing";

/**
 * Behaviour every `GreetingRepository` implementation must have. Each adapter's test calls this
 * suite with a factory returning a fresh, empty repository.
 */
export function greetingRepositoryContract(
  name: string,
  createRepository: () => GreetingRepository | Promise<GreetingRepository>,
): void {
  describe(`${name} (GreetingRepository contract)`, () => {
    it("returns nothing when empty", async () => {
      const repository = await createRepository();

      await expect(repository.listRecent(10)).resolves.toEqual([]);
    });

    it("returns saved greetings, most recent first", async () => {
      const repository = await createRepository();
      const first = aGreeting({ id: "g-1", name: "Ada", at: "2026-01-15T10:00:00.000Z" });
      const second = aGreeting({ id: "g-2", name: "Grace", at: "2026-01-15T10:01:00.000Z" });
      const third = aGreeting({ id: "g-3", name: "Linus", at: "2026-01-15T10:02:00.000Z" });

      await repository.save(first);
      await repository.save(second);
      await repository.save(third);

      const recent = await repository.listRecent(10);
      expect(recent.map((greeting) => greeting.id)).toEqual(["g-3", "g-2", "g-1"]);
    });

    it("returns at most `limit` greetings, keeping the most recent", async () => {
      const repository = await createRepository();
      for (const [index, at] of ["10:00", "10:01", "10:02"].entries()) {
        await repository.save(aGreeting({ id: `g-${index + 1}`, at: `2026-01-15T${at}:00.000Z` }));
      }

      const recent = await repository.listRecent(2);

      expect(recent.map((greeting) => greeting.id)).toEqual(["g-3", "g-2"]);
    });

    it("returns the saved values unchanged", async () => {
      const repository = await createRepository();
      const greeting = aGreeting({ id: "g-1", name: "Ada", at: "2026-01-15T10:00:00.000Z" });

      await repository.save(greeting);

      const [stored] = await repository.listRecent(1);
      expect(stored?.id).toBe("g-1");
      expect(stored?.name.value).toBe("Ada");
      expect(stored?.message).toBe("Hello, Ada!");
      expect(stored?.createdAt).toEqual(new Date("2026-01-15T10:00:00.000Z"));
    });
  });
}
