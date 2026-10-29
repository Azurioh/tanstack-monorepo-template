import { orpc } from "@/shared/client/rpc-client";

/** @returns query options of `greeting.listRecent`, shared by the route loader and the hook */
export function recentGreetingsQueryOptions() {
  return orpc.greeting.listRecent.queryOptions();
}

/** @returns the cache key of `greeting.listRecent`, to invalidate it after a greeting */
export function recentGreetingsKey() {
  return orpc.greeting.listRecent.key();
}

/** @returns mutation options of `greeting.greet` */
export function greetMutationOptions() {
  return orpc.greeting.greet.mutationOptions();
}
