# Implementation Plan: Shared Architecture Rules Package

**Branch**: `003-shared-arch-rules` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-shared-arch-rules/spec.md`

## Summary

The architecture lint rules and the template-specific agent rules move into one published
package, `@azurioh/arch-rules`, which lives in `packages/arch-rules`. It contains:

- a Biome preset (`preset.jsonc`, exported as `./biome`) holding the `ARCH-*` overrides;
- the GritQL plugins, registered through a Biome plugin manifest;
- the fixture suite, run against the real package resolution;
- a dependency-free CLI with three commands: `sync`, `check` and `layout`.

release-please releases the package as its own component, and CI publishes it to npm with
trusted publishing. The template then becomes the first consumer: it depends on the published
version, deletes its copies, and receives updates through Dependabot like every other project.

The Phase 0 spike settled the riskiest assumption: a preset and its Grit plugins resolve from
`node_modules` (research R1–R3).

## Technical Context

**Language/Version**: TypeScript 7.0.2 (strict), Node 24.22.1 (`.node-version`).

**Primary Dependencies**:
- Biome 2.6.x: a peer dependency, `>=2.6.3 <3.0.0`; the repo pins the exact version.
- No runtime dependency: the CLI uses `node:fs`, `node:path` and `node:util`'s `parseArgs`.

**Storage**: N/A (files only).

**Testing**: Vitest 5.0.5.
- Package: the rule fixtures and the completeness check, plus CLI unit tests (sync, check,
  layout) against temporary directories.
- Template: the parity test, one violating case per id (R8).

**Target Platform**: Node 24 in CI and on developer machines. Published to the public npm
registry.

**Project Type**: a library with a CLI, as a workspace package.

**Performance Goals**: `arch-rules check` and `layout` each finish in under 1 s on the template.
The fixture suite stays within today's `rules.test.ts` budget.

**Constraints**:
- No private names (FR-014).
- Exact pins for dependencies.
- Zero warnings.
- No long-lived npm token (R6).
- Required checks and rulesets unchanged.
- PRs at most 400 lines / 15 files outside moves (stacked).

**Scale/Scope**:
- 7 rule ids, 4 Grit plugins and 12 overrides.
- 4 agent-rule files.
- 1 consumer in this repo; 3 private repos later, which are not migrated (out of scope).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Clean Architecture | Tooling package with no app layers. The CLI keeps file-system access at the edge: pure functions compute file states and layout violations, and a thin `cli.ts` does the I/O. Tests use temporary directories, not mocks. | Pass |
| II. Feature-First | Shared, versioned code goes in `packages/`, which is the principle's own wording. No `../../` inside the package. | Pass |
| III. Quality Gates | The package joins `lint`, `typecheck`, `test`, `knip` and `build` through Turborepo. `check` adds `arch-rules check` and `layout`. | Pass |
| IV. Reproducibility | The template pins the package exactly. Updates come only through Dependabot. The peer range on Biome is a compatibility contract, not an install range. | Pass |
| V. Conventional Commits & Releases | New release-please component `arch-rules`. Rule changes use `feat(arch-rules)!` / `fix(arch-rules)`. | Pass |
| VI. Branch Flow | No ruleset change: no new required job. | Pass |
| VII. ADRs | ADR 0012 records the distribution. ADR 0010 is amended to say where enforcement now lives, and keeps its rules. | Pass |
| VIII. Open-Source Hygiene | The package has a README and a LICENSE (MIT), and the docs are in English. | Pass |

Re-check after Phase 1: still passing. The contracts add no layer, no global and no unpinned
dependency.

## Project Structure

### Documentation (this feature)

```text
specs/003-shared-arch-rules/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── cli.md
│   └── preset.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/arch-rules/                 # new, published as @azurioh/arch-rules
├── package.json                     # exports ./biome, bin arch-rules, files, peer @biomejs/biome
├── README.md                        # rules table, adopt, add rules, update PR turned red
├── LICENSE
├── CHANGELOG.md                     # release-please
├── preset.jsonc                     # moved from root biome.jsonc (ARCH overrides + plugin registrations)
├── biome-manifest.jsonc
├── plugins/*.grit                   # moved from scripts/biome/
├── rules/                           # agent rules
│   ├── clean-architecture.md        # moved from .claude/rules/
│   ├── errors.md                    # moved
│   ├── ui.md                        # moved
│   └── arch-enforcement.md          # extracted from architecture.md (App layout + ARCH list)
├── src/
│   ├── cli.ts                       # parseArgs, dispatch, exit codes (I/O edge)
│   ├── agent-rules.ts               # pure: compare shipped vs local, plan sync
│   ├── feature-layout.ts            # moved from apps/web/tests/architecture/
│   └── rule-ids.ts                  # moved
├── tests/
│   ├── rules.test.ts                # moved; temp consumer extends the package by specifier
│   ├── layout.test.ts               # moved
│   └── agent-rules.test.ts          # new
├── tsconfig.json                    # extends @repo/tsconfig/library.json
└── vitest.config.ts

biome.jsonc                          # becomes: extends @azurioh/arch-rules/biome + project settings
scripts/biome/                       # deleted
apps/web/tests/architecture/         # rules/layout tests deleted; arch-ids.test.ts (parity) added
.claude/rules/arch-rules/            # synced copies (managed header)
.claude/rules/architecture.md        # keeps the marker blocks, test layout and accepted global; points to arch-rules/
.claude/rules/workflow.md            # references updated
package.json                         # devDependency @azurioh/arch-rules (exact, registry); check runs arch-rules
turbo.json                           # inputs no longer reference scripts/biome; root task for arch-rules check/layout
release-please-config.json           # + packages/arch-rules component, root excludes it
.release-please-manifest.json        # + packages/arch-rules
.github/workflows/release-please.yml # + publish-arch-rules job (OIDC)
.github/dependabot.yml               # npm daily + arch-rules group
docs/adr/0012-shared-architecture-rules-package.md, docs/adr/0010-*.md (amended), README, CONTRIBUTING
```

**Structure Decision**: a single new workspace package, `packages/arch-rules`, next to
`packages/ui` and `packages/tsconfig`. Every rule asset moves there, and the template keeps only
project settings, the parity test and the synced copies.

## Delivery order

Delivery is ordered by the bootstrap of R5. Each step is a pull request into `staging`, stacked
when it exceeds the size cap.

1. **Package, rules and fixtures**.
   - Create `packages/arch-rules`: preset, manifest, plugins, moved fixtures, CLI, tests,
     README, LICENSE, release-please component and publish job, ADR 0012.
   - The template still uses its own copies, untouched, so both run in parallel.
   - Proof: the package's tests and the template's existing tests are both green.
2. **First release (maintainer)**.
   - Promote to `main` and merge the release PR (`arch-rules-v1.0.0`).
   - The maintainer runs the one-time manual `pnpm pack` + `npm publish <tgz>` from the tag,
     then registers the trusted publisher (R6).
   - This step is documented in the package README under "Maintainers".
3. **Template switches to the package**.
   - Add the exact registry dependency, `extends` the preset, delete `scripts/biome/` and the
     moved tests, add the parity test.
   - `sync` the agent rules, which moves them to `.claude/rules/arch-rules/`, and update the
     references.
   - Wire `arch-rules check` and `layout` into `check`, switch Dependabot to daily, and amend
     ADR 0010.
   - Proof: quickstart §2 to §5.
4. **Live loop**. The next rule change is released by CI with OIDC, and the Dependabot pull
   request appears in the template (quickstart §6). The first CI publish is the live test of
   R6 and R7.

## Risks

| Risk | Mitigation |
|---|---|
| The `<pkg>/<rule>` plugin specifier was found by testing; I could not find it documented, so a Biome upgrade could change it (R2). | The fixtures run through the real resolution, so a Biome bump that breaks it fails `check` on the Dependabot PR that brings it. |
| A consumer override on a preset glob silently replaces `ARCH-*` restrictions (R3). | The docs forbid it, and the parity test in each consumer fails when an id stops firing. |
| Dependabot does not open pnpm 12 update PRs, which has never been observed here (R7). | Checked live in step 4; the fallback is dispatching from the publish job, built only if the check fails. |
| The `@azurioh` scope is not owned on npm (R4). | The maintainer confirms the scope before step 1 is merged. A rename touches only the package name and the docs. |
| pnpm links the workspace package instead of the registry one (R5). | `pnpm why` in step 3, and `link-workspace-packages: false` stated explicitly in `pnpm-workspace.yaml` if the default differs. |

## Complexity Tracking

No constitution violation.
