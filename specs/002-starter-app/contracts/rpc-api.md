# Contract: RPC API

Single endpoint: `ANY /api/rpc/*`, oRPC RPC protocol, router type exported from
`src/shared/server/rpc/router.ts` (`export type AppRouter`).

| Procedure | Input | Output | Errors |
|---|---|---|---|
| `greeting.greet` | `{ name: string }` (shared schema: trimmed, 1–50 chars) | `GreetingDto` | `BAD_REQUEST` `{ code: NAME_EMPTY \| NAME_TOO_LONG \| NAME_INVALID }`; `INTERNAL_SERVER_ERROR` `{ referenceId }` |
| `greeting.listRecent` | none | `GreetingDto[]` (newest first, ≤ `GREETING_HISTORY_LIMIT`) | `INTERNAL_SERVER_ERROR` `{ referenceId }` |

`GreetingDto`: `{ id: string, name: string, message: string, createdAt: string /* ISO 8601 */ }`.

Rules:

- Procedures validate input, call one use case, map the result; they hold no business logic.
- Business errors map to `BAD_REQUEST` with a stable `code`; the client renders the copy for
  that code from `copy.ts`. Unexpected errors are logged once server-side with a `referenceId`;
  the client shows a generic message with the reference.
- The client is isomorphic: browser calls go to `/api/rpc`; server-side rendering calls the same
  link with the incoming request's origin and headers.
