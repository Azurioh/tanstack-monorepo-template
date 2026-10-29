import { ValidationError } from "@/shared/domain/errors";

/** Stable codes of the greeting business errors; the client maps each one to its own copy. */
export type GreetingErrorCode = "NAME_EMPTY" | "NAME_TOO_LONG" | "NAME_INVALID";

/** A submitted name breaks a greeting rule; the caller can fix the input and retry. */
export class GreetingError extends ValidationError {
  declare readonly code: GreetingErrorCode;

  /**
   * @param params.code - stable business code
   * @param params.message - English, for logs only; never shown to a user
   */
  constructor(params: { code: GreetingErrorCode; message: string }) {
    super(params);
  }
}
