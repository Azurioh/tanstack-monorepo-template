# Implementation Plan: Monorepo Foundation

**Branch**: `001-monorepo-foundation` | **Date**: 2026-10-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-monorepo-foundation/spec.md`

## Summary

Turn the empty `azurioh/tanstack-monorepo-template` repository into a verified monorepo baseline:
pnpm workspace orchestrated by Turborepo, shared strict TypeScript 7 configuration, Biome / Vitest /
knip quality gates enforced locally by Lefthook + commitlint and remotely by a SHA-pinned GitHub
Actions CI, release-please and Dependabot automation, versioned branch rulesets applied by an
idempotent `scripts/setup-repo.sh`, the full open-source file set, and ADRs 0001–0009. A minimal
`packages/example` package keeps every pipeline task non-empty until the starter app (spec 2).

## Technical Context

**Language/Version**: TypeScript 7.0.2 (native compiler, strict) on Node.js 24.22.1 LTS; Bash for
`scripts/setup-repo.sh`

**Primary Dependencies**: pnpm 12.15.0, turbo 2.11.10, @biomejs/biome 2.6.2, vitest 5.0.5,
knip 6.42.1, lefthook 2.2.2, @commitlint/cli + @commitlint/config-conventional 21.2.4,
@types/node 24.19.2 (see [research.md](./research.md))

**Storage**: N/A

**Testing**: Vitest for the placeholder package; shellcheck for the setup script; end-to-end
validation of hooks, CI, rulesets and release automation through [quickstart.md](./quickstart.md)

**Target Platform**: macOS / Linux developer machines; GitHub (Actions, rulesets, Dependabot)

**Project Type**: monorepo template (tooling + documentation, no runtime application yet)

**Performance Goals**: full check suite on a fresh clone < 5 min (SC-001); warm Turbo cache run
< 10 s

**Constraints**: zero errors and zero warnings; exact pins only; every third-party action pinned to
a commit SHA; no private-project content in ADRs; documentation in English

**Scale/Scope**: ~60 files: 3 workspace packages (root, `packages/tsconfig`, `packages/example`),
4 workflow/config files under `.github/`, 3 rulesets, 1 script, 7 OSS documents, 9 ADRs + index

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Clean Architecture | No domain code in this feature; `packages/example` is a pure function with no I/O. ADR 0003 codifies the rule for later specs. | PASS |
| II. Feature-First Structure | `apps/` (empty, `.gitkeep`) + `packages/`; cross-package imports by workspace name (`@repo/*`), no `../../`. | PASS |
| III. Quality Gates | Biome `--error-on-warnings`, `tsc --noEmit`, Vitest, knip; Lefthook pre-commit + commit-msg; CI blocks merge; `useBlockStatements: error`. | PASS |
| IV. Reproducibility | `packageManager`, `.node-version`, `save-exact=true`, versions verified on registry; `@types/node` on the runtime major per constitution 1.1.0 ("compatible with the pinned runtime"). | PASS |
| V. Conventional Commits & Releases | commitlint conventional preset, PR title check, squash into `staging`, merge commit for promotions, release-please on `main`. | PASS |
| VI. Branch Flow & Repository Rules | `staging` → `demo` → `main`; rulesets in `.github/rulesets/`; `scripts/setup-repo.sh`. | PASS |
| VII. ADRs | ADRs 0001–0009 + index in `docs/adr/`. | PASS |
| VIII. Open-Source Hygiene | Full community profile set, CODEOWNERS, Dependabot, CI, description + topics. | PASS |

Post-design re-check (after Phase 1): PASS — contracts and data model introduce no new
dependency, layer or exception.

## Project Structure

### Documentation (this feature)

```text
specs/001-monorepo-foundation/
├── plan.md              # This file
├── research.md          # Phase 0: decisions, versions, open risks
├── data-model.md        # Phase 1: workspace packages, rulesets, ADR, scripts
├── quickstart.md        # Phase 1: end-to-end validation guide (maps to SC-001..SC-008)
├── contracts/
│   ├── root-scripts.md  # Root package.json script interface
│   ├── setup-repo.md    # scripts/setup-repo.sh CLI contract
│   └── rulesets.md      # Ruleset JSON shape and required status checks
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
.
├── apps/
│   └── .gitkeep                       # starter app arrives in spec 2
├── packages/
│   ├── tsconfig/                      # @repo/tsconfig — base.json (strict), library.json
│   │   └── package.json
│   └── example/                       # @repo/example — placeholder exercising every task
│       ├── src/index.ts
│       ├── src/index.test.ts
│       ├── package.json
│       └── tsconfig.json
├── docs/
│   └── adr/
│       ├── README.md                  # index: number, title, status, scope + "By scope"
│       ├── template.md                # copy-me ADR skeleton
│       └── 0001-…0009-*.md
├── scripts/
│   └── setup-repo.sh
├── .github/
│   ├── actions/setup/action.yml       # composite: pnpm + node + install
│   ├── workflows/ci.yml               # jobs: check, pr-title
│   ├── workflows/release-please.yml
│   ├── rulesets/{staging,demo,main}.json
│   ├── ISSUE_TEMPLATE/{bug_report,feature_request,config}.yml
│   ├── pull_request_template.md
│   ├── CODEOWNERS
│   ├── repository.json                # description + topics read by setup-repo.sh
│   └── dependabot.yml
├── .specify/ · .claude/               # personal tooling, documented as removable
├── biome.jsonc · turbo.json · knip.json · lefthook.yml · commitlint.config.ts · tsconfig.json
├── release-please-config.json · .release-please-manifest.json
├── pnpm-workspace.yaml · package.json · pnpm-lock.yaml · .npmrc · .node-version
├── .editorconfig · .gitignore
└── README.md · LICENSE · CONTRIBUTING.md · CODE_OF_CONDUCT.md · SECURITY.md · CHANGELOG.md (generated)
```

**Structure Decision**: Turborepo-style `apps/` + `packages/` with the `@repo/*` scope (renamed per
project by spec 3's generator). Root holds only tooling config; every tool config is single-source
at the root except `tsconfig`, which is a workspace package so apps extend it by name.

## Implementation Phases (input for `/speckit-tasks`)

1. **Workspace skeleton** — root `package.json` (`private`, `packageManager`, `engines`, scripts per
   [contracts/root-scripts.md](./contracts/root-scripts.md)), `pnpm-workspace.yaml`, `.npmrc`
   (`save-exact=true`, `engine-strict=true`), `.node-version`, `.gitignore`, `.editorconfig`,
   `turbo.json`, `packages/tsconfig`, `packages/example`. Dependencies added with `pnpm add -E`.
2. **Quality gates** — `biome.jsonc`, `knip.json`, Vitest in `packages/example`; `pnpm check` green
   with zero warnings; verify knip under TS 7 (fallback per research).
3. **Hooks** — `lefthook.yml`, `commitlint.config.ts`, `prepare` script; verify an invalid message
   is rejected and a scoped / breaking message accepted.
4. **CI & automation** — composite setup action, `ci.yml`, `release-please.yml` + config/manifest,
   `dependabot.yml`; all actions SHA-pinned.
5. **Repository rules** — `.github/rulesets/*.json` per [contracts/rulesets.md](./contracts/rulesets.md),
   `scripts/setup-repo.sh` per [contracts/setup-repo.md](./contracts/setup-repo.md), shellcheck clean.
6. **Open-source files** — README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue forms, PR
   template, CODEOWNERS.
7. **ADRs** — `docs/adr/template.md`, 0001–0009, index README.
8. **Validation** — run [quickstart.md](./quickstart.md) end to end (local + throwaway GitHub repo).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Spec Kit + `.claude/` ship in a public template | Primary user is the owner, who uses them on every project (FR-033) | Removing them forces a manual re-install per project; isolation + README note keeps them removable |
