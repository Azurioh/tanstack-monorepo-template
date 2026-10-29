# Implementation Plan: Starter App

**Branch**: `002-starter-app` | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-starter-app/spec.md`

## Summary

Add `apps/web`, a TanStack Start app whose single demo feature `greeting` crosses every layer
(domain → application/ports → in-memory infrastructure → oRPC procedures → TanStack Query client
→ route), a shared `@repo/ui` package (Tailwind v4 + shadcn), unit / contract / e2e tests,
architecture rules enforced through Biome (native `noRestrictedImports` + GritQL plugins) and
proven by fixtures, generalized agent rules wired to the claude-conventions plugin with a CI sync
check, and pipeline integration (Turbo tasks, CI jobs, rulesets, release-please entry).

## Technical Context

**Language/Version**: TypeScript 7.0.2 (strict) on Node.js 24.22.1; React 19.3.1

**Primary Dependencies**: @tanstack/react-start 1.169.4, @tanstack/react-router 1.170.46,
@tanstack/react-query 5.104.5, vite 8.3.5, @orpc/* 1.16.1, zod 4.6.7, tailwindcss 4.3.3,
radix-ui 1.8.1 + shadcn-generated components (see [research.md](./research.md))

**Storage**: in-memory only (port + adapter); no database

**Testing**: Vitest 5.0.5 (node + jsdom projects), Testing Library, Playwright 1.64.1, Biome
fixture tests for architecture rules

**Target Platform**: Node 24 server (TanStack Start production build) + evergreen browsers

**Project Type**: full-stack web app inside the monorepo template

**Performance Goals**: fresh clone to green check + build + e2e < 8 min (SC-001); greeting visible
< 1 min after `pnpm dev` (SC-002)

**Constraints**: zero errors / zero warnings; exact pins; no private-project names; TS 7 unless the
Phase 1 spike forces the TS 6 fallback; Biome-only enforcement unless a rule is inexpressible

**Scale/Scope**: 1 app, 1 feature, 1 UI package, 7 architecture rules, ~8 rule files, 2 ADRs, 2
new CI jobs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Clean Architecture | Domain/application import no framework, I/O or vendor SDK; ports with in-memory adapters; composition root binds them; ARCH-LAYER and ARCH-VENDOR enforce it. | PASS |
| II. Feature-First Structure | `src/features/<f>/` + `src/shared/`; ARCH-FEATURE forbids cross-feature imports; `@/*` alias, ARCH-RELATIVE forbids `../`. | PASS |
| III. Quality Gates | Biome, tsc, Vitest, knip cover the app and `@repo/ui`; build and e2e added to CI as required checks; braces rule unchanged. | PASS |
| IV. Reproducibility | Versions verified on the registry 2026-10-26, exact pins via `pnpm add -E`; claude-conventions pinned by commit SHA in CI. | PASS |
| V. Conventional Commits & Releases | `apps/web` gets its own release-please entry; scope `web` in commits. | PASS |
| VI. Branch Flow & Repository Rules | Rulesets updated in `.github/rulesets/` with the new required checks; applied by `setup-repo.sh`. | PASS |
| VII. ADRs | ADR 0010 (app layout + enforcement), ADR 0011 (oRPC transport); ADR 0007 amended for forms. | PASS (ADR 0007 amendment pending maintainer confirmation) |
| VIII. Open-Source Hygiene | README section for the app; no private names (quickstart §6). | PASS |

Post-design re-check: PASS. One deviation from an accepted ADR (0007, TanStack Form → zod +
`useReducer`) is recorded in Complexity Tracking and needs the maintainer's confirmation before
Phase 4.

## Project Structure

### Documentation (this feature)

```text
specs/002-starter-app/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── feature-layout.md
│   ├── architecture-rules.md
│   └── rpc-api.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
.
├── apps/web/                          # layout in contracts/feature-layout.md
├── packages/
│   ├── tsconfig/                      # + react-app.json
│   ├── ui/                            # @repo/ui: components/, lib/cn.ts, theme.css, components.json
│   └── example/                       # removed (apps/web and @repo/ui now exercise every task)
├── scripts/biome/                     # *.grit architecture plugins
├── docs/adr/0010-app-layout-and-architecture-enforcement.md
├── docs/adr/0011-rpc-transport.md
├── .claude/
│   ├── conventions.json
│   ├── settings.json
│   └── rules/{workflow,architecture,clean-architecture,coding,errors,ui,knowledge,pitfalls}.md
│       └── web/commands.md
├── CLAUDE.md · AGENTS.md (generated)
├── .github/workflows/ci.yml           # + build in check, jobs e2e and agents-md
├── .github/rulesets/*.json            # + required checks e2e, agents-md
└── release-please-config.json · .release-please-manifest.json   # + apps/web
```

**Structure Decision**: one app under `apps/web` following the feature-first layout of
[contracts/feature-layout.md](./contracts/feature-layout.md); shared UI in `packages/ui`;
architecture rules live at the root (`biome.jsonc` overrides + `scripts/biome/`) so a second app
inherits them by path pattern. `packages/example` is removed because the app and the UI package
keep every pipeline task non-empty.

## Implementation Phases (input for `/speckit-tasks`)

1. **Spike (gate)** — scaffold `apps/web` with Start + one route + one oRPC procedure; verify
   `tsc --noEmit` under TS 7 on the route tree and an oRPC `expectTypeOf` test; verify each
   Biome mechanism in [architecture-rules.md](./contracts/architecture-rules.md) on a throwaway
   fixture (overrides negation, `patterns` on `../`, Grit import-source matching, Grit file-path
   access). Record outcomes in research.md; apply fallbacks (TS 6 alias, dependency-cruiser per
   rule) before going further.
2. **Workspace** — `packages/tsconfig/react-app.json`, `packages/ui` (shadcn init, button / input
   / label / card / alert, `theme.css`), app config (`vite.config.ts`, `vitest.config.ts`,
   `playwright.config.ts`, tsconfig paths `@/*`), Turbo tasks `dev` / `build` / `test:e2e`,
   knip workspaces, remove `packages/example`. Dependencies via `pnpm add -E`.
3. **Shared** — `DomainError` taxonomy, `Clock` / `IdGenerator` ports + adapters + twins,
   `loadEnv`, logger, oRPC context / error mapping / router, `/api/rpc/$` route, isomorphic RPC
   client, query client, root route with styles.
4. **Feature `greeting`** — domain, use cases, port, in-memory adapter, procedures, client api /
   ViewModel / Views / page / copy, index route; unit tests per layer, contract suite, e2e spec.
5. **Architecture enforcement** — Biome overrides + Grit plugins, fixture test with completeness
   assertion, layout test, ADR 0010.
6. **Agent rules** — run `/conventions:port-claude-config`, merge the generalized source-project
   rules, `.claude/settings.json`, generate `AGENTS.md`; ADR 0011; ADR 0007 amendment.
7. **Pipeline** — CI (`build` in `check`, `e2e`, `agents-md` pinned to the plugin SHA),
   rulesets required checks, release-please entry for `apps/web`, README app section,
   `setup-repo.sh` re-run.
8. **Validation** — [quickstart.md](./quickstart.md) end to end.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| ADR 0007 amended: no form library (zod + `useReducer`) instead of TanStack Form | The maintainer asked to port the source project's rules, whose UI rule forbids a form library; one zod schema serves client and procedure | Keeping TanStack Form contradicts the ported rule set; awaiting confirmation |
| CI depends on an external repository (claude-conventions) for the AGENTS.md check | FR-024 requires the sync check and the generator lives in the plugin | Vendoring the generator would fork the plugin and drift from it |
