import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
// Evaluated when the server process loads this entry, so an invalid environment stops startup
// instead of failing the first request.
import "@/shared/server/composition-root";

export default createServerEntry({
  fetch(request, opts) {
    return handler.fetch(request, opts);
  },
});
