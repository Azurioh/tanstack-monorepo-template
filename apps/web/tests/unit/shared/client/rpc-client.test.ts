import { createRouterClient, type RouterClient } from "@orpc/server";
import type { RouterUtils } from "@orpc/tanstack-query";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { createGreetingUseCases } from "@/features/greeting/server";
import { FixedClock, SequentialIdGenerator } from "@/features/greeting/testing";
import { createLogger } from "@/shared/server/logging/logger";
import { type AppRouter, createRouter } from "@/shared/server/rpc/router";

const NOW = new Date("2026-01-15T10:00:00.000Z");

function createServerClient(): RouterClient<AppRouter> {
  const clock = new FixedClock(NOW);
  const router = createRouter({
    greeting: createGreetingUseCases({
      clock,
      ids: new SequentialIdGenerator("greeting"),
      env: { GREETING_HISTORY_LIMIT: 10 },
    }),
  });
  return createRouterClient(router, {
    context: {
      logger: createLogger({ level: "error", clock, write: () => undefined }),
      referenceIds: new SequentialIdGenerator("ref"),
    },
  });
}

/** Loads a fresh copy of the module, which reads the registered client when it is evaluated. */
async function loadRpcClient() {
  vi.resetModules();
  return import("@/shared/client/rpc-client");
}

function stubFetch() {
  const fetchMock = vi.fn(async () => new Response(null, { status: 502 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  globalThis.$rpcServerClient = undefined;
});

describe("RPC client", () => {
  it("is typed from the application router", async () => {
    const { orpc } = await loadRpcClient();

    expectTypeOf(orpc).toEqualTypeOf<RouterUtils<RouterClient<AppRouter>>>();
  });

  it("calls the router in-process during SSR, never over HTTP", async () => {
    const fetchMock = stubFetch();
    const serverClient = createServerClient();
    await serverClient.greeting.greet({ name: "Ada" });
    globalThis.$rpcServerClient = serverClient;
    const { orpc } = await loadRpcClient();

    const recent = await orpc.greeting.listRecent.call();

    expect(recent.map((greeting) => greeting.message)).toEqual(["Hello, Ada!"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses to call the endpoint over HTTP from the server when no client is registered", async () => {
    const fetchMock = stubFetch();
    const { orpc } = await loadRpcClient();

    await expect(orpc.greeting.listRecent.call()).rejects.toBeInstanceOf(ReferenceError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
