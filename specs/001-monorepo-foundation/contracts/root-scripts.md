# Contract: Root scripts

Root `package.json` scripts are the developer and CI interface. CI calls only these names.

| Script | Behaviour | Exit code |
|---|---|---|
| `pnpm check` | `turbo run lint typecheck test knip` — full suite, same as CI | non-zero on any error or warning |
| `pnpm lint` | `biome ci --error-on-warnings .` over the whole repository, root files included (lint + format check, no writes); Turbo root task `//#lint` | non-zero on any diagnostic |
| `pnpm format` | `biome check --write .` (apply safe fixes + format) | 0 unless unfixable errors |
| `pnpm typecheck` | `tsc --noEmit` on root config files via root `tsconfig.json`; Turbo root task `//#typecheck` (packages have their own `typecheck`) | non-zero on type error |
| `pnpm knip` | `knip` across the workspace; Turbo root task `//#knip` | non-zero on unused file / export / dependency |

Root scripts `lint`, `typecheck` and `knip` are the implementations of Turbo root tasks; they never
call `turbo` themselves (no recursion). `turbo.json` declares `//#lint`, `//#typecheck`,
`//#knip` and package tasks `typecheck`, `test`, `build`, so `turbo run lint typecheck test knip`
covers root and packages in one cached run.
| `pnpm prepare` | `lefthook install` (runs automatically on `pnpm install`) | 0 |

Package-level scripts (in each workspace package): `typecheck`, `test` (and `build` when the
package emits output). Linting is a single root task (`//#lint`) so one Biome config covers every
file, including root configuration; packages have no `lint` script. Turbo task names MUST match
these names.

Hooks (`lefthook.yml`):

| Hook | Command | Scope |
|---|---|---|
| `pre-commit` | `biome check --write --staged --no-errors-on-unmatched --error-on-warnings`, `stage_fixed: true` | staged files only |
| `commit-msg` | `pnpm exec commitlint --edit {1}` | commit message |
