# Research: Starter App

Versions verified on the npm registry on 2026-10-26 and re-verified at implementation time
(T001, 2026-10-26): every pin below is still the latest stable release.

### Versions

- Decision (exact pins):
  - App: `@tanstack/react-start` 1.169.4 (peer vite >= 8, node >= 22.12; brings
    `@tanstack/react-router` 1.170.46 — pin the same version as a direct dependency),
    `@tanstack/react-query` 5.104.5, `react` / `react-dom` 19.3.1, `@types/react` /
    `@types/react-dom` 19.3.0, `vite` 8.3.5, `@vitejs/plugin-react` 6.1.2.
  - RPC: `@orpc/server`, `@orpc/client`, `@orpc/tanstack-query` 1.16.1; `zod` 4.6.7.
  - UI: `tailwindcss` / `@tailwindcss/vite` 4.3.3, `radix-ui` 1.8.1,
    `class-variance-authority` 0.7.1, `clsx` 2.1.1, `tailwind-merge` 3.7.0, `lucide-react`
    1.61.0, `tw-animate-css` 1.4.0; `shadcn` 4.22.1 used through `pnpm dlx` only (not a
    dependency).
  - Tests: `@playwright/test` 1.64.1, `jsdom` 30.1.3, `@testing-library/react` 16.3.3,
    `@testing-library/dom` 10.4.2 (required peer), `@testing-library/user-event` 14.6.8.
  - Production server: `srvx` 1.0.7 (see "Production server" below).
  - Root tooling: `@biomejs/biome` 2.6.3 and `knip` 6.43.0 (bumped from 2.6.2 / 6.42.1 in
    Phase 2 at the maintainer's request; no new diagnostics). `nitro` has no stable 3.x release
    (latest `3.0.260903-beta`), so it is not used.
  - Query SSR integration (added in T020): `@tanstack/react-router-ssr-query` 1.167.3 (peer
    `@tanstack/react-router >= 1.170.33`, `@tanstack/react-query >= 5.102.0`), the integration
    the Start docs prescribe for a per-request `QueryClient` with SSR dehydration/hydration.
  - Node types for the app: `@types/node` 24.19.2 (same runtime major as the root).
- Rationale: latest stable of each; every engine range accepts Node 24.22.1.
- Alternatives considered: `@tanstack/router-plugin` direct install (rejected: bundled by the
  Start plugin); `vite-tsconfig-paths` (rejected: Vite 8 `resolve.tsconfigPaths: true` is native).
- Sources: `npm view <pkg> version peerDependencies engines`.

### TypeScript 7 compatibility

- Decision: TypeScript 7.0.2 only. Phase 1 starts with a spike: `tsc --noEmit` on the generated
  route tree and on an oRPC client type test (inferred input/output asserted with `expectTypeOf`).
  Fallback if inference breaks: side-by-side TS 6 alias `@typescript/typescript6` for the app's
  `typecheck` task only, recorded in ADR 0002.
- Rationale: no package in the stack declares `typescript` as a dependency or peer; the router
  generator uses babel and prettier, not the compiler API. shadcn's `ts-morph` bundles its own
  TypeScript and runs outside the build.
- Spike outcome (T004, 2026-10-26): **TypeScript 7.0.2 holds; no fallback.** `tsc --noEmit` in
  `apps/web` (tsc 7.0.2) passes on `src/routeTree.gen.ts`, `src/routes/api/rpc.$.ts` and a type
  test using `InferRouterInputs` / `InferRouterOutputs` and `RouterClient<typeof router>` with
  `expectTypeOf(...).toEqualTypeOf`. Negative checks fail as expected: a wrong input type
  (`{ name: number }`), a wrong client parameter and a wrong output (`createdAt: string` instead
  of `Date`) each raise TS2344; a comparison of `Route.fullPath` with an unknown path raises
  TS2367 (the generated route tree is type-checked, not `any`). The spike files are
  `apps/web/src/spike/spike-router.ts` and `apps/web/tests/spike/spike-router.test.ts`; T018/T019
  replace the router and delete both. `@/*` resolves through `paths: { "@/*":
  ["${configDir}/src/*"] }` in `@repo/tsconfig/react-app.json`, read by both tsc 7 and Vite 8.

### TanStack Start setup

- Decision: `vite.config.ts` with `tanstackStart({ importProtection: { behavior: 'error', … } })`
  before `viteReact()`, `tailwindcss()`, `resolve.tsconfigPaths: true`. Entry files
  `src/router.tsx` (`getRouter()`), `src/routes/__root.tsx`, file routes under `src/routes/`.
  Production: `vite build` then `srvx serve --prod --static ../client --entry
  dist/server/server.js` (see "Production server").
- Rationale: documented Start layout; import protection turns a client import of a server module
  into a build error (second line of defence behind the lint rules).
- Import protection verified (T005/T006 spike): a value import of `@/shared/server/*` from a
  route component fails `vite build` with `[import-protection] Import denied in client
  environment — Denied by file pattern: **/shared/server/**`; the same import as `import type`
  builds. A server route (`server.handlers`) importing a module under `shared/server` builds and
  none of its code reaches `dist/client`. `client.files` replaces the default `**/*.server.*`.

### Production server

- Decision (T006): no Nitro. `vite build` emits `dist/client/` (static assets) and
  `dist/server/server.js` (default export `{ fetch }`, a web-standard Start handler). The app's
  `start` script is `srvx serve --prod --static ../client --entry dist/server/server.js`
  (`--static` is resolved relative to the entry's directory). Port: `PORT` environment variable
  (srvx default `3000`); `--port` / `--host` flags also exist. Verified: `PORT=4125 pnpm start`
  serves `/` (200, SSR HTML), `/assets/*.js` (200, `text/javascript`), unknown page (404),
  `POST /api/rpc/spike/echo` (`{"json":{"message":"Hello, Ada!",…}}`) and an invalid input
  (`BAD_REQUEST`, "Input validation failed").
- Rationale: the documented `node .output/server/index.mjs` path needs the `nitro/vite` plugin,
  whose only 3.x releases are betas (constitution IV: latest stable) and whose build emits
  `MODULE_LEVEL_DIRECTIVE` warnings (zero-warning gate); the Start docs list srvx as the way to
  run the fetch entry on Node. Without Nitro the build has zero warnings.
- Fail-fast startup (T019): Start loads the route tree lazily, so a composition root imported
  only by `routes/api/rpc.$.ts` would validate the environment on the first request. A custom
  server entry `src/server.ts` (`createServerEntry` delegating to the default handler) imports
  `shared/server/composition-root.ts`, so `srvx` exits with the `ConfigurationError` at startup
  (FR-010). Verified: without `GREETING_HISTORY_LIMIT`, `pnpm start` exits 1 naming the variable.
- Consequences: Turbo `build` outputs stay `dist/**` (T012 no longer needs `.output/**`);
  Playwright's `webServer` (T011) runs `pnpm start` with `PORT` set; `srvx` is a runtime
  dependency of `apps/web`.
- Sources: https://tanstack.com/start/latest/docs/framework/react/guide/hosting.md,
  https://github.com/h3js/srvx/blob/main/docs/1.guide/9.cli.md
- Sources: https://tanstack.com/start/latest/docs/framework/react/guide/hosting,
  https://tanstack.com/start/latest/docs/framework/react/guide/import-protection.md

### Transport: oRPC instead of server functions

- Decision: one oRPC router (`src/shared/server/rpc/router.ts`) composed from feature
  procedures, mounted by the server route `src/routes/api/rpc.$.ts` with
  `RPCHandler(router).handle(request, { prefix: '/api/rpc', context })`. Isomorphic client via
  `createIsomorphicFn()`: `RPCLink({ url: '/api/rpc' })` in the browser, `RPCLink` with the
  request origin and headers on the server. TanStack Query integration via
  `createTanstackQueryUtils(client)`.
- Rationale: the maintainer's chosen target; a typed contract independent of the framework, one
  endpoint, procedures testable without HTTP, framework-agnostic handlers.
- Alternatives considered: `createServerFn` (rejected by the maintainer: transport tied to the
  framework, one endpoint per function); tRPC (rejected: oRPC is the source project's target).
- Sources: https://github.com/dinwwwh/orpc/blob/main/apps/content/docs/adapters/tanstack-start.mdx

### Architecture enforcement

- Decision: Biome only, spike-validated in Phase 1:
  - `noRestrictedImports` with `patterns`, scoped by `overrides[].includes` per layer, for layer
    direction, vendor SDKs outside infrastructure and parent-relative imports (`../*`).
  - GritQL plugins (`scripts/biome/*.grit`, scoped through `overrides`) for what the native rule
    cannot express: client value-imports of server code (type-only allowed), pass-through
    re-exports outside feature entry points, cross-feature imports (current feature's folder vs
    the imported `@/features/<name>`).
  - A fixture test (`apps/web/tests/architecture/`) writes each violating and compliant snippet
    into a temporary copy of the Biome config and asserts the rule's diagnostic appears iff a
    violation is expected; a second test checks the feature folder layout.
  - Start import protection as a build-time backstop for client → server value imports.
- Fallback: a rule that Biome cannot express after the spike moves to `dependency-cruiser`
  (decided per rule, recorded in the ADR).
- Rationale: zero new tool, editor feedback through the existing Biome integration, same
  technique as the source project but applied to every feature by path pattern.
- Alternatives considered: dependency-cruiser first (rejected: extra tool, may need the TS JS
  API); ESLint boundaries plugin (rejected: ESLint is not in the stack).
- Spike outcome (T005, Biome 2.6.2, fixtures in a temporary directory, 2026-10-26): **every rule
  holds in Biome; dependency-cruiser is not needed.** Per rule id:

  | Id | Mechanism that holds | Evidence |
  |---|---|---|
  | ARCH-LAYER | `noRestrictedImports` `patterns[].group` (e.g. `@/features/*/server/infrastructure/**`, `@/shared/server/**`) in an override whose `includes` targets the layer (`apps/*/src/features/*/server/domain/**`) | domain file importing `@/features/alpha/server/infrastructure/y` → `ARCH-LAYER` diagnostic; `@/shared/domain/errors` and `./sibling` → none. `import type` is reported too (layer rule is strict). A `!`-negated path in `overrides[].includes` is exempted (verified). |
  | ARCH-FEATURE | GritQL plugin: `$filename <: r".*/features/([^/]+)/.*"($own)`, `$source <: r"['\"]@/features/([^/'\"]+).*"($target)`, `not $target <: $own` | `features/alpha/…` importing `@/features/beta/server` (value and type) and `@/features/alphabet/server` → reported; `@/features/alpha/server/domain/x` and `@/shared/x` → none. The `shared/` and `routes/` parts use `noRestrictedImports`: `shared/**` (minus `!composition-root.ts`, `!rpc/router.ts`) bans `@/features`, `@/features/**`; those two files use group `["@/features/**", "!@/features/*/server"]`; `routes/**` uses `["@/features/**", "!@/features/*", "!@/features/*/index"]` — all verified (negation inside `group` works). |
  | ARCH-CLIENT-SERVER | GritQL plugin on `` `import $clause from $source` `` with `$filename <: r".*/features/[^/]+/client/.*"`, source regex `@/(?:features/[^/]+/server\|shared/server)`, `not $imp <: r"(?s)import\s+type\s.*"`; a second pattern `` `import $source` `` for side-effect imports; Start import protection as build backstop | value, namespace, default and side-effect imports of server code from `client/` → reported; `import type { … }` (single and multi-line) → none; `@/features/alpha/serverless` → none. `import { type V }` (inline type specifier) is reported: the rule requires a top-level `import type`. |
  | ARCH-VENDOR | `noRestrictedImports` `patterns[].group` with the configured vendor list (e.g. `zod`, `@orpc/*`, `@aws-sdk/*`) in the layer overrides that are not `server/infrastructure` / `shared/server/adapters` | `zod` and `@orpc/server` in `server/domain` → `ARCH-VENDOR`; `zod` in `server/infrastructure` → none. |
  | ARCH-REEXPORT | GritQL plugin: `or { … }` over the four forms `export * from $source`, `export * as $ns from $source`, `export { $names } from $source`, `export type { $names } from $source`, with `not $filename <: r".*/features/[^/]+/(?:index\|server\|testing)\.tsx?"` | `server/domain/index.ts` and `features/alpha/other.ts` re-exports (all four forms) → reported; the same lines in the feature's `index.ts`, `server.ts`, `testing.ts` → none; local `export { local as l2 }` → none. |
  | ARCH-RELATIVE | `noRestrictedImports` `patterns[].group: ["../**", ".."]` | `../x`, `../application/x`, `../../x`, `..` → reported; `./sibling` → none. `../*` alone only matches one segment (`../x`) and misses `../application/x`; `..` is needed for the bare parent import. |

  Constraints found, to apply in Phase 5:
  - Two overrides setting `noRestrictedImports` on the same file do **not** merge options: the
    later override replaces the earlier one's `patterns`. Each layer override must therefore
    carry the full list (ARCH-RELATIVE + ARCH-LAYER + ARCH-VENDOR), generated from one source
    in the config, never per feature.
  - Grit regexes: capture groups bind variables (`r"…(…)…"($a)`); an unbound capture group is an
    error ("regex pattern matched 2 variables, but expected 0"), so use `(?:…)` elsewhere.
  - `register_diagnostic` messages are literal (no `$var` interpolation); put the rule id in the
    message text.
  - Plugins accept `{ "path", "includes" }` with `!` negation (verified), so the Grit rules are
    scoped to `apps/*/src/**` from the root config.
  - Anchor filename regexes on `/apps/[^/]+/src/features/` so a parent directory named
    `features` cannot be captured.
  - Not covered by the import patterns: dynamic `import()` and `export … from` across features;
    add `export … from` forms to the ARCH-FEATURE plugin in Phase 5.
  - `linter.rules.recommended` is deprecated in 2.6 (`preset` replaces it); the fixture config
    must use `preset`.
- Sources: https://biomejs.dev/linter/rules/no-restricted-imports/,
  https://biomejs.dev/linter/plugins/

### UI package

- Decision: `packages/ui` (`@repo/ui`) holds shadcn components (button, input, label, card,
  alert), the `cn` helper and `theme.css` (semantic tokens, light theme). The app imports
  `@repo/ui/components/*` and `@repo/ui/theme.css`; Tailwind scans the package through `@source`.
- Rationale: FR-013; a second app reuses the same kit; matches ADR 0007 (shadcn, owned code).
- Setup (T007/T008): style `radix-nova`, base color `neutral`, Tailwind v4 (`tailwind.config`
  empty). Package-local aliases through `package.json#imports` (`#components/*`, `#lib/*`);
  public subpaths through `exports`. shadcn 4.22.1 rewrites the `utils` alias `#lib/cn` to a bare
  `"cn"` import and installs the unrelated npm package `cn@^0.5.0` (reproduced with
  `#lib/utils` too); after `shadcn add`, remove that dependency and replace `from "cn"` with
  `from "#lib/cn"` in the generated files. The generated sizes (`h-8` buttons and inputs) are
  below the 44 px tap target; the app sizes them through `className` (T034).
- Biome parses Tailwind directives in CSS (`css.parser.tailwindDirectives: true`).

### Forms

- Decision: TanStack Form is replaced by a zod schema shared with the procedure input and a
  `useReducer` ViewModel hook, per the source project's UI rule ("no form library"); ADR 0007 is
  amended (superseding note) — maintainer confirmation required.
- Rationale: one schema validates client and server; no extra dependency for a one-field form.
- Alternatives considered: keep TanStack Form (ADR 0007 as accepted in spec 1).

### Environment

- Decision: `src/shared/server/config/env.ts` exports `loadEnv(source)` that parses with zod
  (blank values treated as unset) and throws a typed configuration error naming every invalid
  variable; called once by the composition root. Variables: `GREETING_HISTORY_LIMIT` (required,
  positive integer), `LOG_LEVEL` (optional, `debug|info|warn|error`, default `info`).
  `.env.example` lists both. No client-exposed variable in the demo.
- Rationale: FR-010; the drift test asserts `.env.example` and the schema list the same names.

### Tests

- Decision: Vitest per app with two projects: `unit` (node: domain, application,
  infrastructure, rpc, contracts, architecture) and `dom` (jsdom: client components and hooks).
  Port contract suite in `tests/contracts/greeting-repository.contract.ts`, run by
  `in-memory-greeting-repository.test.ts`. Playwright in `tests/e2e/` with `webServer` running
  the production build; CI runs `playwright install --with-deps chromium`, no browser cache.
- Rationale: FR-015–FR-017; fast node tests by default, jsdom only where the DOM is needed.

### claude-conventions integration

- Decision: plugin `conventions@claude-conventions` (public repo `Azurioh/claude-conventions`,
  no release tag yet; pinned by commit SHA). Files:
  - `.claude/conventions.json`: `integrationBranch: staging`, `productionBranch: main`,
    `packageManager: pnpm`, `formatter: biome`, `apps: { web: apps/web }`, `adrDir: docs/adr`,
    `prSize: { lines: 400, files: 15, label: large-pr, exclude: [pnpm-lock.yaml, specs/**,
    **/routeTree.gen.ts] }`.
  - `.claude/settings.json`: `extraKnownMarketplaces.claude-conventions` +
    `enabledPlugins["conventions@claude-conventions"]`, permissions for the CI commands, deny
    force-push.
  - `CLAUDE.md` (≤ 40 lines) + `.claude/rules/{workflow,architecture,clean-architecture,coding,
    errors,ui,knowledge,pitfalls}.md` + `.claude/rules/web/commands.md`, generated by
    `/conventions:port-claude-config` then merged with the generalized source-project rules.
  - `AGENTS.md` generated by the plugin's `scripts/agents-md.sh`; CI job `agents-md` checks out
    the plugin at the pinned SHA and runs `scripts/agents-md.sh --check`.
- Rationale: FR-022–FR-024; the hooks (branch guard, exact pins, PR size, AGENTS.md regen) apply
  to every agent session in a generated project.
- Open risk: the generator needs `jq` and mikefarah `yq` v4 on the CI runner (both preinstalled
  on GitHub Ubuntu runners; verify).

### Release and pipeline

- Decision: release-please manifest gets `apps/web` (`initial-version: 0.1.0`,
  `bump-minor-pre-major`); root package excludes `apps/web` via `exclude-paths` (verify option).
  Turbo: `dev` (persistent, no cache), `build` (outputs `dist/**`), `test:e2e` (depends on
  `build`). knip needs no `ignore` for `routeTree.gen.ts` (its TanStack Router plugin handles
  it; an explicit entry is reported as a configuration hint, an error here). CI: `check` job also runs `build`; new jobs `e2e` and `agents-md`; rulesets add both
  as required checks.
- Rationale: FR-026, FR-027.
