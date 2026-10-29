import { greetInputSchema } from "@/features/greeting/schemas";
import type { GreetUseCase } from "@/features/greeting/server/application/greet";
import type { ListRecentGreetingsUseCase } from "@/features/greeting/server/application/list-recent-greetings";
import { baseProcedure } from "@/shared/server/rpc/context";

/** Use cases the greeting procedures delegate to, built by the feature's wiring factory. */
export interface GreetingUseCases {
  greet: GreetUseCase;
  listRecent: ListRecentGreetingsUseCase;
}

/**
 * Builds the `greeting.*` procedures. Each one validates its input, calls one use case and
 * returns its DTO; errors are mapped by the shared base procedure.
 *
 * @param useCases - the feature's use cases
 * @returns the procedures to register under `greeting` in the application router
 */
export function createGreetingProcedures(useCases: GreetingUseCases) {
  return {
    greet: baseProcedure
      .input(greetInputSchema)
      .handler(({ input }) => useCases.greet.execute(input)),
    listRecent: baseProcedure.handler(() => useCases.listRecent.execute()),
  };
}
