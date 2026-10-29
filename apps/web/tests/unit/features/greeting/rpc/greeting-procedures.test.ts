import { createRouterClient, ORPCError } from "@orpc/server";
import { describe, expect, it } from "vitest";
import { createGreetingProcedures, createGreetingUseCases } from "@/features/greeting/server";
import { FixedClock, SequentialIdGenerator } from "@/features/greeting/testing";
import { createLogger } from "@/shared/server/logging/logger";
import type { RpcContext } from "@/shared/server/rpc/context";

const NOW = new Date("2026-01-15T10:00:00.000Z");

function setup(params: { historyLimit: number }) {
  const lines: string[] = [];
  const clock = new FixedClock(NOW);
  const context: RpcContext = {
    logger: createLogger({ level: "debug", clock, write: (line) => lines.push(line) }),
    referenceIds: new SequentialIdGenerator("ref"),
  };
  const useCases = createGreetingUseCases({
    clock,
    ids: new SequentialIdGenerator("greeting"),
    env: { GREETING_HISTORY_LIMIT: params.historyLimit },
  });
  const client = createRouterClient(createGreetingProcedures(useCases), { context });
  return { client, lines };
}

async function rejection(promise: Promise<unknown>): Promise<ORPCError<string, unknown>> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  if (!(error instanceof ORPCError)) {
    throw new Error(`Expected an ORPCError, got ${String(error)}`);
  }
  return error;
}

describe("greeting procedures", () => {
  it("greet returns the GreetingDto shape", async () => {
    const { client } = setup({ historyLimit: 10 });

    await expect(client.greet({ name: "  Ada " })).resolves.toEqual({
      id: "greeting-1",
      name: "Ada",
      message: "Hello, Ada!",
      createdAt: NOW.toISOString(),
    });
  });

  it("listRecent returns the saved greetings, newest first, within the limit", async () => {
    const { client } = setup({ historyLimit: 2 });
    await client.greet({ name: "Ada" });
    await client.greet({ name: "Grace" });
    await client.greet({ name: "Linus" });

    const recent = await client.listRecent();

    expect(recent.map((greeting) => greeting.name)).toEqual(["Linus", "Grace"]);
    expect(Object.keys(recent[0] ?? {}).sort()).toEqual(["createdAt", "id", "message", "name"]);
  });

  it.each([
    ["   ", "NAME_EMPTY"],
    ["a".repeat(51), "NAME_TOO_LONG"],
    ["Ada\u0000", "NAME_INVALID"],
  ])("greet rejects %j with BAD_REQUEST { code: %s }", async (name, code) => {
    const { client, lines } = setup({ historyLimit: 10 });

    const error = await rejection(client.greet({ name }));

    expect(error.code).toBe("BAD_REQUEST");
    expect(error.data).toEqual({ code });
    expect(lines).toEqual([]);
  });

  it("greet rejects an input of the wrong shape as an input validation error", async () => {
    const { client } = setup({ historyLimit: 10 });

    const error = await rejection(client.greet(JSON.parse('{ "name": 42 }')));

    expect(error.code).toBe("BAD_REQUEST");
    expect(error.message).toBe("Input validation failed");
  });

  it("nothing is listed after a rejected greeting", async () => {
    const { client } = setup({ historyLimit: 10 });

    await rejection(client.greet({ name: "" }));

    await expect(client.listRecent()).resolves.toEqual([]);
  });
});
