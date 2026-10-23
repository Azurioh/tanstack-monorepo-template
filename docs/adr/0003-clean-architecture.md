# 0003. Clean architecture

**Status**: Accepted
**Date**: 2026-10-23
**Applies to**: `apps/*`, `packages/*`

## Context

Applications built from this template start small and grow for years. Code that imports its
framework, database client or vendor SDK directly from business rules becomes hard to test and
impossible to migrate piece by piece. A shared rule from day one is cheaper than a later rewrite.

## Decision

- **Dependencies point inward.** Domain and application code never import a framework, a database
  client, UI code or a vendor SDK. They depend on ports (TypeScript interfaces) that describe what
  they need.
- **Ports and adapters.** Adapters implement ports at the edges: an HTTP client, a database
  repository, an email provider. The composition root of each app wires adapters to ports.
- **In-memory adapters for tests.** Every adapter that talks to the outside world has an
  in-memory implementation of the same port, so use cases are tested fast and deterministically
  without network or database.
- **Feature-first folders.** Inside an app, code is grouped by feature (for example
  `src/features/<feature>/`), each feature holding its own domain, application and adapter code.
- **No cross-feature imports.** A feature never imports another feature. Code needed by several
  features moves to a `shared/` area of the app or to a workspace package under `packages/`.
- **Aliases, not traversal.** Imports use TypeScript path aliases or workspace package names,
  never `../../`.

## Alternatives considered

- Layer-first folders (`controllers/`, `services/`, `repositories/`): rejected, a single feature
  is spread over the whole tree and cannot be deleted or reviewed in one place.
- Framework-native structure only: rejected, it couples business rules to the framework's
  lifecycle and makes them hard to test in isolation.

## Consequences

- Use cases are unit-tested with in-memory adapters; integration tests cover adapters separately.
- Adding an external service means defining a port first, then an adapter and its in-memory twin.
- Some indirection is added for trivial features; that cost is accepted for a consistent rule.
- Spec 2 introduces the first app (`apps/web`) and applies these rules to it; boundary checks can
  be automated there.
