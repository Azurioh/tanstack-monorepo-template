// Evaluated first, when the server process loads this entry: an invalid environment stops startup
// instead of failing the first request, and the in-process RPC client is registered before any
// route module reads it.
import "@/shared/server/composition-root";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

export default createServerEntry({
  fetch(request, opts) {
    return handler.fetch(request, opts);
  },
});
