import { NAME_MAX_LENGTH } from "@/features/greeting/schemas";
import type { GreetingErrorCode } from "@/features/greeting/server";

const UNEXPECTED = "Something went wrong. Please try again.";

/** User-facing strings of the greeting feature (English only). */
export const greetingCopy = {
  page: {
    title: "Say hello",
    description: "Type a name and the server greets them. Recent greetings are listed below.",
  },
  form: {
    nameLabel: "Name",
    submit: "Greet",
    submitting: "Greeting…",
  },
  recent: {
    title: "Recent greetings",
    empty: "No greetings yet. Be the first to say hello.",
  },
  errors: {
    NAME_EMPTY: "Enter a name.",
    NAME_TOO_LONG: `Use ${NAME_MAX_LENGTH} characters or fewer.`,
    NAME_INVALID: "Remove line breaks and other control characters.",
  } satisfies Record<GreetingErrorCode, string>,
  unexpected: UNEXPECTED,
  unexpectedWithReference: (referenceId: string) => `${UNEXPECTED} Reference: ${referenceId}`,
};
