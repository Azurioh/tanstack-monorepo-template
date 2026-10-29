import { z } from "zod";
import { GreetUseCase } from "@/features/greeting/server/application/greet";
import { ListRecentGreetingsUseCase } from "@/features/greeting/server/application/list-recent-greetings";
import { InMemoryGreetingRepository } from "@/features/greeting/server/infrastructure/in-memory-greeting-repository";
import type { GreetingUseCases } from "@/features/greeting/server/rpc/greeting-procedures";
import { EnvSpec, type EnvValues } from "@/shared/server/config/env";
import type { Clock } from "@/shared/server/ports/clock";
import type { IdGenerator } from "@/shared/server/ports/id-generator";

export type { GreetingDto } from "@/features/greeting/server/application/greeting-dto";
export type { GreetingRepository } from "@/features/greeting/server/application/ports/greeting-repository";
export type { GreetingErrorCode } from "@/features/greeting/server/domain/greeting-error";
export {
  createGreetingProcedures,
  type GreetingUseCases,
} from "@/features/greeting/server/rpc/greeting-procedures";

/** Settings of the feature, validated at startup by the composition root. */
export const greetingEnv = EnvSpec.define({
  GREETING_HISTORY_LIMIT: {
    schema: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)),
    rule: "integer 1–100",
  },
});

/**
 * Wiring factory of the feature, called once by the composition root: binds the repository port
 * to its in-memory adapter and builds the use cases.
 *
 * @param deps.clock - shared clock
 * @param deps.ids - generator of greeting ids
 * @param deps.env - the feature's settings, parsed from `greetingEnv`
 * @returns the use cases the procedures delegate to
 */
export function createGreetingUseCases(deps: {
  clock: Clock;
  ids: IdGenerator;
  env: EnvValues<typeof greetingEnv>;
}): GreetingUseCases {
  const greetings = new InMemoryGreetingRepository();
  return {
    greet: new GreetUseCase({ greetings, clock: deps.clock, ids: deps.ids }),
    listRecent: new ListRecentGreetingsUseCase({
      greetings,
      historyLimit: deps.env.GREETING_HISTORY_LIMIT,
    }),
  };
}
