# Errors and logging (every app and package)

- **No silent error.** A caught error is handled (the code continues with a stated fallback) or
  rethrown. A `catch` that only logs logs at `warn` or above with the original error attached and
  a comment saying why the flow continues. Empty `catch` blocks and `.catch(() => {})` are
  defects.
- **One business-error taxonomy.** Expected failures extend `DomainError`
  (`src/shared/domain/errors.ts`): a `kind` the transport maps and a stable SCREAMING_SNAKE_CASE
  `code` the client maps to copy. The error's `message` is English, for logs only, never shown.
- **One mapping point.** `mapErrors` in `src/shared/server/rpc/errors.ts` turns a business error
  the caller can fix into `BAD_REQUEST` with `data: { code }`, and any other error into
  `INTERNAL_SERVER_ERROR` with `data: { referenceId }`, logged once with that reference. A
  procedure never builds an `ORPCError` itself and never leaks a stack or an internal message.
- **Shared schemas speak in codes.** A zod issue message in `schemas.ts` is a business code, so a
  rejected input reaches the client in the same `{ code }` shape as a domain error.
- **Explicit to the user.** The client maps every known code to a sentence in the feature's
  `client/copy.ts` (a `satisfies Record<Code, string>` keeps the map complete) that names what
  failed and what to do. The generic message is only for unexpected errors, and shows the
  reference id when the server returned one.
- **Structured logs only**, through the injected `Logger` (`shared/server/logging/logger.ts`):
  one JSON object per line, context in fields, never `console.*`, never string concatenation.
  Errors are logged once, at the boundary that handles them; inner layers throw.
- **Never in a log or an error message**: secrets, tokens, cookies, authorization headers,
  personal data beyond an id. The logger redacts secret-looking field names; do not rely on it
  for values placed in the message text.
