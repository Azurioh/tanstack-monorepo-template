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
- **TanStack Form** handles forms, with schema validation, in the ViewModel layer.
- The first application (`apps/web`) implements this decision in spec 2; until then no UI code
  exists in the repository.

## Alternatives considered

- A packaged component library (MUI, Chakra, Mantine): rejected, its styling system competes with
  Tailwind and its components cannot be edited in place.
- Logic inside components: rejected, rendering and behaviour cannot be tested or replaced
  separately.
- React Hook Form: rejected in favour of TanStack Form, which shares the type-safety approach of
  the rest of the TanStack stack.

## Consequences

- Visual changes touch Views only; behaviour changes touch ViewModels only.
- Projects own their component source and update shadcn/ui components deliberately, not through a
  dependency bump.
- Each screen has two files (View and ViewModel) instead of one; accepted for testability.
