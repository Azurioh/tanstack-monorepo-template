# @azurioh/arch-rules

Architecture rules for TanStack Start monorepos laid out as `apps/*/src/features/*`, shipped as:

- a Biome 2 preset (`@azurioh/arch-rules/biome`): `noRestrictedImports` overrides plus GritQL
  plugins, each diagnostic prefixed with a stable rule id;
- agent rules (`rules/*.md`) that `arch-rules sync` copies into `.claude/rules/arch-rules/`;
- a CLI: `arch-rules <sync|check|layout> [--repo <dir>] [--apps <glob>]`.

The preset holds only these rules. Formatting, the `recommended` rule set and style rules such as
`useBlockStatements` (braces on every `if`/`else`) stay in the project's own `biome.jsonc`.

## Rules

Paths are relative to the repository root; `<app>` is any folder matching `apps/*`.

| Id                   | Forbids                                                                                                                                                                                                                                                                                                                      | Applies to                                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ARCH-LAYER`         | An import from an outer layer. Domain ← application ← infrastructure ← rpc; `client/` imports only `client/`, `schemas.ts`, `shared/client` and server code (type-only); `shared/domain` imports only itself; page routes never import `shared/server`; `routes/api/` imports only `shared/server/composition-root` from it. | `<app>/src/features/*/server/{domain,application,infrastructure,rpc}/**`, `<app>/src/features/*/client/**`, `<app>/src/shared/domain/**`, `<app>/src/routes/**` |
| `ARCH-FEATURE`       | A feature importing or re-exporting another feature; `shared/` importing a feature (except a feature's `server.ts`, from the composition root and the RPC router); routes and `src/*.ts` importing anything but a feature's `index.ts` (or `server.ts` for `src/*.ts`).                                                      | `<app>/src/features/*/**`, `<app>/src/shared/**`, `<app>/src/routes/**`, `<app>/src/*.{ts,tsx}`                                                                 |
| `ARCH-CLIENT-SERVER` | A value import or re-export of server code (`@/features/*/server…`, `@/shared/server…`) from client code; only a top-level `import type` passes.                                                                                                                                                                             | `<app>/src/features/*/client/**`, `<app>/src/features/*/index.{ts,tsx}`, `<app>/src/shared/client/**`                                                           |
| `ARCH-VENDOR`        | Importing a vendor SDK (`@aws-sdk/*`, `@google-cloud/*`, `@azure/*`, `@prisma/client`, `drizzle-orm`, `pg`, `postgres`, `mysql2`, `mongodb`, `ioredis`, `redis`, `stripe`, `resend`, `nodemailer`).                                                                                                                          | `<app>/src/**`, except `features/*/server/infrastructure/**` and `shared/server/adapters/**`                                                                    |
| `ARCH-REEXPORT`      | `export … from` (a pass-through re-export).                                                                                                                                                                                                                                                                                  | `<app>/src/**`, except a feature's `index`, `server` and `testing` `.ts`/`.tsx`                                                                                 |
| `ARCH-RELATIVE`      | A parent-relative import (`..`, `../…`); use the `@/` alias.                                                                                                                                                                                                                                                                 | `<app>/src/**`                                                                                                                                                  |
| `ARCH-LAYOUT`        | Any entry of a feature folder outside `server/{domain,application/ports,infrastructure,rpc}`, `client/{api,hooks,components,pages,copy.ts}`, `schemas.ts`, `index.ts`, `server.ts`, `testing.ts`. Checked by `arch-rules layout`, not by Biome.                                                                              | `<app>/src/features/*` (`--apps` changes the app glob)                                                                                                          |

## Adopt

1. Install the package at the workspace root, exact-pinned:

   ```bash
   pnpm add -E -D -w @azurioh/arch-rules
   ```

   It needs `@biomejs/biome` `>=2.6.3 <3.0.0` (peer dependency).

2. Extend the preset in the root `biome.jsonc`. Keep `files`, `formatter`, `linter` and the
   project's own rules there:

   ```jsonc
   {
     "root": true,
     "extends": ["@azurioh/arch-rules/biome"]
   }
   ```

3. Run `arch-rules check` and `arch-rules layout` from the root `check` script. In a Turborepo
   root, add a script and a root task, and list it in `check`:

   ```jsonc
   // package.json
   "scripts": {
     "arch": "arch-rules check && arch-rules layout",
     "check": "turbo run lint typecheck test knip build arch"
   }
   // turbo.json, under "tasks"
   "//#arch": {}
   ```

4. Copy the agent rules, then commit `.claude/rules/arch-rules/` (and `AGENTS.md` if it changed):

   ```bash
   pnpm exec arch-rules sync
   ```

   `sync` writes each shipped rule with a managed header, deletes managed files the installed
   version no longer ships and never touches a file without the header. It regenerates
   `AGENTS.md` when the conventions plugin is installed, and prints the command otherwise.
   `check` fails on a `missing`, `differs` or `stale` file; a repository without `.claude/` is
   skipped.

5. Add a parity test in the app (the template's is `apps/web/tests/architecture/arch-ids.test.ts`).
   For each of the six lint ids it writes one violating file at its real path under `src/`, runs
   `biome lint` with the project's `biome.jsonc` and asserts the id appears. No compliant cases:
   the package proves those. It fails when a project override silently disables a preset rule
   (see Add project rules).

6. In a project created from the template, remove the package's sources and release plumbing:
   delete `packages/arch-rules`, its entries in `release-please-config.json` (and the
   `packages/arch-rules` path in the root component's `exclude-paths`) and
   `.release-please-manifest.json`, the `publish-arch-rules` job in
   `.github/workflows/release-please.yml`, the `@azurioh/arch-rules#test` task in `turbo.json`,
   its `knip.json` workspace and the `packages/arch-rules/dist` ignore entries.

## Add project rules

- **A GritQL plugin** in the project's own `plugins` list, on any files. The list is concatenated
  with the preset's, so both run.
- **A `noRestrictedImports` override** only on paths the preset does not cover.
- **Never** a `noRestrictedImports` override on a glob the preset already covers: Biome does not
  merge them, the project's restriction replaces the preset's for those files and the `ARCH-*` id
  disappears. Write a GritQL plugin instead; the parity test catches the mistake.

## Update PR turned red

A new version arrives as a dependency-update PR. When its CI fails:

- **`arch-rules check` fails** (`differs`, `missing` or `stale`): run `pnpm exec arch-rules sync`
  on the PR branch and commit the result.
- **Lint fails with an `ARCH-*` id**: the new version flags existing code. Move the code until the
  rule passes, or hold the update (leave the PR unmerged) until you can. Never silence the rule.

## Versioning

Semantic versioning, released by release-please as the `arch-rules` component (tags
`arch-rules-v<version>`, changelog in `CHANGELOG.md`).

- **Major** (`feat(arch-rules)!`): any change that can flag code the previous version accepted,
  including a new rule that only covers new paths if existing code can trip it.
- **Minor** (`feat(arch-rules)`): new capability that flags nothing new.
- **Patch** (`fix(arch-rules)`): a fix that only stops a false positive.
- Commit subjects name the affected rule ids, so the changelog lists them.

## Maintainers: first publish

npm trusted publishing can only be configured for a package that already exists, so version
`1.0.0` is published once by hand; CI's `publish-arch-rules` job skips with a notice until then.

1. After the release PR on `main` creates the tag, publish from it (logged in with `npm login`):

   ```bash
   git fetch --tags
   git switch --detach arch-rules-v1.0.0
   pnpm install --frozen-lockfile
   pnpm exec turbo run build test --filter=@azurioh/arch-rules
   cd packages/arch-rules
   pnpm pack
   npm publish ./azurioh-arch-rules-1.0.0.tgz --access public
   ```

   `pnpm pack` resolves the `workspace:` ranges that `npm publish` would leave as is.

2. On npmjs.com, in the package settings, add a trusted publisher: GitHub Actions, repository
   `Azurioh/tanstack-monorepo-template`, workflow `release-please.yml`.

3. Check `npm view @azurioh/arch-rules version` shows `1.0.0`. Every later version is published
   by CI, with provenance and no npm token.

## License

MIT
