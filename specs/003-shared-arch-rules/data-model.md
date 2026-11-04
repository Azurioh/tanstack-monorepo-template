# Data Model: Shared Architecture Rules Package

The package has no database and no runtime data. Its entities are files and their rules.

## Rules package (`@azurioh/arch-rules`)

| Field | Source | Rule |
|---|---|---|
| version | `packages/arch-rules/package.json` | Set by release-please. Semver: a change that can flag previously accepted code is major (FR-012). |
| preset | `preset.jsonc`, exported as `./biome` | Not named `biome.jsonc` (R1). Globs are relative to the consumer root and match `apps/*` (FR-003). |
| plugins | `plugins/*.grit` + `biome-manifest.jsonc` | One manifest entry per rule file. Registered in the preset as `@azurioh/arch-rules/<rule>` (R2). |
| agent rules | `rules/*.md` | Template-specific rules only (R9). |
| CLI | `dist/cli.js` (`bin: arch-rules`) | Commands `sync`, `check`, `layout` (contracts/cli.md). |
| fixtures | `tests/` | Not published (absent from `files`). |

## Rule id

`ARCH-LAYER`, `ARCH-FEATURE`, `ARCH-CLIENT-SERVER`, `ARCH-VENDOR`, `ARCH-REEXPORT`,
`ARCH-RELATIVE`, `ARCH-LAYOUT`.

- Every diagnostic message starts with `<id>: `, which keeps the ids stable (FR-002).
- Each id needs at least one violating and one compliant fixture, enforced by the completeness
  check (FR-005).
- **Lifecycle**:
  - Adding an id is a minor release when existing code cannot trip it, and major otherwise.
  - Renaming or removing an id is major.

## Owned agent-rule file

| Field | Rule |
|---|---|
| name | File name under `rules/` in the package, written to `.claude/rules/arch-rules/<name>`. |
| header | Line 1 = `<!-- managed by @azurioh/arch-rules@<version>: edit upstream, run arch-rules sync -->` |
| state | `in-sync`, `differs` (bytes differ), `missing` (shipped, absent locally), `stale` (header present, no longer shipped). |

**State changes**:
- `sync` makes every shipped file `in-sync` and deletes `stale` files.
- A hand edit makes a file `differs`.
- A package upgrade without `sync` makes changed files `differs`, new ones `missing` and removed
  ones `stale`.
- A file in that folder without the header is project-owned: it has no state and is never
  touched (FR-008).

## Consumer project

| Field | Rule |
|---|---|
| root dependency | `@azurioh/arch-rules`, exact version from npm (R5). |
| `biome.jsonc` | `extends` the preset, plus project settings (`files`, formatter) and project additions: Grit plugins, or overrides on paths the preset does not cover (R3). |
| `check` script | Runs `arch-rules check` and `arch-rules layout` (R8, R9). |
| parity test | One violating case per id (R8, SC-005). |
| Dependabot | The npm entry runs daily with the `arch-rules` group (R7). |
