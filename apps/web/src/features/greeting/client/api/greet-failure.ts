import { ORPCError } from "@orpc/client";
import { z } from "zod/mini";

/** Why a greeting request failed, as the client can act on it. */
export type GreetFailure =
  | { kind: "rejected"; code: string }
  | { kind: "unexpected"; referenceId: string | null };

const rejectedData = z.object({ code: z.string() });
const unexpectedData = z.object({ referenceId: z.string() });

/**
 * Reads a failed `greeting.greet` call: a business rejection carries its code; anything else
 * (server error, unreachable server) is unexpected, with the server's reference id when known.
 *
 * @param error - what the RPC call rejected with
 * @returns the failure
 */
export function toGreetFailure(error: unknown): GreetFailure {
  if (!(error instanceof ORPCError)) {
    return { kind: "unexpected", referenceId: null };
  }
  const rejected = rejectedData.safeParse(error.data);
  if (error.code === "BAD_REQUEST" && rejected.success) {
    return { kind: "rejected", code: rejected.data.code };
  }
  const unexpected = unexpectedData.safeParse(error.data);
  return {
    kind: "unexpected",
    referenceId: unexpected.success ? unexpected.data.referenceId : null,
  };
}
