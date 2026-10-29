# Contract: Architecture rules

Each rule has a stable id printed in its diagnostic, at least one violating fixture and one
compliant fixture in `apps/web/tests/architecture/`. Rules match paths by pattern
(`src/features/*/…`), never a feature name.

| Id | Rule | Violating example | Compliant example | Mechanism (target) |
|---|---|---|---|---|
| ARCH-LAYER | A layer imports only itself and inner layers (table in [feature-layout.md](./feature-layout.md)) | `server/domain/x.ts` imports `@/features/f/server/infrastructure/y` | domain imports `@/shared/domain/errors` | Biome `noRestrictedImports` + overrides |
| ARCH-FEATURE | A feature never imports another feature; `shared/` never imports a feature, except `server.ts` from the composition root and the RPC router, and `index.ts` from routes | `features/a/...` imports `@/features/b/server/domain/x` | `features/a/...` imports `@/shared/domain/x` | GritQL |
| ARCH-CLIENT-SERVER | Client code imports server code type-only | `client/hooks/x.ts`: `import { greet } from '@/features/f/server'` | `import type { AppRouter } from '@/shared/server/rpc/router'` | GritQL + Start import protection (`client.files`: `**/features/*/server/**`, `**/shared/server/**`) |
| ARCH-VENDOR | Vendor SDKs (configured list) only in `server/infrastructure` and `shared/server/adapters` | `server/application/x.ts` imports a vendor SDK | same import in `server/infrastructure/x.ts` | Biome `noRestrictedImports` patterns + overrides |
| ARCH-REEXPORT | No `export … from` outside a feature's `index.ts`, `server.ts`, `testing.ts` | `server/domain/index.ts`: `export * from './greeting'` | `features/f/index.ts` re-exporting its client API | GritQL |
| ARCH-RELATIVE | No parent-relative import (`../`) inside an app | `import { x } from '../domain/x'` | `import { x } from '@/features/f/server/domain/x'` | Biome `noRestrictedImports` patterns |
| ARCH-LAYOUT | Every feature has exactly the documented top-level entries | a feature with a `utils/` folder | the demo feature | Vitest layout test |

Scope: every rule applies to `apps/*/src/**`; workspace packages expose subpaths through
`package.json` `exports` and are not covered by ARCH-REEXPORT or ARCH-RELATIVE.

Fixture test contract:

- Input: `[rule id, file path inside a temporary app tree, source snippet, expect violation]`.
- The test copies the root Biome config and `scripts/biome/` into a temporary directory, writes
  the snippet at the path, runs `biome lint` on it and asserts the rule id appears in the output
  if and only if a violation is expected.
- `pnpm check` runs it through the app's `test` task; a rule without both fixtures fails a
  completeness assertion.

A rule moved to `dependency-cruiser` after the Phase 1 spike keeps its id and its fixtures.
