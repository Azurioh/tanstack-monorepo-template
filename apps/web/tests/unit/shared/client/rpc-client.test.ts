import type { RouterClient } from "@orpc/server";
import type { RouterUtils } from "@orpc/tanstack-query";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { createRpcLink, orpc } from "@/shared/client/rpc-client";
import type { AppRouter } from "@/shared/server/rpc/router";

const incoming = new Request("https://app.example/greetings?page=2", {
  headers: { cookie: "session=abc", "accept-language": "en" },
});

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => incoming,
  getRequestHeaders: () => incoming.headers,
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RPC client", () => {
  it("is typed from the application router", () => {
    expectTypeOf(orpc).toEqualTypeOf<RouterUtils<RouterClient<AppRouter>>>();
  });

  it("calls the endpoint on the incoming request's origin during SSR, forwarding its headers", async () => {
    const fetchMock = vi.fn(
      async (_request: Request) =>
        new Response(JSON.stringify({ json: "pong" }), {
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const output = await createRpcLink().call(["sample", "ping"], undefined, { context: {} });

    expect(output).toBe("pong");
    const request = fetchMock.mock.calls[0]?.[0];
    expect(request?.url).toBe("https://app.example/api/rpc/sample/ping");
    expect(request?.headers.get("cookie")).toBe("session=abc");
    expect(request?.headers.get("accept-language")).toBe("en");
  });
});
