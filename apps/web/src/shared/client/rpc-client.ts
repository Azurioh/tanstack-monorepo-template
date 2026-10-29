import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouter } from "@/shared/server/rpc/router";

const RPC_PATH = "/api/rpc";

declare global {
  /**
   * In-process client of the application router, registered by the composition root when the
   * server process starts. Undefined in the browser.
   */
  var $rpcServerClient: RouterClient<AppRouter> | undefined;
}

/** Same-origin link to the RPC endpoint; only the browser may use it. */
const browserLink = new RPCLink({
  url: () => {
    if (typeof window === "undefined") {
      throw new ReferenceError(
        "No in-process RPC client is registered: the server entry must load the composition root.",
      );
    }
    return new URL(RPC_PATH, window.location.origin);
  },
});

/*
 * During server-side rendering the router is called in-process (oRPC "Optimize SSR" recipe):
 * the server never calls itself back over HTTP, so rendering does not depend on the request's
 * Host being reachable from the server (port-forward, container, reverse proxy).
 */
const client: RouterClient<AppRouter> =
  globalThis.$rpcServerClient ?? createORPCClient(browserLink);

/** TanStack Query helpers (`queryOptions`, `mutationOptions`, keys) for every procedure. */
export const orpc = createTanstackQueryUtils(client);
