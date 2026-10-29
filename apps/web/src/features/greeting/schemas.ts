import { z } from "zod/mini";
import type { GreetingErrorCode } from "@/features/greeting/server/domain/greeting-error";

/** Longest accepted name after trimming; the server domain enforces the same rule. */
export const NAME_MAX_LENGTH = 50;

const CONTROL_CHARACTER = /\p{Cc}/u;

/**
 * Input of `greeting.greet`, validated by the form before any call and by the procedure.
 * Each issue message is the business error code the client renders the copy for.
 */
export const greetInputSchema = z.object({
  name: z.string().check(
    z.trim(),
    z.minLength(1, { error: "NAME_EMPTY" satisfies GreetingErrorCode }),
    z.maxLength(NAME_MAX_LENGTH, { error: "NAME_TOO_LONG" satisfies GreetingErrorCode }),
    z.refine((name) => !CONTROL_CHARACTER.test(name), {
      error: "NAME_INVALID" satisfies GreetingErrorCode,
    }),
  ),
});
