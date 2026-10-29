# Clean architecture (every `apps/*`, ADR 0003)

How the generic rules of `architecture.md` map onto a feature's `server/` folders.

- **Domain** (`server/domain/`): entities and value objects with a `create` factory that checks
  the invariants and throws a business error; immutable (a change returns a new value); no
  import of a framework, `zod`, `@orpc/*` or any vendor package (`ARCH-VENDOR`). Business errors
  of the feature live in one `<feature>-error.ts` and extend the `shared/domain/errors.ts`
  taxonomy.
- **Application** (`server/application/`): one class per use case, one `execute` method, ports
  injected through the constructor. Ports are interfaces in `application/ports/`, named after
  the business need (`GreetingRepository`), never after a technology. Cross-feature ports
  (`Clock`, `IdGenerator`) live in `shared/server/ports/`. A use case returns a DTO built by a
  mapper in the application layer; an entity never leaves it.
- **Infrastructure** (`server/infrastructure/`): adapters implementing the ports. Every port has
  an `in-memory-<port>.ts` twin; every adapter of a port runs the same contract suite
  (`tests/contracts/<port>.contract.ts`), so the twin and the real adapter cannot drift.
- **Transport** (`server/rpc/<feature>-procedures.ts`): a `create<Feature>Procedures(useCases)`
  factory; each procedure validates its input with the feature's `schemas.ts`, calls one use
  case and returns its DTO. No business decision in a procedure, no error mapping per feature
  (the shared base procedure maps errors, see `errors.md`).
- **Wiring**: `server.ts` exports `create<Feature>UseCases(deps)`, the only file outside
  infrastructure that names an adapter. `shared/server/composition-root.ts` calls it once per
  process with the shared adapters and the validated settings; the router mounts its procedures.
- **Settings**: a feature declares its environment variables in `server.ts`; the composition
  root validates every declared variable at startup and refuses to start, naming each invalid
  one. Code under `features/` never reads `process.env`.
- **Tests**: domain and application are tested with in-memory twins and fixed clocks or id
  generators from `testing.ts`; never a mock of an internal module.
