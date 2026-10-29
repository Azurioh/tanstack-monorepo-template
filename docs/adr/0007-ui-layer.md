# 0007. UI layer

**Status**: Accepted
**Date**: 2026-10-23
**Applies to**: `apps/*` (web applications), shared UI packages under `packages/`

## Context

Every web application created from this template is a TanStack Start (React) app. Without a shared
decision, each project picks its own styling approach, component library and form library, and
components end up mixing rendering with data fetching and state logic, which makes them hard to
test and to restyle.

## Decision

- **Tailwind CSS** is the styling system. No other CSS framework or CSS-in-JS runtime.
- **shadcn/ui** is the only component base. Components are copied into the codebase and owned by
  the project, built on accessible primitives; no second component library is added.
- **View / ViewModel split.** A View is a presentational component: it receives data and callbacks
  through props and renders them, with no data fetching and no business logic. A ViewModel is a
  hook that owns state, data fetching and actions for that View and exposes exactly what the View
  needs. Views are tested by rendering them with plain props; ViewModels are tested without the
  DOM.
- **Forms use zod and `useReducer`, no form library** (amended 2026-10-26, see Amendments). The
  feature's zod schema is shared with the RPC procedure input; the ViewModel validates with it and
  keeps the form state in a `useReducer`.
- The first application (`apps/web`) implements this decision in spec 2; until then no UI code
  exists in the repository.

## Alternatives considered

- A packaged component library (MUI, Chakra, Mantine): rejected, its styling system competes with
  Tailwind and its components cannot be edited in place.
- Logic inside components: rejected, rendering and behaviour cannot be tested or replaced
  separately.
- React Hook Form: rejected, a form library is not needed (see Amendments).
- TanStack Form: chosen in the first version of this ADR, replaced by zod and `useReducer` (see
  Amendments).

## Consequences

- Visual changes touch Views only; behaviour changes touch ViewModels only.
- Projects own their component source and update shadcn/ui components deliberately, not through a
  dependency bump.
- Each screen has two files (View and ViewModel) instead of one; accepted for testability.

## Amendments

### 2026-10-26: forms without a form library

The first version of this ADR chose TanStack Form. Spec 2 replaces it, with the maintainer's
agreement:

- One zod schema per form lives in the feature's `schemas.ts` and is used both as the RPC
  procedure input ([ADR 0011](./0011-rpc-transport.md)) and for client-side validation, so client
  and server cannot disagree on a rule.
- The ViewModel keeps the form state in a `useReducer` with an explicit status (`idle`,
  `invalid`, `submitting`, `succeeded`, `failed`) and maps validation issues and server errors
  to copy by business code.
- No form library is a dependency. The demo form has one field; a library would add an API to
  learn and a second validation path for no behaviour the reducer does not already give.

Consequence: a large multi-step form may justify a form library later; adding one requires a
superseding ADR.
