# Architecture

<!-- conventions:begin architecture.structure -->
- **Feature-first.** A feature owns its slice — `domain/` → `application/` →
  `infrastructure/` → transport/UI — under one directory. Code two features
  need lives in `shared/`, never in either of them.
- **One registration point.** A feature plugs in through one factory listed at
  the composition root (the on/off switch); nothing self-registers on import.
- **Injected, never global**: logger, clock, id generator, database, config.
  Config is parsed once at boot into a typed object; a missing or invalid
  variable stops the process before it serves. Nothing else reads the env.
- **A new layer, folder convention or cross-feature dependency** the rules do
  not cover → ADR first (`/conventions:adr`), code second.
<!-- conventions:end architecture.structure -->

- **One accepted global**: `globalThis.$rpcServerClient`, the in-process oRPC client for
  server-side rendering (oRPC's "Optimize SSR" pattern, ADR 0011). Only the composition root
  sets it; only `shared/client/rpc-client.ts` reads it. No other global.

<!-- conventions:begin architecture.ports -->
- **Ports and adapters everywhere.** Never reach an external dependency (DB,
  HTTP API, filesystem, clock, mail, vendor SDK) directly — go through a port
  owned by the application layer and named after the business need, not the
  technology; the adapter lives in infrastructure with an in-memory twin for
  tests. Swapping a service = a new adapter, nothing else.
- **Layers never call each other directly.** Direction is domain ← application
  ← infrastructure ← transport/UI; wiring only happens in the composition
  root named in the app's rules (`.claude/rules/<app>/`). No concrete import
  crosses a ring: a lint error there means move the code, never silence it;
  where no linter enforces the direction, the rule still applies.
- **Business decisions are pure domain functions** — a test of them needing a
  mock means logic leaked into an adapter. Use case: refuse → validate → act.
  Entities are immutable: a state change returns a new value, and creation
  goes through a factory that checks the invariants.
- **A use case has one entry point** and receives its ports as injected
  dependencies. It never calls another use case (extract a domain service)
  and never receives a request, a session or an ORM type.
- **Plain data crosses the boundaries.** Use cases take and return DTOs;
  entities never leave the application layer. Two mappings, one place each:
  contract ↔ DTO in the transport handler (validate → authorize → use case →
  map), domain ↔ persistence in the adapter's mapper.
<!-- conventions:end architecture.ports -->

<!-- conventions:begin architecture.boundaries -->
- **No cross-feature import**: a feature imports `shared/` and its own ports,
  never another feature; client code imports server code as types only
  (`import type`). Only infrastructure names a vendor (ORM, SDK, driver);
  only the composition root or the feature's factory picks the adapter.
- **Another app or service is consumed through its API** behind one fetch
  layer — that layer is the adapter; pages and handlers never call its SDK
  or import its source.
- **Concurrency invariants live in the database** (unique constraints,
  conditional updates); isolation + retry is the second line; a parallel test
  is the proof an in-memory twin cannot give. Effects that leave the
  transaction (notify, wake a worker) run after commit, never shape the result.
<!-- conventions:end architecture.boundaries -->

<!-- conventions:begin architecture.testing -->
- **Every change is tested.** Domain + application: written test-first, unit
  tests with in-memory twins, never mocks of internals. Adapters: integration
  tests against real infrastructure (a test that skips silently when its env
  var is unset does not count — set it, run it).
  Transport: route/contract tests. A PR touching source with no test says why.
- The **Test layout** table below is project-owned (`--refresh` never rewrites
  it): one row per layer, paths relative to the app dir. `/conventions:test-gaps`,
  `test-writer` and `rules-reviewer` read it to place a file's test; the
  optional `other` row is the fallback for files matching no other glob.
<!-- conventions:end architecture.testing -->

## Test layout

Mirrored layout: a test sits at the source path under `tests/unit/`, minus the `server/` and
`client/<kind>/` segments of a feature (`src/features/<f>/server/domain/x.ts` →
`tests/unit/features/<f>/domain/x.test.ts`). Paths are relative to the app dir.

| layer | source glob | test dir | test kind |
|---|---|---|---|
| domain | `src/features/*/server/domain/**` | `tests/unit/features/*/domain` | unit |
| application | `src/features/*/server/application/**` | `tests/unit/features/*/application` | unit (in-memory twins) |
| infrastructure | `src/features/*/server/infrastructure/**` | `tests/unit/features/*/infrastructure` | contract (`tests/contracts/<port>.contract.ts`) |
| rpc | `src/features/*/server/rpc/**` | `tests/unit/features/*/rpc` | unit (procedures called without HTTP) |
| client | `src/features/*/client/**` | `tests/unit/features/*/client` | dom (jsdom project) |
| shared | `src/shared/**` | `tests/unit/shared` | unit |
| e2e | `src/routes/**` | `tests/e2e` | end-to-end (Playwright, production build) |
| other | `src/**` | `tests/unit` | unit |

## App layout (every `apps/*`, ADR 0010)

- A feature is exactly `server/{domain,application/ports,infrastructure,rpc}`,
  `client/{api,hooks,components,pages,copy.ts}`, `schemas.ts`, `index.ts` (client entry),
  `server.ts` (server entry, `create<Feature>UseCases` factory) and `testing.ts` (test twins).
  Anything else fails `ARCH-LAYOUT` (`apps/web/tests/architecture/layout.test.ts`).
- Cross-feature code lives in `src/shared/{domain,server,client}`.
  `src/shared/server/composition-root.ts` is the only file that binds ports to adapters and the
  only file that reads `process.env` (through `loadEnv` in `shared/server/config/env.ts`).
- Adding a feature = copying the demo feature folder, its tests, and one line each in
  `shared/server/rpc/router.ts` and `composition-root.ts`. Removing it = the reverse.
- Import rules are lint errors with a stable id (`biome.jsonc`, `scripts/biome/*.grit`); each
  rule has a violating and a compliant fixture in `apps/web/tests/architecture/rules.test.ts`:
  - `ARCH-LAYER` — a layer imports only itself and inner layers (domain ← application ←
    infrastructure ← rpc); page routes never import `shared/server`; `routes/api/` imports only
    `shared/server/composition-root` from it.
  - `ARCH-FEATURE` — no feature imports another; `shared/` imports a feature's `server.ts`
    only from the composition root and the RPC router; routes import a feature's `index.ts`.
  - `ARCH-CLIENT-SERVER` — client code imports server code with a top-level `import type`
    only (inline `import { type X }` is rejected); Start import protection is the build backstop.
  - `ARCH-VENDOR` — vendor SDKs only in `server/infrastructure/` and `shared/server/adapters/`;
    the list is the regex in `scripts/biome/vendor-sdks.grit`.
  - `ARCH-REEXPORT` — `export … from` only in a feature's `index.ts`, `server.ts`, `testing.ts`.
  - `ARCH-RELATIVE` — no `../` import inside an app; use `@/…`.
- A new layer, feature entry or rule updates `biome.jsonc`, the fixtures, the layout test and
  ADR 0010 in the same PR. A lint error from these rules means move the code, never suppress it.
