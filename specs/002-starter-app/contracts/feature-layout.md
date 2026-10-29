# Contract: App and feature layout

Every feature of every app follows this tree; the layout test fails on a missing or extra
top-level folder in a feature.

```text
apps/web/
├── src/
│   ├── features/<feature>/
│   │   ├── server/
│   │   │   ├── domain/                 # entities, value objects, business errors (pure)
│   │   │   ├── application/            # use cases
│   │   │   │   └── ports/              # interfaces the use cases depend on
│   │   │   ├── infrastructure/         # adapters implementing the ports (vendor SDKs live here)
│   │   │   └── rpc/                    # <feature>-procedures.ts, error mapping
│   │   ├── client/
│   │   │   ├── api/                    # query/mutation options built from the RPC client
│   │   │   ├── hooks/                  # ViewModels
│   │   │   ├── components/             # Views (props in, JSX out)
│   │   │   ├── pages/                  # page components used by routes
│   │   │   └── copy.ts                 # user-facing strings
│   │   ├── schemas.ts                  # zod schemas shared by client and procedures
│   │   ├── index.ts                    # client entry point
│   │   ├── server.ts                   # server entry point (procedures, env spec, wiring factory)
│   │   └── testing.ts                  # test twins and builders
│   ├── shared/
│   │   ├── domain/                     # DomainError taxonomy, shared value objects
│   │   ├── server/
│   │   │   ├── composition-root.ts     # the only place ports are bound to adapters
│   │   │   ├── config/env.ts           # appEnv, EnvSpec, loadEnv(source, featureSpecs)
│   │   │   ├── rpc/{router,context,errors}.ts
│   │   │   ├── logging/logger.ts
│   │   │   ├── ports/                  # Clock, IdGenerator
│   │   │   └── adapters/               # SystemClock, RandomIdGenerator
│   │   └── client/{rpc-client,query-client,copy}.ts, components/
│   ├── routes/{__root.tsx,index.tsx,api/rpc.$.ts}
│   ├── router.tsx
│   ├── routeTree.gen.ts                # generated, excluded from lint and knip
│   └── styles.css
├── tests/
│   ├── unit/features/<feature>/{domain,application,infrastructure,rpc,client}/
│   ├── unit/shared/
│   ├── contracts/<port>.contract.ts    # reusable suite, run by each adapter's test
│   ├── architecture/                   # rule fixtures + layout test
│   └── e2e/<feature>.spec.ts
├── .env.example
├── playwright.config.ts
├── vite.config.ts
└── vitest.config.ts
```

Import rules (enforced, see [architecture-rules.md](./architecture-rules.md)):

| From | May import |
|---|---|
| `server/domain` | `shared/domain`, same feature `server/domain` |
| `server/application` | + `server/application`, `shared/server/ports` |
| `server/infrastructure` | + vendor SDKs, `shared/server/adapters` |
| `server/rpc` | + `@orpc/server`, `schemas.ts`, `shared/server/rpc` |
| `client/*` | `client/*`, `schemas.ts`, `@repo/ui`, `shared/client`, server code **type-only** |
| `shared/server/composition-root.ts`, `shared/server/rpc/router.ts` | any feature's `server.ts` |
| any other file in `shared/` | `shared/` only, never a feature |
| `routes/**` except `routes/api/` | features' `index.ts`, `shared/client`; never `shared/server` |
| `routes/api/**` | features' `index.ts`, `shared/client`, `shared/server/composition-root` (no other `shared/server` module) |
| outside a feature | only its `index.ts`, `server.ts` or `testing.ts` (tests only) |

Naming: kebab-case files; `in-memory-<port>.ts` for in-memory adapters; `<feature>-procedures.ts`;
tests `<name>.test.ts(x)` mirroring the source path.
