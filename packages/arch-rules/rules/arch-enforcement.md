# Architecture enforcement (every `apps/*`, `@azurioh/arch-rules`)

## App layout

- A feature is exactly `server/{domain,application/ports,infrastructure,rpc}`,
  `client/{api,hooks,components,pages,copy.ts}`, `schemas.ts`, `index.ts` (client entry),
  `server.ts` (server entry, `create<Feature>UseCases` factory) and `testing.ts` (test twins).
  Anything else fails `ARCH-LAYOUT` (`arch-rules layout`, run on `apps/*/src/features/*`).
- Cross-feature code lives in `src/shared/{domain,server,client}`.
  `src/shared/server/composition-root.ts` is the only file that binds ports to adapters and the
  only file that reads `process.env` (through `loadEnv` in `shared/server/config/env.ts`).
- Adding a feature = copying an existing feature folder, its tests, and one line each in
  `shared/server/rpc/router.ts` and `composition-root.ts`. Removing it = the reverse.
- Import rules are lint errors with a stable id, enabled by extending `@azurioh/arch-rules/biome`
  in `biome.jsonc`; each rule is proven by a violating and a compliant fixture inside the
  package:
  - `ARCH-LAYER` — a layer imports only itself and inner layers (domain ← application ←
    infrastructure ← rpc); page routes never import `shared/server`; `routes/api/` imports only
    `shared/server/composition-root` from it.
  - `ARCH-FEATURE` — no feature imports another; `shared/` imports a feature's `server.ts`
    only from the composition root and the RPC router; routes import a feature's `index.ts`.
  - `ARCH-CLIENT-SERVER` — client code imports server code with a top-level `import type`
    only (inline `import { type X }` is rejected); Start import protection is the build backstop.
  - `ARCH-VENDOR` — vendor SDKs only in `server/infrastructure/` and `shared/server/adapters/`;
    the list is the regex in the package's `plugins/vendor-sdks.grit`.
  - `ARCH-REEXPORT` — `export … from` only in a feature's `index.ts`, `server.ts`, `testing.ts`.
  - `ARCH-RELATIVE` — no `../` import inside an app; use `@/…`.
- A new layer, feature entry or rule is added in `@azurioh/arch-rules` (preset, fixtures, README
  rules table), never patched locally. A lint error from these rules means move the code, never
  suppress it.
