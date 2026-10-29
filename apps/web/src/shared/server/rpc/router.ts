import { createGreetingProcedures, type GreetingUseCases } from "@/features/greeting/server";

/** Use cases of every feature, built by the composition root. */
export interface RouterDependencies {
  greeting: GreetingUseCases;
}

/**
 * Builds the application's RPC router: every feature registers its procedures here under its
 * own key.
 *
 * @param deps - the use cases of every feature
 * @returns the router mounted at `/api/rpc`
 */
export function createRouter(deps: RouterDependencies) {
  return {
    greeting: createGreetingProcedures(deps.greeting),
  };
}

/** Router type the client is built from (type-only import on the client side). */
export type AppRouter = ReturnType<typeof createRouter>;
