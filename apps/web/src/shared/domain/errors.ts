const SCREAMING_SNAKE_CASE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

/**
 * @param value - candidate business error code
 * @returns whether `value` has the shape of a business error code (SCREAMING_SNAKE_CASE)
 */
export function isErrorCode(value: string): boolean {
  return SCREAMING_SNAKE_CASE.test(value);
}

/** Category of a business error; the transport maps it to its own error shape. */
export type DomainErrorKind = "validation" | "configuration";

/**
 * Base class of every business error.
 *
 * `code` is a stable SCREAMING_SNAKE_CASE identifier the client maps to its own copy;
 * `message` is English, for logs only, and never shown to a user.
 */
export abstract class DomainError extends Error {
  abstract readonly kind: DomainErrorKind;
  readonly code: string;

  constructor(params: { code: string; message: string }) {
    if (!isErrorCode(params.code)) {
      throw new TypeError(`Error code "${params.code}" is not SCREAMING_SNAKE_CASE`);
    }
    super(params.message);
    this.name = new.target.name;
    this.code = params.code;
  }
}

/** Input that breaks a business rule; the caller can fix it. */
export abstract class ValidationError extends DomainError {
  readonly kind = "validation";
}

/** Invalid or missing server configuration, detected at startup. */
export class ConfigurationError extends DomainError {
  readonly kind = "configuration";
}
