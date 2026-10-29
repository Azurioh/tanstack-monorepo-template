import { QueryClient } from "@tanstack/react-query";

/**
 * Creates the query client of one router instance. Called inside `getRouter()` so that each
 * server-side render gets its own cache and no data leaks between requests.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
      },
    },
  });
}
