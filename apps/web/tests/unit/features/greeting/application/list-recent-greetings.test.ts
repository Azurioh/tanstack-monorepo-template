import { describe, expect, it } from "vitest";
import { ListRecentGreetingsUseCase } from "@/features/greeting/server/application/list-recent-greetings";
import { aGreeting, InMemoryGreetingRepository } from "@/features/greeting/testing";

async function setup(params: { historyLimit: number; saved: number }) {
  const greetings = new InMemoryGreetingRepository();
  for (let index = 1; index <= params.saved; index += 1) {
    await greetings.save(
      aGreeting({ id: `g-${index}`, name: `Name ${index}`, at: `2026-01-15T10:0${index}:00.000Z` }),
    );
  }
  const listRecent = new ListRecentGreetingsUseCase({
    greetings,
    historyLimit: params.historyLimit,
  });
  return { listRecent };
}

describe("ListRecentGreetingsUseCase", () => {
  it("returns an empty list when nothing was greeted", async () => {
    const { listRecent } = await setup({ historyLimit: 5, saved: 0 });

    await expect(listRecent.execute()).resolves.toEqual([]);
  });

  it("returns DTOs, newest first", async () => {
    const { listRecent } = await setup({ historyLimit: 5, saved: 2 });

    await expect(listRecent.execute()).resolves.toEqual([
      {
        id: "g-2",
        name: "Name 2",
        message: "Hello, Name 2!",
        createdAt: "2026-01-15T10:02:00.000Z",
      },
      {
        id: "g-1",
        name: "Name 1",
        message: "Hello, Name 1!",
        createdAt: "2026-01-15T10:01:00.000Z",
      },
    ]);
  });

  it("returns at most the configured history limit", async () => {
    const { listRecent } = await setup({ historyLimit: 2, saved: 4 });

    const recent = await listRecent.execute();

    expect(recent.map((greeting) => greeting.id)).toEqual(["g-4", "g-3"]);
  });
});
