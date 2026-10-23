---

description: "Task list for the monorepo foundation"
---

# Tasks: Monorepo Foundation

**Input**: Design documents from `/specs/001-monorepo-foundation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: no TDD requested. Verification tasks (V-prefixed descriptions) check each story against
its acceptance scenarios and the quickstart.

**Organization**: grouped by user story (US1 baseline, US2 commits/releases, US3 repository rules,
US4 docs/ADRs).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: user story from spec.md
- Versions: re-verify each on the registry before adding (`npm view <pkg> version`); research.md
  values are the floor. Every dependency is added with `pnpm add -E`, never by editing manifests.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: workspace skeleton

- [X] T001 Create root `package.json` with `"name": "tanstack-monorepo-template"`, `"private": true`, `"type": "module"`, `"packageManager": "pnpm@12.15.0"`, `"engines": { "node": ">=24.22.1" }` in package.json
- [X] T002 [P] Create `pnpm-workspace.yaml` listing `apps/*` and `packages/*`
- [X] T003 [P] Create `.npmrc` with `save-exact=true` and `engine-strict=true`
- [X] T004 [P] Create `.node-version` containing `24.22.1`
- [X] T005 [P] Create `.gitignore` (node_modules, .turbo, dist, coverage, .env*, !.env.example, *.log, .DS_Store)
- [X] T006 [P] Create `.editorconfig` (utf-8, lf, 2-space indent, final newline, trim trailing whitespace; markdown keeps trailing whitespace)
- [X] T007 [P] Create `apps/.gitkeep`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: packages and task orchestration every story relies on

- [X] T008 Add `turbo` and `typescript` as exact root dev dependencies (`pnpm add -E -D -w turbo typescript`) in package.json
- [X] T009 Create `turbo.json` with `$schema: https://turborepo.dev/schema.json`, package tasks `typecheck`, `test`, `build` (`dependsOn: ["^build"]`, `outputs: ["dist/**"]`) and root tasks `//#lint`, `//#typecheck`, `//#knip` (per contracts/root-scripts.md: root scripts implement root tasks and never call `turbo`)
- [X] T010 [P] Create `@repo/tsconfig` in packages/tsconfig/package.json (`private`, `version: 0.0.0`, `files`) with packages/tsconfig/base.json (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `module`/`moduleResolution` `NodeNext`, `target` ES2024, `skipLibCheck`) and packages/tsconfig/library.json extending base
- [X] T011 Create `@repo/example` in packages/example/package.json (`private`, `type: module`, `version: 0.0.0`, `exports: ./src/index.ts`, dev dependency `@repo/tsconfig: workspace:*`) and packages/example/tsconfig.json extending `@repo/tsconfig/library.json`
- [X] T012 Implement pure placeholder function in packages/example/src/index.ts (no I/O, braced conditionals)
- [X] T013 Run `pnpm install` and confirm `pnpm-lock.yaml` is created and `grep -E '"[~^]' package.json packages/*/package.json` prints nothing

**Checkpoint**: workspace resolves, Turbo sees 2 packages (`pnpm turbo ls`)

---

## Phase 3: User Story 1 - Verified baseline (Priority: P1) 🎯 MVP

**Goal**: fresh clone → one command → every gate green; same gates in CI.

**Independent Test**: quickstart §1 locally; a PR with a lint error fails CI.

- [X] T014 [US1] Add `@biomejs/biome` (exact) and create biome.jsonc: `vcs { enabled: true, clientKind: "git", useIgnoreFile: true }`, `files.includes` excluding generated paths (`!**/CHANGELOG.md`, `!.specify`, `!pnpm-lock.yaml`), recommended rules, `linter.rules.style.useBlockStatements: "error"`, formatter 2 spaces / line width 100
- [X] T015 [US1] Add `vitest` (exact, in packages/example) and create packages/example/src/index.test.ts covering the placeholder function
- [X] T016 [US1] Add package scripts `typecheck` (`tsc --noEmit`) and `test` (`vitest run`) in packages/example/package.json — no package-level `lint` (Biome runs once at root)
- [X] T017 [US1] Add `knip` and `@types/node@24.19.2` (exact, root) and create knip.json with `workspaces` entries for `.` and `packages/*`
- [X] T018 [US1] Create root tsconfig.json extending `@repo/tsconfig/base.json` and including root `*.ts` config files only (add `@repo/tsconfig` as root dev dependency `workspace:*`); add root scripts per contracts/root-scripts.md (`check`, `lint`, `format`, `typecheck`, `knip`) in package.json
- [X] T019 [US1] Run `pnpm check` and fix until zero errors and zero warnings
- [X] T020 [US1] V: verify knip runs green under TypeScript 7.0.2 (open risk 1); if it fails on missing compiler API, add aliased TS 6 per research.md and record it for ADR 0002
- [X] T021 [P] [US1] Create composite action .github/actions/setup/action.yml (pnpm/action-setup v6.1.0 reading `packageManager`, actions/setup-node v7.1.0 with `node-version-file: .node-version` and `cache: pnpm`, `pnpm install --frozen-lockfile`), every action pinned to full commit SHA with `# vX.Y.Z` comment (resolve SHAs with `gh api`)
- [X] T022 [US1] Create .github/workflows/ci.yml: triggers `pull_request` and `push` to `staging`, `demo`, `main`; `permissions: contents: read`; `concurrency` cancel-in-progress per ref; job `check` (actions/checkout v7.0.1 SHA-pinned, `./.github/actions/setup`, `pnpm check`)
- [X] T023 [US1] V: time `pnpm install --frozen-lockfile && pnpm check` on a fresh clone (< 5 min, SC-001)

**Checkpoint**: US1 complete — baseline green locally; CI job `check` defined

---

## Phase 4: User Story 2 - Commits and releases (Priority: P1)

**Goal**: Conventional Commits enforced locally and in CI; release PR and dependency PRs automated.

**Independent Test**: quickstart §2, §4, §5, §6.

- [X] T024 [US2] Add `lefthook`, `@commitlint/cli`, `@commitlint/config-conventional`, `@commitlint/types` (exact, root) and root script `"prepare": "lefthook install"` in package.json
- [X] T025 [P] [US2] Create commitlint.config.ts exporting `{ extends: ["@commitlint/config-conventional"] }` typed with `UserConfig`
- [X] T026 [P] [US2] Create lefthook.yml: `pre-commit` → `pnpm exec biome check --write --staged --no-errors-on-unmatched --error-on-warnings` with `stage_fixed: true`; `commit-msg` → `pnpm exec commitlint --edit {1}`
- [X] T027 [US2] V: `update stuff` rejected; `chore: verify hooks` and `feat(web)!: x` accepted; badly formatted staged file is fixed and re-staged (quickstart §2)
- [X] T028 [US2] Add job `pr-title` to .github/workflows/ci.yml (runs on `pull_request` types opened/edited/synchronize/reopened, amannn/action-semantic-pull-request v6.1.1 SHA-pinned, `pull-requests: read`)
- [X] T029 [P] [US2] Create release-please-config.json (package `"."`, `release-type: node`, `changelog-path: CHANGELOG.md`) and .release-please-manifest.json (`{ ".": "0.0.0" }`)
- [X] T030 [P] [US2] Create .github/workflows/release-please.yml: on push to `main`, `permissions: contents: write, pull-requests: write`, googleapis/release-please-action v5.0.0 SHA-pinned with manifest config
- [X] T031 [P] [US2] Create .github/dependabot.yml: ecosystems `npm` (directory `/`) and `github-actions` (directory `/`), `target-branch: staging`, weekly schedule, `versioning-strategy: increase` (npm), groups `tanstack` (`@tanstack/*`), `tooling` (`@biomejs/biome`, `turbo`, `knip`, `lefthook`, `@commitlint/*`, `typescript`, `vitest`), `types` (`@types/*`), `actions` (`*`); commit-message prefix `chore(deps)`
- [X] T032 [US2] Make knip ignore config-only dependencies it cannot trace (only if T019 rerun reports them) in knip.json, then rerun `pnpm check`

**Checkpoint**: US2 complete locally; remote half verified in Phase 7

---

## Phase 5: User Story 3 - Repository rules in one command (Priority: P2)

**Goal**: `scripts/setup-repo.sh` turns a blank repo into a protected one, idempotently.

**Independent Test**: quickstart §3 on a throwaway repository.

- [X] T033 [P] [US3] Create .github/rulesets/main.json, demo.json, staging.json exactly per contracts/rulesets.md (`name: protect-<branch>`, `enforcement: active`, `bypass_actors: []`, `ref_name.include: ["refs/heads/<branch>"]`, rules deletion, non_fast_forward, pull_request with 0 approvals, required_status_checks `check` + `pr-title`; `staging`: `allowed_merge_methods: ["squash"]` + required_linear_history; `demo`/`main`: `allowed_merge_methods: ["merge"]`, no linear history)
- [X] T034 [P] [US3] Create .github/repository.json with description and ≥ 5 lowercase topics (e.g. `tanstack-start`, `monorepo`, `turborepo`, `pnpm`, `template`, `typescript`, `biome`)
- [X] T035 [US3] Implement scripts/setup-repo.sh per contracts/setup-repo.md: `set -euo pipefail`, options `--repo`, `--template`, `--dry-run`, preconditions (gh auth, admin permission, `main` exists, rulesets parse with jq), steps 1–6 in order (step 3 enables squash + merge commit titled `PR_TITLE`, disables rebase; step 6 enables private vulnerability reporting) with `ok`/`skip`/`fail` output and exit codes 0/1/2; executable bit set
- [X] T036 [US3] V: `shellcheck scripts/setup-repo.sh` reports nothing; `--dry-run` against a repository prints the planned calls and changes nothing

**Checkpoint**: US3 script ready; live run in Phase 7

---

## Phase 6: User Story 4 - Documentation and ADRs (Priority: P2)

**Goal**: a reader finds how to start, contribute, report a vulnerability and why each choice was made.

**Independent Test**: quickstart §7, §8.

- [X] T037 [P] [US4] Write README.md: what/why, what's included, quick start (use template → `scripts/setup-repo.sh` → `pnpm install` → `pnpm check`), scripts table, structure tree, branch flow diagram, personal tooling section (`.specify/`, `.claude/` are removable), links to ADRs and CONTRIBUTING, license; badges (CI, license)
- [X] T038 [P] [US4] Write CONTRIBUTING.md: prerequisites, setup, scripts table, Conventional Commits with examples, branch flow and PR target `staging`, squash merge, ADR requirement for long-term decisions
- [X] T039 [P] [US4] Write CODE_OF_CONDUCT.md (Contributor Covenant 2.1, enforcement contact via GitHub)
- [X] T040 [P] [US4] Write SECURITY.md: supported versions (latest `main`), report via GitHub private vulnerability reporting, response expectations
- [X] T041 [P] [US4] Create .github/ISSUE_TEMPLATE/bug_report.yml, feature_request.yml (form `name` > 3 chars, labels) and config.yml (`blank_issues_enabled: false`, contact link to security policy)
- [X] T042 [P] [US4] Create .github/pull_request_template.md (what, why, verification checklist: `pnpm check`, ADR if needed, Conventional title)
- [X] T043 [P] [US4] Create .github/CODEOWNERS (`* @Azurioh`)
- [X] T044 [US4] Create docs/adr/template.md (title `# NNNN. Title`, `**Status**`, `**Date**`, `**Applies to**`, `## Context`, `## Decision`, `## Consequences`)
- [X] T045 [P] [US4] Write docs/adr/0001-record-architecture-decisions.md (numbering, header, statuses Proposed/Accepted/Superseded/Deprecated, superseding keeps the old file, index update rule)
- [X] T046 [P] [US4] Write docs/adr/0002-monorepo-layout-and-tooling.md (pnpm workspaces, Turborepo, `apps/` + `packages/`, `@repo/*`, TS 7 native + `@types/node` on runtime major; outcome of T020)
- [X] T047 [P] [US4] Write docs/adr/0003-clean-architecture.md (dependencies point inward, ports/adapters, in-memory adapters for tests, feature-first folders, no cross-feature imports)
- [X] T048 [P] [US4] Write docs/adr/0004-quality-gates.md (Biome only — why not ESLint under TS 7, zero warnings, Vitest, knip, Lefthook + commitlint, CI parity)
- [X] T049 [P] [US4] Write docs/adr/0005-dependency-versioning-and-releases.md (exact pins, latest stable on add, Dependabot groups → `staging`, Conventional Commits, squash, release-please manifest; Dependabot pnpm risk + fallback)
- [X] T050 [P] [US4] Write docs/adr/0006-branch-flow-and-repository-rules.md (`staging` → `demo` → `main`, reducible via superseding ADR; squash into `staging`, merge commit for promotions and why squashing promotions breaks the changelog and diverges branches; rulesets as code, no bypass, 0 approvals for solo / raise for teams)
- [X] T051 [P] [US4] Write docs/adr/0007-ui-layer.md (Tailwind + shadcn/ui as only base, View/ViewModel split, TanStack Form; implemented in spec 2)
- [X] T052 [P] [US4] Write docs/adr/0008-deployment.md (CI-built image → GHCR → Dokploy, environment per promotion branch; "Not yet implemented — spec 3")
- [X] T053 [P] [US4] Write docs/adr/0009-per-pr-previews.md (opt-in previews with isolated database per PR; "Not yet implemented — spec 3")
- [X] T054 [US4] Write docs/adr/README.md index (number, title, status, applies to) plus "By scope" section; every 0001–0009 file listed
- [X] T055 [US4] V: run quickstart §8 header checks; `pnpm check` still green after adding the JSON files

**Checkpoint**: all four stories complete locally

---

## Phase 7: Polish & Live Validation

**Purpose**: remote verification, open risks, final cleanliness

- [X] T056 Run full `pnpm check` and `shellcheck scripts/setup-repo.sh` one last time: zero errors, zero warnings
- [ ] T057 With the maintainer's OK, commit (Conventional Commits) and push to `azurioh/tanstack-monorepo-template` `main`, then run `scripts/setup-repo.sh --template` on it
- [ ] T058 V: quickstart §3 on a throwaway repository created from the template — rulesets active on a public personal repository (open risk 3), second run idempotent, direct push rejected
- [ ] T059 V: quickstart §4 and §5 — invalid PR title blocked, squash-only into `staging`, merge-commit-only promotions with no branch divergence, release PR opened after first `main` merge listing the feature commits
- [ ] T060 V: quickstart §6 — Dependabot parses the pnpm 12 lockfile and opens PRs on `staging` (open risk 2); if unsupported, record the outcome and mitigation in docs/adr/0005-dependency-versioning-and-releases.md
- [ ] T061 V: quickstart §7 and §9 — community profile complete, description + topics set, < 15 min to protected project
- [ ] T062 Delete the throwaway repository and mark checklists complete

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2)** → stories.
- **US1** depends on Phase 2. **US2** depends on US1 (T028 edits ci.yml from T022; hooks call Biome
  from T014). **US3** depends only on Phase 2 except the status check names, which come from
  ci.yml (T022, T028). **US4** is independent of code and can start after Phase 2; ADR 0002
  (T046) waits for T020 and ADR 0005 (T049) is finalized after T060.
- **Phase 7** needs all stories and the maintainer's approval to push.

## Parallel Opportunities

- Phase 1: T002–T007 together.
- US2: T025, T026, T029, T030, T031 together after T024.
- US3: T033 and T034 together, then T035.
- US4: T037–T043 and T045–T053 all in parallel (one file each); T054 last.

## Implementation Strategy

1. **MVP** = Phases 1–3 (US1): a green, CI-checked baseline — already usable as a template.
2. Add US2 (commit/release automation), then US3 (repository rules), then US4 (docs/ADRs).
3. Phase 7 validates everything live on GitHub; open risks resolved and recorded in ADRs.
