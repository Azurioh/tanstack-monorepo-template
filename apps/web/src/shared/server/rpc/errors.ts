import { ORPCError, os, ValidationError as SchemaValidationError } from "@orpc/server";
import { DomainError, type DomainErrorKind, isErrorCode } from "@/shared/domain/errors";
import type { RpcContext } from "@/shared/server/rpc/context";

/** Business error kinds the caller can act on; every other error is unexpected. */
const CLIENT_ERROR_KINDS: ReadonlySet<DomainErrorKind> = new Set(["validation"]);

/**
 * @returns the business code carried by an input validation error whose first issue message is
 * a code (shared schemas use the domain codes as issue messages), or `null`
 */
function inputIssueCode(error: ORPCError<string, unknown>): string | null {
  if (error.code !== "BAD_REQUEST" || !(error.cause instanceof SchemaValidationError)) {
    return null;
  }
  const message = error.cause.issues[0]?.message;
  if (message === undefined || !isErrorCode(message)) {
    return null;
  }
  return message;
}

/**
 * Maps errors at the transport boundary, in one place:
 * - an input issue carrying a business code becomes `BAD_REQUEST` with `data: { code }`, the
 *   same shape as a business error raised by the domain;
 * - other oRPC errors (input validation, …) pass through unchanged;
 * - a business error the caller can fix becomes `BAD_REQUEST` with `data: { code }` only;
 * - anything else is logged once with a reference id and becomes `INTERNAL_SERVER_ERROR`
 *   with `data: { referenceId }`, so no internal detail reaches the client.
 */
export const mapErrors = os.$context<RpcContext>().middleware(async ({ context, next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof ORPCError) {
      const code = inputIssueCode(error);
      if (code !== null) {
        throw new ORPCError("BAD_REQUEST", { data: { code }, cause: error });
      }
      throw error;
    }
    if (error instanceof DomainError && CLIENT_ERROR_KINDS.has(error.kind)) {
      throw new ORPCError("BAD_REQUEST", { data: { code: error.code }, cause: error });
    }
    const referenceId = context.referenceIds.next();
    context.logger.error("Unexpected error in RPC procedure", { referenceId, error });
    throw new ORPCError("INTERNAL_SERVER_ERROR", { data: { referenceId }, cause: error });
  }
});
