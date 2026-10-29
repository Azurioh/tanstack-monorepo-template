import { createGreetingUseCases, greetingEnv } from "@/features/greeting/server";
import { RandomIdGenerator } from "@/shared/server/adapters/random-id-generator";
import { SystemClock } from "@/shared/server/adapters/system-clock";
import { loadEnv } from "@/shared/server/config/env";
import { createLogger } from "@/shared/server/logging/logger";
import type { RpcContext } from "@/shared/server/rpc/context";
import { createRouter } from "@/shared/server/rpc/router";

/*
 * The only place where ports are bound to adapters. Evaluated once per server process: an
 * invalid environment throws here, before any request is served.
 */
const env = loadEnv(process.env, { greeting: greetingEnv });
const clock = new SystemClock();

/** Context handed to every RPC procedure. */
export const rpcContext: RpcContext = {
  logger: createLogger({
    level: env.app.LOG_LEVEL,
    clock,
    write: (line) => {
      process.stdout.write(`${line}\n`);
    },
  }),
  referenceIds: new RandomIdGenerator(),
};

/** The application router, with every feature wired to its adapters. */
export const router = createRouter({
  greeting: createGreetingUseCases({
    clock,
    ids: new RandomIdGenerator(),
    env: env.features.greeting,
  }),
});
