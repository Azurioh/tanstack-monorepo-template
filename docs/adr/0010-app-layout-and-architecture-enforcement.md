# 0010. App layout and architecture enforcement

**Status**: Accepted
**Date**: 2026-10-29
**Applies to**: `apps/*`, root `biome.jsonc`, `scripts/biome/`

## Context

[ADR 0003](./0003-clean-architecture.md) sets the dependency rule, feature-first folders and alias
imports, and leaves their enforcement to the first app. Rules that live only in documents erode at
the first deadline: a domain file imports an adapter, a component calls a use case directly, a
feature reaches into another one. A copied feature must inherit every check without anyone editing
a configuration file, and a second app must inherit them too.

## Decision

- **One layout per feature.** Every `apps/*/src/features/<feature>/` holds exactly `server/`
  (`domain/`, `application/` with `ports/`, `infrastructure/`, `rpc/`), `client/` (`api/`,
  `hooks/`, `components/`, `pages/`, `copy.ts`), `schemas.ts`, `index.ts` (client entry point),
  `server.ts` (server entry point) and `testing.ts` (test twins). Cross-feature code lives in
  `src/shared/{domain,server,client}`; `shared/server/composition-root.ts` is the only place ports
  are bound to adapters.
- **Every rule is enforced by Biome, the existing linter**, so editors and `pnpm lint` report it
  with a stable id in the message:
  - `ARCH-LAYER`: a layer imports only itself and inner layers. `noRestrictedImports`, one
    override per layer: `@/**` is denied and the allowed layers are re-allowed with `!`. Routes
    are a layer too: `routes/api/` (server endpoints) may import `shared/server/composition-root`
    and no other `shared/server` module; every other route never imports `shared/server`.
  - `ARCH-FEATURE`: a feature never imports another feature; `shared/` never imports a feature,
    except `server.ts` from the composition root and the RPC router; routes import a feature's
    `index.ts`. GritQL `feature-boundaries.grit` (own feature and imported feature captured from
    the paths) plus `noRestrictedImports` overrides for `shared/`, `routes/` and `src/*.ts(x)`.
  - `ARCH-CLIENT-SERVER`: client code (`client/`, a feature's `index.ts`, `shared/client/`)
    imports server code with a top-level `import type` only. GritQL `client-server.grit`; TanStack
    Start `importProtection` in `vite.config.ts` fails the build on the same mistake.
  - `ARCH-VENDOR`: vendor SDKs are imported only in `server/infrastructure/` and
    `shared/server/adapters/`. GritQL `vendor-sdks.grit`, scoped to `apps/*/src/**` minus those
    two folders.
  - `ARCH-REEXPORT`: `export … from` only in a feature's `index.ts`, `server.ts` and `testing.ts`.
    GritQL `no-passthrough-reexports.grit`.
  - `ARCH-RELATIVE`: no parent-relative import (`../`, `..`) inside an app. `noRestrictedImports`
    pattern `["../**", ".."]`.
  - `ARCH-LAYOUT`: the feature layout above, no missing or extra entry. Vitest
    `apps/web/tests/architecture/layout.test.ts`.

- **Rules match paths, never feature names.** Overrides and plugin scopes use
  `apps/*/src/features/*/…`; the GritQL plugins capture the feature from `$filename`. A copied
  feature or a second app is covered without configuration changes.
- **The vendor list lives in one place**: the regex of `scripts/biome/vendor-sdks.grit`. A package
  is added there when an adapter starts using it.
- **Rules are tested.** `apps/web/tests/architecture/rules.test.ts` copies `biome.jsonc` and
  `scripts/biome/` into a temporary directory, writes each violating and compliant snippet at its
  path, runs `biome lint` and asserts the reported ids are exactly the expected one (or none). A
  completeness assertion fails when a rule id lacks a violating or a compliant fixture.

## Alternatives considered

- dependency-cruiser: rejected, the Phase 1 spike showed every rule holds in Biome; a second tool
  would add configuration, a separate editor integration and a slower CI step.
- ESLint with a boundaries plugin: rejected, ESLint is not in the stack (ADR 0004).
- `ARCH-VENDOR` through `noRestrictedImports`: rejected, overrides setting that rule on the same file
  do not merge, so the vendor list would be copied into every layer override.
- Documentation and code review only: rejected, see Context.

## Consequences

- Every `noRestrictedImports` override repeats the `ARCH-RELATIVE` pattern, because the last
  matching override replaces the earlier ones' options; a new override must do the same.
- `ARCH-CLIENT-SERVER` rejects inline type specifiers (`import { type X }`); client code writes a
  top-level `import type`.
- Dynamic `import()` is not checked by the lint rules; the Start import protection still blocks
  client value imports of server code at build time.
- Server endpoints live under `routes/api/` and reach the server only through the composition
  root, which exports what they mount (the RPC router and its context). A page route that needs
  server data goes through a feature's RPC procedures, never through `shared/server`.
- Tests under `apps/*/tests/` are out of scope of the import rules: unit tests import the layer they
  test directly.
- Adding a layer or a feature entry means updating `biome.jsonc`, the layout test and this ADR in
  the same pull request.
