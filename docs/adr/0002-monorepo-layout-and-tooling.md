# 0002. Monorepo layout and tooling

**Status**: Accepted
**Date**: 2026-10-23
**Applies to**: whole repository (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `apps/`, `packages/`)

## Context

Projects created from this template hold one or more web applications plus code shared between
them (TypeScript configuration, UI primitives, domain packages). They need one install, one set of
tools, cached task runs and a predictable place for each kind of code.

## Decision

- **pnpm workspaces**. The workspace is declared in `pnpm-workspace.yaml` with two globs:
  `apps/*` for deployable units and `packages/*` for shared code. pnpm is pinned through the
  `packageManager` field (`pnpm@12.15.0`) and used through Corepack.
- **Node.js 24 LTS**. The runtime is pinned in `.node-version` (`24.22.1`) and enforced through
  `engines.node` with `engine-strict=true` in `.npmrc`. The current non-LTS line is not used.
- **Turborepo** orchestrates tasks. Package tasks are `typecheck`, `test` and `build`
  (`dependsOn: ["^build"]`). Tasks that must see the whole repository run once at the root:
  `//#lint` (Biome covers root configuration files too), `//#typecheck` (root `*.ts` files) and
  `//#knip` (unused code across workspace boundaries). `pnpm check` runs
  `turbo run lint typecheck test knip`.
- **`@repo/*` scope** for every workspace package. Packages import each other by name with
  `workspace:*`, never through relative `../../` paths. The scope is renamed per project by the
  generator planned in spec 3.
- **Shared TypeScript configuration** lives in the `@repo/tsconfig` package (`base.json`, strict,
  `NodeNext`; `library.json` for packages), so every app and package extends it by name.
  `@repo/example` is a placeholder package that exercises every task until the first real
  package exists.
- **TypeScript 7 (native)**. `typescript@7.0.2` is the type checker, run as `tsc --noEmit`.
  TypeScript 7.0 ships no JavaScript compiler API (planned for 7.1), so every tool in the stack was
  checked not to depend on it: Biome is self-contained, knip 6 parses with oxc, Vitest transpiles
  with its own pipeline. knip 6.42.1 was verified green under TypeScript 7 on this repository, so
  the planned fallback (a side-by-side TypeScript 6 install aliased for knip) is not needed.
- **`@types/node` follows the runtime major** (24.x), not the latest major, so types never
  advertise APIs the pinned runtime lacks.

## Alternatives considered

- npm or Yarn workspaces: rejected, pnpm's strict `node_modules` layout catches undeclared
  dependencies and its store keeps installs fast.
- Nx: rejected, heavier configuration and plugin model than needed for a handful of packages.
- TypeScript 6: rejected, the constitution requires the latest stable release.
- `@types/node@26`: rejected, mismatched with the Node 24 runtime.

## Consequences

- One `pnpm install` sets up every app and package; Turborepo caches task results per package.
- Adding an app means creating `apps/<name>` with a `package.json` whose script names match the
  Turborepo tasks; no root configuration change is needed.
- Any future tool that requires the TypeScript JavaScript API must wait for TypeScript 7.1 or ship
  its own parser; adopting one needs a superseding ADR.
