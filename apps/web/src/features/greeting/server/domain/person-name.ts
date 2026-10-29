import { GreetingError } from "@/features/greeting/server/domain/greeting-error";

/** Longest accepted name, counted after trimming. */
export const PERSON_NAME_MAX_LENGTH = 50;

const CONTROL_CHARACTER = /\p{Cc}/u;

/** The name of the person to greet: trimmed, 1–50 characters, no control characters. */
export class PersonName {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  /**
   * Validates and normalizes a raw name.
   *
   * @param raw - the name as submitted
   * @returns the trimmed name
   * @throws GreetingError `NAME_EMPTY`, `NAME_TOO_LONG` or `NAME_INVALID`
   */
  static create(raw: string): PersonName {
    const value = raw.trim();
    if (value.length === 0) {
      throw new GreetingError({ code: "NAME_EMPTY", message: "Name is empty after trimming" });
    }
    if (value.length > PERSON_NAME_MAX_LENGTH) {
      throw new GreetingError({
        code: "NAME_TOO_LONG",
        message: `Name exceeds ${PERSON_NAME_MAX_LENGTH} characters`,
      });
    }
    if (CONTROL_CHARACTER.test(value)) {
      throw new GreetingError({
        code: "NAME_INVALID",
        message: "Name contains control characters",
      });
    }
    return new PersonName(value);
  }
}
