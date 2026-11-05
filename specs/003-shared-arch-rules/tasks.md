---

description: "Task list for the shared architecture rules package"
---

# Tasks: Shared Architecture Rules Package

**Input**: Design documents from `/specs/003-shared-arch-rules/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli.md,
contracts/preset.md, quickstart.md

**Tests**: Included. The constitution (III) and `.claude/rules/architecture.md` require every
change to be tested, and the spec makes the fixtures part of the feature (FR-005).

**Organization**: Phases follow the delivery order in plan.md.
- The package is built and released first (phases 1 to 6).
- Then the maintainer publishes it by hand once (phase 7).
- Then the template switches to it (phase 8).
- Then the live loop is checked (phase 9).

User stories map onto phases as follows:
- US2 (rules proven once) and the package side of US3 and US4 land before the release.
- US1 (consume from one package) needs a published version, so it lands after it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task).
- **[Story]**: The user story the task serves (US1 to US4).

## Pull request groups

Every pull request targets `staging`. A group stays at or under 400 lines and 15 files; groups
A1 and A2 copy existing code, and the copies count toward that cap.

| Group | Phases | Content |
|---|---|---|
| A1 | 1, 2 | Package skeleton, preset, plugin manifest, plugins, CLI dispatch, `layout` |
| A2 | 3 | Fixtures and completeness check, run through the package |
| B | 4 | Agent rules and `sync`/`check` |
| C | 5, 6 | release-please component, publish job, README, ADR 0012, Dependabot |
| D | 8 | Template switch (after the maintainer checkpoint) |

A1 → A2 → B → C is a GitHub stack (`/conventions:pr --stack`). D opens after phase 7.

---

## Phase 1: Setup (group A1)

**Purpose**: create an empty, buildable, publishable-shaped workspace package.

- [X] T001 Create `packages/arch-rules/package.json` with these fields:
  - `name` `@azurioh/arch-rules`, `version` `0.0.0`, `"private": false`, `license` `MIT`,
    `type` `module`;
  - `repository` `{ "type": "git", "url": "git+https://github.com/Azurioh/tanstack-monorepo-template.git", "directory": "packages/arch-rules" }`;
  - `exports` `{ "./biome": "./preset.jsonc" }`, `bin` `{ "arch-rules": "./dist/cli.js" }`;
  - `files` `["dist", "preset.jsonc", "biome-manifest.jsonc", "plugins", "rules"]`;
  - `peerDependencies` `{ "@biomejs/biome": ">=2.6.3 <3.0.0" }`;
  - scripts `build` (`tsc -p tsconfig.build.json`), `typecheck`, `test` (`vitest run`).

  Add dev dependencies with `pnpm add -E -D --filter @azurioh/arch-rules`: `@biomejs/biome` at
  the repo's version, `typescript`, `vitest`, `@types/node`, and `@repo/tsconfig` as
  `workspace:*`. Never hand-edit the manifest's dependency blocks.
- [X] T002 [P] Create the TypeScript configs:
  - `packages/arch-rules/tsconfig.json`, extending `@repo/tsconfig/library.json`, with `src/` and
    `tests/`;
  - `packages/arch-rules/tsconfig.build.json`, with `src/` only and `outDir` `dist`.
- [X] T003 [P] Create `packages/arch-rules/vitest.config.ts` (node environment, `tests/**/*.test.ts`).
- [X] T004 [P] Create `packages/arch-rules/LICENSE`, the MIT text copied from the root
  `LICENSE`.
- [X] T005 Register the package in `turbo.json`:
  - `build` outputs `dist/**`;
  - `test` inputs include `preset.jsonc`, `biome-manifest.jsonc`, `plugins/**` and `rules/**`;
  - `test` depends on `build`, since the fixture runner calls the real package.

  Add `packages/arch-rules/dist` to the ignore lists of `.gitignore`, `biome.jsonc`
  `files.includes` and `knip.json`, and add a `knip.json` workspace entry for
  `packages/arch-rules` (entry `src/cli.ts`, `bin`).

---

## Phase 2: Foundational (group A1)

**Purpose**: the preset and the plugins resolve from the package. Every user story needs this.

- [X] T006 Copy `scripts/biome/{feature-boundaries,client-server,no-passthrough-reexports,vendor-sdks}.grit`
  to `packages/arch-rules/plugins/` unchanged.
  - The template copies stay in place until phase 8.
  - Every message keeps its `<ID>: ` prefix (FR-002).
- [X] T007 Create `packages/arch-rules/biome-manifest.jsonc`, with one `rules` entry per plugin,
  as in contracts/preset.md.
- [X] T008 Create `packages/arch-rules/preset.jsonc`:
  - **Plugins**: the 4 `plugins` entries of the root `biome.jsonc` (lines 43–70), with each
    `path` rewritten to `@azurioh/arch-rules/<rule>` and the same `includes`.
  - **Overrides**: the 12 `overrides` (lines 72–426), copied unchanged.
  - **Left out**: `$schema`, `root`, `files`, `formatter`, `css`, `linter.rules.recommended` and
    `assist`.
  - **File name**: never `biome.jsonc` (research R1).
- [X] T009 Create `packages/arch-rules/src/feature-layout.ts`:
  - Move the logic of `apps/web/tests/architecture/feature-layout.ts` as a pure function,
    `findLayoutViolations(features: FeatureTree[]): Violation[]`, with no I/O.
  - Copy, do not delete: the template's version stays until phase 8.
- [X] T010 Create `packages/arch-rules/src/cli.ts`:
  - `parseArgs` dispatch for `sync`, `check` and `layout`, plus `--repo <dir>` (default: cwd)
    and `--apps <glob>` (default `apps/*`).
  - Implement `layout` per contracts/cli.md: it lists `apps/*/src/features/*`, calls
    `findLayoutViolations`, and prints `ARCH-LAYOUT: <path>: <reason>`.
  - Exit codes: 0 when clean, 1 on a violation, 1 on an I/O error. An app without
    `src/features/` counts as clean.
  - `sync` and `check` are added in phase 4; until then the dispatch accepts only `layout`.
- [X] T011 Create `packages/arch-rules/tests/layout.test.ts`:
  - Port the cases of `apps/web/tests/architecture/layout.test.ts` to `findLayoutViolations`.
  - Add a CLI test against a temporary repo with two apps: a violation in the second app is
    reported, and an app without `features/` exits 0 (FR-003, FR-006).

**Checkpoint**: `pnpm exec turbo run build typecheck test --filter=@azurioh/arch-rules` is green, and
`pnpm check` is green at the root, with the template untouched.

---

## Phase 3: User Story 2 — Rules are proven once, in the package (P1, group A2)

**Goal**: every `ARCH-*` id has violating and compliant fixtures that run through the published
resolution path, and a missing fixture fails `check`.

**Independent Test**: delete one compliant fixture of `ARCH-REEXPORT`. The package test fails
and names it. Restore it, and the test passes (quickstart §1).

- [X] T012 [P] [US2] Copy `apps/web/tests/architecture/rule-ids.ts` to
  `packages/arch-rules/src/rule-ids.ts`, keeping `findRulesWithoutBothFixtures` and the id list.
- [X] T013 [US2] Create `packages/arch-rules/tests/rules.test.ts` from
  `apps/web/tests/architecture/rules.test.ts`, with two changes:
  - **Temporary consumer.** Each fixture is written into a `mkdtemp` consumer that contains a
    `biome.jsonc` (`{"root":true,"extends":["@azurioh/arch-rules/biome"]}`) and a
    `node_modules/@azurioh/arch-rules` symlink to the package directory. The run uses
    `node_modules/.bin/biome lint --vcs-enabled=false`. Do not copy `biome.jsonc` or the
    plugins.
  - **App path.** The fixture app path becomes a constant, `apps/app/src`, so no app name is
    assumed (FR-003).

  Keep every existing fixture and the completeness assertion.
- [X] T014 [US2] In `packages/arch-rules/tests/rules.test.ts`, add one fixture per `ARCH-*` id
  under a second app path (`apps/other/src`), proving that the globs match any app.
- [X] T015 [US2] Add a test asserting that the packed tarball holds exactly the published file
  set: `npm pack --dry-run --json` lists `dist/cli.js`, `preset.jsonc`, `biome-manifest.jsonc`,
  `plugins/*.grit` and `rules/*.md`, and no `tests/` and no `src/`. File:
  `packages/arch-rules/tests/package-files.test.ts`.

**Checkpoint**: the quickstart §1 scenario passes, and `pnpm check` is green.

---

## Phase 4: User Story 3 — Agent rules ship with the lint rules (P2, group B)

**Goal**: the package ships the template-specific agent rules, and `sync`/`check` keep the
consumer copies identical.

**Independent Test**: quickstart §4, run against a temporary repo in the package tests. The
template-side run happens in phase 8.

- [X] T016 [P] [US3] Copy `.claude/rules/{clean-architecture,errors,ui}.md` to
  `packages/arch-rules/rules/` unchanged.
- [X] T017 [P] [US3] Create `packages/arch-rules/rules/arch-enforcement.md` from the part of
  `.claude/rules/architecture.md` that sits outside the `conventions:begin/end` markers:
  - **Include**: the "App layout" section and the `ARCH-*` list. `ARCH-LAYOUT` now points to
    `arch-rules layout` instead of `layout.test.ts`; the rules now point to the package instead
    of `biome.jsonc` and `scripts/biome/*.grit`.
  - **Leave out**: the "Test layout" table and the accepted-global bullet, which are
    project-owned.
  - **Rename-only change**: the note "a new rule updates biome.jsonc, the fixtures…" becomes "a
    new rule is added in `@azurioh/arch-rules` (preset, fixtures, README rules table)".
- [X] T018 [US3] Create `packages/arch-rules/src/agent-rules.ts` with pure functions, no I/O:
  - `managedHeader(version: string): string`, which returns
    `<!-- managed by @azurioh/arch-rules@<version>: edit upstream, run arch-rules sync -->`.
  - `isManaged(firstLine: string): boolean`.
  - `planSync(shipped: Map<name, content>, local: Map<name, content>, version): { write: name[], remove: name[] }`.
  - `diffStates(shipped, local, version): Array<{ name, state: "differs" | "missing" | "stale" }>`.

  A local file whose first line is not a managed header is ignored by every function (FR-008).
- [X] T019 [US3] Add `sync` and `check` to `packages/arch-rules/src/cli.ts` per contracts/cli.md:
  - **Reading**: read `rules/` from the package directory (resolved from `import.meta.url`) and
    `.claude/rules/arch-rules/` from `--repo`.
  - **`sync`**: writes and removes as planned, then regenerates `AGENTS.md`. When
    `~/.claude/plugins/marketplaces/claude-conventions/plugins/conventions/scripts/agents-md.sh`
    exists, it runs that script with `--repo <dir>`; otherwise it prints
    `AGENTS.md not regenerated: run <command>`.
  - **`check`**: prints `<state> .claude/rules/arch-rules/<name>.md` lines, then the remediation
    line. It exits 0 or 1, and exits 0 with `no agent rules folder, skipped` when the repo has
    no `.claude/` directory.
- [X] T020 [US3] Create `packages/arch-rules/tests/agent-rules.test.ts`:
  - **Pure functions**: every state change from data-model.md is covered.
  - **CLI end to end, on a temporary repo**:
    - after `sync`, `check` exits 0;
    - a hand edit is reported as `differs`, naming the file (SC-002);
    - a deleted file is reported as `missing`;
    - a managed file the package no longer ships is reported as `stale`, and `sync` removes it;
    - a file without the header survives `sync`;
    - a repo without `.claude/` exits 0.

**Checkpoint**: the package tests are green, and `pnpm check` is green.

---

## Phase 5: User Story 4 — Release pipeline, package side (P2, group C)

**Goal**: a merged release of the package publishes it to npm with provenance, and its notes list
the rules that changed.

**Independent Test**: on the release PR, `release-please` proposes `arch-rules` `1.0.0` with its
own changelog. The publish job's `if` and steps can be read in the workflow; they run live in
phase 9.

- [X] T021 [US4] Add the component to `release-please-config.json`:
  - `packages/arch-rules` with `"release-type": "node"`, `"component": "arch-rules"`,
    `"changelog-path": "CHANGELOG.md"` and `"release-as": "1.0.0"`, without
    `bump-minor-pre-major` (research R6);
  - `"packages/arch-rules"` added to the root component's `exclude-paths`;
  - `"packages/arch-rules": "0.0.0"` added to `.release-please-manifest.json`.
- [X] T022 [US4] Add a `publish-arch-rules` job to `.github/workflows/release-please.yml`:
  - **Trigger**: `needs` the release job, and `if` its
    `outputs['packages/arch-rules--release_created']` is `'true'`. Expose that output from the
    release step.
  - **Permissions**: `contents: read`, `id-token: write`.
  - **Steps**, in order:
    1. `npm view @azurioh/arch-rules version`. On a 404 (package not published yet), print a
       notice pointing to the README section "Maintainers: first publish" and skip every later
       step, so the run stays green on `main`. Any other error fails the job.
    2. Check out the release tag. Pin every action by SHA, in the file's existing style.
    3. Set up pnpm and Node from `.node-version`.
    4. `pnpm install --frozen-lockfile`.
    5. `pnpm --filter @azurioh/arch-rules build test`.
    6. Assert `npm --version` is at least 11.5.1.
    7. `pnpm pack` from `packages/arch-rules` (rewrites the `workspace:*` range of
       `@repo/tsconfig`), then `npm publish <tgz> --provenance --access public`.
  - **No token secret.** Confirm the v5 output key name on the release-please-action v5 README
    before writing the `if`.
- [X] T023 [US4] Write `packages/arch-rules/README.md` with these sections:
  - **Rules**: a table of id, what it forbids, and the paths it applies to.
  - **Adopt**:
    1. `pnpm add -E -D @azurioh/arch-rules` at the root;
    2. `extends` in `biome.jsonc`;
    3. `arch-rules check` and `arch-rules layout` in `check`;
    4. `pnpm exec arch-rules sync`;
    5. the parity test;
    6. delete `packages/arch-rules` and its release-please entry in a project created from the
       template.
  - **Add project rules**: Grit plugins, or overrides on paths the preset does not cover. Never a
    `noRestrictedImports` override on a preset glob, since it replaces the preset's restriction
    (R3).
  - **Update PR turned red**: run `sync`, commit; fix the flagged code, or hold the update.
  - **Versioning**: when a release is major; commit subjects name the rule ids.
  - **Maintainers: first publish**: the one-time manual `pnpm pack` +
    `npm publish <tgz> --access public` from tag `arch-rules-v1.0.0`, then registering `release-please.yml` as the trusted publisher on
    npmjs.com.

  No private names (FR-014, FR-015).
- [X] T024 [P] [US4] Write `docs/adr/0012-shared-architecture-rules-package.md`:
  - Header and sections: Status Accepted, Date 2026-10-30, Applies to the repo and every project
    created from it; Context, Decision, Consequences.
  - Content: the decisions R1–R9 in short, and the rule "a project adds rules through Grit
    plugins".
  - List it in `docs/adr/README.md`.

---

## Phase 6: Polish before release (group C)

- [X] T025 [P] Update `CONTRIBUTING.md` and the root `README.md`:
  - a rule change happens in `packages/arch-rules`;
  - its commit uses scope `arch-rules` and names the rule ids in the subject (for example
    `feat(arch-rules)!: ARCH-LAYER rejects …`), so the changelog lists them (FR-012); `!` marks
    a change that can flag accepted code;
  - the release publishes it.
- [X] T026 Run `/conventions:verify-app all` and `pnpm check` from the root, with zero errors and
  zero warnings. Run the private-name grep from spec 1 (the forbidden word list in the
  maintainer's notes) on `packages/arch-rules`, with zero hits. The word list stays outside the
  repository: never write it into a file, test, script or commit here.

**Checkpoint (end of groups A1–C)**: stack merged into `staging`; the template still uses its own
copies, and everything is green.

---

## Phase 7: Maintainer checkpoint — first release (no code)

- [X] T027 Maintainer confirms that the npm scope `@azurioh` is theirs (`npm whoami`). If it is
  not, rename the package before T028; the rename touches only `package.json` `name`, the
  README, ADR 0012 and these tasks.
- [X] T028 Maintainer promotes `staging → demo → main` (merge commits) and merges the release PR,
  which creates tag `arch-rules-v1.0.0`. The `publish-arch-rules` job is expected to skip its
  publish with a notice at this point, because the package does not exist on npm yet.
- [X] T029 Maintainer publishes by hand from the tag:
  `git switch --detach arch-rules-v1.0.0 && pnpm install --frozen-lockfile && pnpm --filter @azurioh/arch-rules build && cd packages/arch-rules && pnpm pack && npm publish ./azurioh-arch-rules-1.0.0.tgz --access public`.
  Then they register `Azurioh/tanstack-monorepo-template` + `release-please.yml` as the trusted
  publisher on npmjs.com. Verify that `npm view @azurioh/arch-rules version` shows `1.0.0`.

---

## Phase 8: User Story 1 — The template consumes the package (P1, group D)

**Goal**: the template's lint config is reduced to `extends` plus project settings, every
`ARCH-*` id still fires with the same id, and the rule copies are gone.

**Independent Test**: quickstart §2, §3 and §5. SC-003 and SC-005 hold.

- [X] T030 [US1] Root: `pnpm add -E -D @azurioh/arch-rules@1.0.0`.
  - Run `pnpm why @azurioh/arch-rules`. It must resolve from the registry, not as `link:`.
  - If it resolves as a link, set `link-workspace-packages: false` in `pnpm-workspace.yaml` and
    re-install.
- [X] T031 [US1] Rewrite the root `biome.jsonc`:
  - **Add**: `"extends": ["@azurioh/arch-rules/biome"]`.
  - **Remove**: the 4 `plugins` entries and the 12 `ARCH-*` `overrides`.
  - **Keep**: `$schema`, `root`, `files` (also ignoring `.claude/rules/arch-rules`), `css`, `formatter`, `linter.rules.recommended` + `useBlockStatements`, and
    `assist`.
- [X] T032 [US1] Delete `scripts/biome/` and
  `apps/web/tests/architecture/{rules.test.ts,rule-ids.ts,layout.test.ts,feature-layout.ts}`.
  Remove the `scripts/biome/**` and `biome.jsonc` fixture inputs from `turbo.json`, and any
  `knip.json` entry that names them.
- [X] T033 [US1] Create `apps/web/tests/architecture/arch-ids.test.ts` (parity, SC-005):
  - For each of the 6 lint ids, write one violating file at its real path under `apps/web/src`
    in a `mkdtemp` copy that has the template's `biome.jsonc` and a resolvable
    `node_modules/@azurioh/arch-rules`.
  - Run `biome lint` and assert the id appears.
  - No compliant cases and no completeness check (SC-004).
- [ ] T034 [US1] Add a root script `arch` (`arch-rules check && arch-rules layout`) and run it
  from `check`. Wire it as a root Turborepo task, `//#arch`, added to the `check` task list, so
  the required `check` CI job runs it.
- [ ] T035 [US3] Run `pnpm exec arch-rules sync`:
  - It writes `.claude/rules/arch-rules/{clean-architecture,errors,ui,arch-enforcement}.md`.
  - Delete `.claude/rules/{clean-architecture,errors,ui}.md`.
  - Remove from `.claude/rules/architecture.md` everything that moved to `arch-enforcement.md`.
    Keep the marker blocks, the Test layout table and the accepted-global bullet, plus one line
    pointing to `arch-rules/`.
  - Regenerate `AGENTS.md` with the pinned conventions script.
- [ ] T036 [US1] Update the references to the moved files:
  - `.claude/rules/workflow.md`, line "Layer mapping and wiring → …", which now points to
    `arch-rules/*.md`;
  - `CLAUDE.md`, if it names them;
  - ADR 0010, amended with a dated note "Enforcement moved to `@azurioh/arch-rules`, ADR 0012"
    that keeps its rules;
  - `docs/adr/README.md`.
- [ ] T037 [US4] Edit `.github/dependabot.yml`:
  - the npm entry's `schedule.interval` changes from `weekly` to `daily`;
  - a group `arch-rules` with pattern `@azurioh/arch-rules` is added as the first group.

  In the same PR, remove `"release-as": "1.0.0"` from the `packages/arch-rules` entry of
  `release-please-config.json`. If it stays, every later release is forced back to 1.0.0.
- [ ] T038 [US1] Run quickstart §2, §3, §4 and §5 by hand on the branch, plus `pnpm check`, with
  zero warnings. Time `arch-rules check` and `arch-rules layout` (`time`, wall clock) and record
  both durations with the outcome in the PR body.

---

## Phase 9: User Story 4 — Live update loop (P2, verification only)

**Independent Test**: quickstart §6.

- [ ] T039 [US4] At the next `feat(arch-rules)` or `fix(arch-rules)` release, check three things:
  - the `publish-arch-rules` job is green with OIDC;
  - `npm view @azurioh/arch-rules` shows the version with provenance;
  - Dependabot opens the bump PR on `staging` within 24 hours (SC-001).

  If Dependabot does not open the PR, record a pitfall entry and open a follow-up for the
  dispatch fallback (research R7).
- [ ] T040 [US4] On that Dependabot PR, check two things:
  - the `check` job fails with `differs .claude/rules/arch-rules/…` when the rules changed;
  - `sync` plus a commit turns it green (US4 scenario 2).
- [ ] T041 Time the adoption by following the README in a scratch clone of the template, which
  must take under 15 minutes (SC-006). Record the time in the PR or issue.

---

## Dependencies & Execution Order

- Phases 1 → 2 → 3 → 4 → 5 → 6 come in order, because each group builds on the previous files.
  US2 (phase 3) and US3 (phase 4) only share `cli.ts`, and only T019 touches it after T010.
- Phase 7 blocks phase 8, which needs the published `1.0.0`.
- Phase 8 blocks phase 9, which needs the template to consume the registry version for the
  Dependabot PR to exist.
- Within phase 8: T030 → T031 → T032 → T033, then T034–T037 in any order, then T038.

## Parallel Opportunities

- Phase 1: T002, T003 and T004 together after T001.
- Phase 3: T012 together with the end of phase 2.
- Phase 4: T016 and T017 together, then T018 → T019 → T020.
- Phase 5: T024 together with T021–T023, and T025 in phase 6 alongside.

## Implementation Strategy

- **MVP**: groups A1 + A2 (phases 1–3). The rules are proven inside the package, and nothing
  changes for the template yet.
- **Then**: B (agent rules) and C (release), the release and first publish (phase 7), D (the
  template switch, which delivers US1 end to end), and the live loop (phase 9).
- Each group is a reviewable PR with green CI on its own. The template is never broken between
  groups, because it keeps its copies until D.
