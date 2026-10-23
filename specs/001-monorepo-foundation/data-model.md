# Data Model: Monorepo Foundation

No runtime data. The "entities" are the configuration artifacts the template defines and the rules
that keep them valid.

## Workspace package

| Field | Rule |
|---|---|
| `name` | `@repo/<dir>`; the root package is `tanstack-monorepo-template` |
| `private` | `true` (nothing is published to npm) |
| `type` | `module` |
| `version` | `0.0.0` for packages; root version owned by release-please |
| `scripts` | subset of `lint`, `typecheck`, `test`, `build`; names match `turbo.json` tasks |
| dependency specifiers | exact versions or `workspace:*`; never `^`/`~` ranges |

Relationships: every package extends `@repo/tsconfig`; `packages/example` depends on
`@repo/tsconfig` (`workspace:*`) as a dev dependency.

## Ruleset definition (`.github/rulesets/<branch>.json`)

| Field | Rule |
|---|---|
| `name` | `protect-<branch>`; unique key used by the setup script for idempotent upsert |
| `target` | `branch` |
| `enforcement` | `active` |
| `conditions.ref_name.include` | exactly `["refs/heads/<branch>"]`; `exclude: []` |
| `bypass_actors` | `[]` |
| `rules` | see [contracts/rulesets.md](./contracts/rulesets.md) |

One file per promotion branch: `staging`, `demo`, `main`.

## ADR

| Field | Rule |
|---|---|
| file name | `NNNN-kebab-slug.md`, 4-digit, contiguous, never reused |
| title | `# NNNN. <Title>` |
| Status | `Proposed` → `Accepted` → (`Superseded by NNNN` \| `Deprecated`); a superseded ADR is kept |
| Date | ISO `YYYY-MM-DD` of the last status change |
| Applies to | repository area(s) or `whole repository` |
| sections | `## Context`, `## Decision`, `## Consequences` (in that order) |
| index | one row in `docs/adr/README.md` per file; index and files must match |

State transitions: `Proposed → Accepted`, `Accepted → Superseded`, `Accepted → Deprecated`.
ADRs 0008 and 0009 are `Accepted` with a "Not yet implemented — see spec 3" note.

## Release manifest

| Artifact | Rule |
|---|---|
| `release-please-config.json` | one package entry `"."` with `release-type: node` until spec 2 adds apps |
| `.release-please-manifest.json` | `{ ".": "<current version>" }`, written only by release-please |
| `CHANGELOG.md` | generated; never edited by hand |

## Dependabot update group

| Group | Patterns | Ecosystem |
|---|---|---|
| `tanstack` | `@tanstack/*` | npm |
| `tooling` | `@biomejs/biome`, `turbo`, `knip`, `lefthook`, `@commitlint/*`, `typescript`, `vitest` | npm |
| `types` | `@types/*` | npm |
| `actions` | `*` | github-actions |

All groups target `staging`.
