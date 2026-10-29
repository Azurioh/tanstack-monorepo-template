import { RPCHandler } from "@orpc/server/fetch";
import { createFileRoute } from "@tanstack/react-router";
import { router, rpcContext } from "@/shared/server/composition-root";

const handler = new RPCHandler(router);

export const Route = createFileRoute("/api/rpc/$")({
  server: {
    handlers: {
      ANY: async ({ request }) => {
        const { matched, response } = await handler.handle(request, {
          prefix: "/api/rpc",
          context: rpcContext,
        });
        if (matched) {
          return response;
        }
        return new Response("Not found", { status: 404 });
      },
    },
  },
});
