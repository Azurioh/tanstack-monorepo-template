# Tasks: Starter App

**Input**: Design documents from `/specs/002-starter-app/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: requested by the spec (FR-015 to FR-019); test tasks precede the code they cover.

**Organization**: grouped by user story. Paths are relative to the repository root. Every
dependency is added with `pnpm add -E` at the version re-verified on the registry (research.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: user story from spec.md (US1–US5)

## Phase 1: Setup and spike (gate)

**Purpose**: prove the risky assumptions before building on them.

- [X] T001 Re-verify every version in research.md with `npm view` and update research.md if a newer stable release exists
- [X] T002 Add `packages/tsconfig/react-app.json` (extends `base.json`; `jsx: react-jsx`, DOM libs, `paths: { "@/*": ["./src/*"] }` resolved per app)
- [X] T003 Scaffold `apps/web` minimal Start app: `package.json` (`name: web`, scripts `dev`, `build`, `start`, `typecheck`, `test`; `test:e2e` is added with Playwright in T011), `tsconfig.json`, `vite.config.ts` (`tanstackStart({ importProtection: { behavior: 'error', client: { files: ['**/features/*/server/**', '**/shared/server/**'] } } })`, `viteReact()`, `resolve.tsconfigPaths: true`), `src/router.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`
- [X] T004 Spike TS 7: add a throwaway oRPC procedure + `src/routes/api/rpc.$.ts` handler and a type test asserting inferred input/output with `expectTypeOf`; run `tsc --noEmit` on the app including `routeTree.gen.ts`; record the outcome in research.md (fallback: `@typescript/typescript6` alias for the app `typecheck`, ADR 0002 note)
- [X] T005 Spike Biome: in a temporary directory, verify `noRestrictedImports` `patterns` + `overrides[].includes` (with `!` negation), a `../*` pattern, a GritQL plugin matching an import source by regex, GritQL access to the file path, and a Grit check distinguishing `import type`; record per rule id in research.md which mechanism holds (fallback: dependency-cruiser for that rule)
- [X] T006 Verify the production server: `vite build` output, `node .output/server/index.mjs`, port variable; record in research.md (outcome: no Nitro; `srvx serve --prod --static ../client --entry dist/server/server.js`, `PORT`)

**Checkpoint**: spike outcomes recorded; fallbacks applied to plan.md before Phase 2.

---

## Phase 2: Foundational (blocking)

- [X] T007 Create `packages/ui` (`@repo/ui`): `package.json` with exports `./components/*`, `./lib/cn`, `./theme.css`; `components.json`; `src/lib/cn.ts` (clsx + tailwind-merge); `src/theme.css` (semantic tokens, light theme, `tw-animate-css`)
- [X] T008 Generate shadcn components into `packages/ui/src/components/` via `pnpm dlx shadcn@<pinned> add button input label card alert`; add their runtime dependencies exactly pinned
- [X] T009 Add `apps/web/src/styles.css` (`@import 'tailwindcss'`, `@import '@repo/ui/theme.css'`, `@source` for the UI package) and load it from `__root.tsx`
- [X] T010 [P] Add `apps/web/vitest.config.ts` with projects `unit` (node) and `dom` (jsdom + `tests/setup.ts` with Testing Library cleanup)
- [X] T011 [P] Add `@playwright/test`, the `test:e2e` script and `apps/web/playwright.config.ts` (`webServer` = production server on a fixed test port, `reuseExistingServer: !process.env.CI`, chromium only, `webServer.env` sets `GREETING_HISTORY_LIMIT` and `LOG_LEVEL`; the build itself reads no env) and `tests/e2e/` folder
- [X] T012 Update `turbo.json`: `dev` (persistent, no cache), `build` (outputs `dist/**`, already the default), `test:e2e` (depends on `build`); add `build` to the root `check` script; update `knip.json` workspaces for `packages/ui` (`apps/*` added in T003) (ignore `routeTree.gen.ts`)
- [X] T013 Remove `packages/example` and its references (README, knip, docs)
- [X] T014 [P] Write tests `apps/web/tests/unit/shared/domain/domain-error.test.ts` then implement `apps/web/src/shared/domain/errors.ts` (`DomainError` with `code` SCREAMING_SNAKE_CASE, `kind`, English log-only `message`; `ValidationError`, `ConfigurationError`)
- [X] T015 [P] Write tests then implement `apps/web/src/shared/server/ports/{clock,id-generator}.ts`, `apps/web/src/shared/server/adapters/{system-clock,random-id-generator}.ts` and twins `FixedClock`, `SequentialIdGenerator`
- [X] T016 [P] Write tests `apps/web/tests/unit/shared/server/config/env.test.ts` (missing, blank, invalid, valid; error names every bad variable; `.env.example` lists exactly the schema keys) then implement `apps/web/src/shared/server/config/env.ts` `loadEnv(source)` for `GREETING_HISTORY_LIMIT` ("integer 1–100", required) and `LOG_LEVEL` ("debug | info | warn | error", default `info`); add `apps/web/.env.example`
- [X] T017 [P] Implement `apps/web/src/shared/server/logging/logger.ts` (level from env, JSON lines, no secrets) with tests
- [X] T018 Implement `apps/web/src/shared/server/rpc/{context,errors,router}.ts` (base procedure with context, `DomainError` → `BAD_REQUEST { code }`, unknown → logged `INTERNAL_SERVER_ERROR { referenceId }`, `export type AppRouter`) with tests for the error mapping
- [X] T019 Delete the spike (`src/spike/`, `tests/spike/`) and implement `apps/web/src/routes/api/rpc.$.ts` (`RPCHandler(router).handle(request, { prefix: '/api/rpc', context })`, 404 fallback) and `apps/web/src/shared/server/composition-root.ts` (calls `loadEnv(process.env)` once, binds ports)
- [X] T020 Implement `apps/web/src/shared/client/{rpc-client,query-client}.ts` (isomorphic `RPCLink` via `createIsomorphicFn`, `createTanstackQueryUtils`) and wire the query client into `src/router.tsx`

**Checkpoint**: app boots, `/api/rpc` answers, `pnpm check` green.

---

## Phase 3: User Story 1 — Run a working demo app (P1) 🎯 MVP

**Goal**: submit a name, see the server greeting and the recent list.

**Independent Test**: quickstart §1 and §2.

### Tests

- [X] T021 [P] [US1] `apps/web/tests/unit/features/greeting/domain/person-name.test.ts`: trimmed, "length 1–50 after trim", "no control characters", codes `NAME_EMPTY | NAME_TOO_LONG | NAME_INVALID`
- [X] T022 [P] [US1] `apps/web/tests/unit/features/greeting/domain/greeting.test.ts`: message `"Hello, <name>!"`, `createdAt` from the injected clock, immutability
- [X] T023 [P] [US1] `apps/web/tests/contracts/greeting-repository.contract.ts`: reusable suite (`save`, `listRecent(limit)` "most recent first, at most `limit`")
- [X] T024 [P] [US1] `apps/web/tests/unit/features/greeting/application/{greet,list-recent-greetings}.test.ts` with in-memory twins
- [X] T025 [P] [US1] `apps/web/tests/unit/features/greeting/rpc/greeting-procedures.test.ts`: input validation, error mapping, output DTO shape
- [X] T026 [P] [US1] `apps/web/tests/unit/features/greeting/client/use-greeting-form.test.ts` (states `idle → invalid | submitting → succeeded | failed`, latest submission wins, unreachable server → generic message and form still usable) and `greeting-form.test.tsx` (View with plain props, text rendering of markup characters)
- [X] T027 [P] [US1] `apps/web/tests/e2e/greeting.spec.ts`: happy path "Ada", whitespace-only validation with no request, 375 px viewport, tap targets ≥ 44 px

### Implementation

- [X] T028 [P] [US1] `apps/web/src/features/greeting/server/domain/{person-name,greeting,greeting-error}.ts`
- [X] T029 [US1] `apps/web/src/features/greeting/server/application/ports/greeting-repository.ts` and use cases `greet.ts`, `list-recent-greetings.ts` returning `GreetingDto`
- [X] T030 [US1] `apps/web/src/features/greeting/server/infrastructure/in-memory-greeting-repository.ts` + `apps/web/tests/unit/features/greeting/infrastructure/in-memory-greeting-repository.test.ts` running the contract suite
- [X] T031 [US1] `apps/web/src/features/greeting/schemas.ts` (shared zod input schema) and `server/rpc/greeting-procedures.ts` (`greeting.greet`, `greeting.listRecent` per contracts/rpc-api.md); register in `shared/server/rpc/router.ts`
- [X] T032 [US1] `apps/web/src/features/greeting/{server,index,testing}.ts` entry points; wiring factory used by `composition-root.ts`
- [X] T033 [US1] Client: `client/api/greeting-queries.ts`, `client/hooks/use-greeting-form.ts`, `client/components/{greeting-form,greeting-list}.tsx` (`@repo/ui` components only), `client/pages/greeting-page.tsx`, `client/copy.ts` (one entry per error code + generic error with reference)
- [X] T034 [US1] `apps/web/src/routes/index.tsx`: loader prefetches `greeting.listRecent`, renders `GreetingPage`; responsive layout, tap targets ≥ 44 px
- [X] T035 [US1] Run `pnpm check` and `pnpm --filter web test:e2e`; fix to zero warnings

**Checkpoint**: MVP: demo works in dev and production build.

---

## Phase 4: User Story 3 — Architecture rules enforced (P1)

**Goal**: every rule of contracts/architecture-rules.md fails on violation.

**Independent Test**: quickstart §3.

- [X] T036 [US3] `apps/web/tests/architecture/rules.test.ts`: table `[rule id, path, snippet, expectViolation]` with ≥ 1 violating and ≥ 1 compliant case per id; temporary copy of `biome.jsonc` + `scripts/biome/`; completeness assertion over the id list
- [X] T037 [P] [US3] `apps/web/tests/architecture/layout.test.ts`: every `src/features/*` has exactly the entries of contracts/feature-layout.md (ARCH-LAYOUT)
- [X] T038 [US3] Root `biome.jsonc`: `noRestrictedImports` overrides per layer for ARCH-LAYER, ARCH-VENDOR (vendor list in one place), ARCH-RELATIVE, each message prefixed with its id
- [X] T039 [P] [US3] `scripts/biome/feature-boundaries.grit` (ARCH-FEATURE), `client-server.grit` (ARCH-CLIENT-SERVER, type-only allowed), `no-passthrough-reexports.grit` (ARCH-REEXPORT, entry points exempt); enable through `biome.jsonc` `plugins` scoped by path
- [X] T040 [US3] Apply any dependency-cruiser fallback decided in T005 (config, root task, fixtures unchanged)
- [X] T041 [US3] `docs/adr/0010-app-layout-and-architecture-enforcement.md` + index entry in `docs/adr/README.md`
- [X] T042 [US3] Run `pnpm check`; manual spot check of quickstart §3

---

## Phase 5: User Story 2 — Copy the demo feature (P1)

**Goal**: a copied feature passes without rule or tool config edits.

**Independent Test**: quickstart §4 and §7.

- [X] T043 [US2] Execute quickstart §4 on a throwaway branch (copy `greeting` → `farewell`); fix any rule, knip or tsconfig setting that names `greeting` instead of a pattern
- [X] T044 [US2] Execute quickstart §7 (remove the demo); fix anything that breaks
- [X] T045 [US2] README section "apps/web": run, layout, add a feature by copying the demo, remove the demo (FR-029)

---

## Phase 6: User Story 4 — Agent rules and conventions (P2)

**Goal**: agents load the same rules; AGENTS.md stays in sync.

**Independent Test**: quickstart §5 and §6.

- [X] T046 [US4] Run `/conventions:port-claude-config` with `integrationBranch: staging`, `productionBranch: main`, `apps: { web: apps/web }`, `prSize` per research.md; review the preview before writing
- [X] T047 [US4] Merge the generalized source-project rules into `.claude/rules/{architecture,clean-architecture,coding,errors,ui,workflow,knowledge,pitfalls}.md` and `.claude/rules/web/commands.md`, rewritten against this template's paths, rule ids and ADRs; no private names
- [X] T048 [US4] `.claude/settings.json`: `extraKnownMarketplaces.claude-conventions` (`Azurioh/claude-conventions`), `enabledPlugins["conventions@claude-conventions"]`, permissions for the CI commands, deny force-push; `CLAUDE.md` ≤ 40 lines
- [X] T049 [US4] Generate `AGENTS.md` with the plugin's `scripts/agents-md.sh`; confirm `--check` exits 0
- [X] T050 [US4] `docs/adr/0011-rpc-transport.md`; amend `docs/adr/0007-ui-layer.md` (forms: zod + `useReducer`, no form library); update `docs/adr/README.md`
- [X] T051 [US4] Private-name sweep (quickstart §6) over the whole repository

---

## Phase 7: User Story 5 — Pipeline (P2)

**Goal**: app built, tested end to end and released by the pipeline.

**Independent Test**: quickstart §8.

- [X] T052 [US5] `.github/workflows/ci.yml`: `check` job runs the build; new job `e2e` (`playwright install --with-deps chromium`, `pnpm --filter web test:e2e`); new job `agents-md` (checkout `Azurioh/claude-conventions` at SHA `b3af758b520acf7408278e45488528361ac01db2`, run `scripts/agents-md.sh --check`); actionlint clean; document in `.claude/rules/workflow.md` that the plugin SHA is bumped by hand (Dependabot does not track checkout refs)
- [X] T053 [US5] `.github/rulesets/{staging,demo,main}.json`: required checks `check`, `pr-title`, `e2e`, `agents-md`; update `specs/001-monorepo-foundation/contracts/rulesets.md` reference if needed
- [X] T054 [US5] `release-please-config.json` + `.release-please-manifest.json`: `apps/web` package (`initial-version: 0.1.0`, `bump-minor-pre-major`), root excludes `apps/web` (verify `exclude-paths`)
- [X] T055 [US5] Update ADR 0005 / README / CONTRIBUTING for the new jobs and the app release entry

---

## Phase 8: Polish and validation

- [X] T056 Run quickstart §1–§7 end to end; record timings for SC-001 and SC-002
- [ ] T057 With the maintainer's OK: commit, open the PR to `staging`, re-run `scripts/setup-repo.sh` after merge so the new required checks apply, promote, execute quickstart §8
- [ ] T058 Mark spec 1 tasks T057–T062 and this feature's checklists complete

---

## Dependencies & Execution Order

- Phase 1 gates everything; its outcomes may rewrite T038–T040.
- Phase 2 depends on Phase 1. US1 (Phase 3) depends on Phase 2.
- US3 (Phase 4) depends on US1 (rules are proven against real code and fixtures).
- US2 (Phase 5) depends on US1 and US3. US4 (Phase 6) depends on US1 and US3 (rules describe real code). US5 (Phase 7) depends on US1; T053 after T052.
- Within a story: tests before implementation; domain → application → infrastructure → rpc → client → route.

## Parallel Examples

- Phase 2: T010, T011, T014, T015, T016, T017 together.
- US1 tests: T021–T027 together; then T028 alongside T023.
- US3: T037 and T039 together after T036.

## Implementation Strategy

MVP = Phases 1–3 (demo app runs and is tested). Then US3 (enforcement), US2 (copyability),
US4 (agent rules), US5 (pipeline), validation. Each phase ends with `pnpm check` green.
