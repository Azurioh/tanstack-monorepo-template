import { os } from "@orpc/server";
import type { Logger } from "@/shared/server/logging/logger";
import type { IdGenerator } from "@/shared/server/ports/id-generator";
import { mapErrors } from "@/shared/server/rpc/errors";

/** Dependencies every procedure receives, built once by the composition root. */
export interface RpcContext {
  logger: Logger;
  referenceIds: IdGenerator;
}

/** Procedure builder every feature starts from: typed context and the shared error mapping. */
export const baseProcedure = os.$context<RpcContext>().use(mapErrors);
