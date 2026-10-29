import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest, getRequestHeaders } from "@tanstack/react-start/server";
import type { AppRouter } from "@/shared/server/rpc/router";

const RPC_PATH = "/api/rpc";

/**
 * Link to the RPC endpoint. Browser: same-origin calls to /api/rpc. Server-side rendering: the
 * same endpoint, resolved against the incoming request's origin and forwarding its headers.
 */
export const createRpcLink = createIsomorphicFn()
  .client(() => new RPCLink({ url: () => new URL(RPC_PATH, window.location.origin) }))
  .server(
    () =>
      new RPCLink({
        url: () => new URL(RPC_PATH, getRequest().url),
        headers: () => getRequestHeaders(),
      }),
  );

const client: RouterClient<AppRouter> = createORPCClient(createRpcLink());

/** TanStack Query helpers (`queryOptions`, `mutationOptions`, keys) for every procedure. */
export const orpc = createTanstackQueryUtils(client);
