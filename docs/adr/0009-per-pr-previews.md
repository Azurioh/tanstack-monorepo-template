# 0009. Opt-in per-pull-request previews

**Status**: Accepted
**Date**: 2026-10-23
**Applies to**: `apps/*`, `.github/workflows/`, deployment configuration

Not yet implemented — see spec 3.

## Context

Reviewing a user-facing change from its diff alone is slow and misses visual and integration
issues. Shared environments (`staging`, `demo`) only show a change after it is merged. Previews are
useful but not free: each one consumes server resources and, if it shares a database with another
environment, can corrupt that environment's data.

## Decision

- **Opt-in.** A pull request gets a preview only when explicitly requested (for example by adding
  a dedicated label); there is no preview by default.
- **One preview per pull request**, built from the same CI image pipeline as ADR 0008 and deployed
  through Dokploy with a URL derived from the pull request number.
- **Isolated database per preview.** Each preview gets its own freshly created database, seeded
  with non-production data. A preview never connects to the database of another environment.
- **Automatic cleanup.** Closing or merging the pull request, or removing the opt-in, destroys the
  preview and its database.

## Alternatives considered

- A preview for every pull request: rejected, it wastes resources on dependency updates and
  documentation changes.
- Previews sharing the `staging` database: rejected, migrations and test data from one pull
  request would affect every other environment using it.

## Consequences

- Reviewers can try a change before merging it, at the cost of server resources only when asked.
- Database migrations run against a disposable database first, which surfaces failures early.
- Preview lifecycle (create, update on push, destroy) must be fully automated; spec 3 implements
  it.
