# Research: Shared Architecture Rules Package

Phase 0 of the plan. Each section records a decision, the reason, and the alternatives that were
weighed. The Biome findings come from a throwaway spike against Biome 2.6.3, the version pinned
here, run on a pnpm workspace and on a packed tarball installed in a separate consumer.

## R1. Can a Biome preset be consumed from `node_modules`?

- **Decision**: yes. The package exports its preset as `"./biome": "./preset.jsonc"`. A
  consumer's root `biome.jsonc` declares `"extends": ["@azurioh/arch-rules/biome"]` and lists
  the package as a root dependency.
- **Evidence**: the `ARCH-LAYER` and `ARCH-FEATURE` diagnostics fired on consumer files, both
  through the workspace link and through a real tarball install. `biome ci --error-on-warnings`
  passed on a clean file without any schema or version warning.
- **Constraints found**:
  - **The preset file must not be named `biome.jsonc`.** Inside a workspace, Biome treats that
    file as a second root config and fails with "Found a nested root configuration".
  - **The `extends` entry is a package specifier, not a path.** Biome treats any entry that
    starts with `.` or ends in `.json`/`.jsonc` as a relative path.
  - **The package must be resolvable from the directory of the root config.** Without that, the
    run fails with "Could not resolve … module not found".
- **Alternatives**:
  - Copying the config with a sync script was rejected: it is the drift this feature removes.
  - Generating `biome.jsonc` at install time was rejected: the lint config would become a
    generated file nobody can read.

## R2. How are the GritQL plugins shipped?

- **Decision**: the package ships `biome-manifest.jsonc`, a Biome 2.6 plugin manifest that names
  each `.grit` rule. The preset then registers each plugin by package specifier, for example
  `{ "path": "@azurioh/arch-rules/feature-boundaries", "includes": [...] }`.
- **Evidence**:
  - Relative plugin paths in an extended preset resolve against the consumer root, so they fail.
  - A `./node_modules/...` path is rejected.
  - A bare package name fails with "must select a named rule".
  - The `<pkg>/<rule>` form works, and the diagnostic keeps its id: "ARCH-FEATURE: a feature
    never imports another feature…".
- **Risk**: Biome's reference documents a plugin `path` that points at a directory holding a
  manifest. The `<pkg>/<rule>` specifier itself was found by testing; I could not find it
  documented. Two consequences:
  - The package declares `@biomejs/biome` as a peer dependency.
  - The fixture suite runs against the real package resolution, so a Biome upgrade that breaks
    the specifier fails the package's tests before any release.
- **Alternatives**: none worked. Every variant of a relative path failed.

## R3. Can a consumer add its own rules? (FR-004)

- **Findings**:
  - **A `plugins` list concatenates.** A consumer plugin runs alongside the preset plugins.
  - **An override with a different glob adds to the preset.**
  - **An override on the same glob that sets `noRestrictedImports` replaces the preset's
    restriction for those files.** `ARCH-LAYER` disappeared in the spike. The repo comment had
    already observed this.
- **Decision**: a consumer adds project-specific rules in two ways only:
  - a GritQL plugin in its own `plugins` list (any files);
  - a `noRestrictedImports` override on paths the preset does not cover.

  The adoption docs state this. Like a silenced rule, an override that redefines the preset's
  restriction on a covered glob shows up as a missing id in the package's fixtures. In the
  consumer it is caught by the parity check of R8.
- **Alternatives**:
  - Rewriting every preset restriction as a Grit rule would make same-glob overrides safe. It was
    rejected for now: it doubles the porting work for one edge case, and it can come later as a
    non-breaking change.
  - Asking consumers to copy the whole restriction list into their override was rejected: that
    is drift again.

## R4. Package name and location

- **Decision**: `@azurioh/arch-rules`, in `packages/arch-rules`, public (`"private": false`) and
  MIT. The npm registry returns 404 for that name, so it is free.
- **Open point for the maintainer**: the `@azurioh` scope must belong to the maintainer's npm
  account or organisation. It could not be checked without authentication. If it is not theirs,
  the only change is the name; the plan does not depend on it.
- **Alternatives**:
  - An unscoped `tanstack-arch-rules` is also free, but a scope reads as ownership and prevents
    squatting.
  - `@repo/*` is a workspace-only convention and cannot be published.

## R5. How does the template consume its own package?

- **Decision**: the template depends on the **published** version, pinned exactly, not on
  `workspace:*`. The reasons:
  - The template then behaves like every other consumer, so Dependabot update pull requests
    happen in the template too (US4, SC-001).
  - A rule change cannot reach the template's lint before it is released, which is the
    guarantee consumers rely on.
- **Consequences**:
  - **Bootstrap order.** The package lands and is published first, while the template keeps its
    local copies. A second pull request then switches the template to the published version and
    deletes the copies.
  - **Workspace resolution.** pnpm must resolve the root dependency from the registry even
    though a workspace package has the same name. The default `link-workspace-packages: false`
    allows this; the switch pull request verifies it with `pnpm why`.
  - **Projects created from the template.** They delete `packages/arch-rules` and its
    release-please entry (adoption docs; the generator automates it in a later spec). The root
    dependency they keep is already the npm one.
- **Alternatives**: `workspace:*` was rejected. It gives the template no update pull request, and
  it lets the template use unreleased rules.

## R6. Releasing and publishing

- **Decision**:
  - release-please gets a third component, `packages/arch-rules`, with
    `"component": "arch-rules"`, release-type `node`, and the path excluded from the root
    component.
  - A `publish-arch-rules` job in `.github/workflows/release-please.yml` runs only when
    `packages/arch-rules--release_created` is true. It first runs `npm view`; on a 404 (first
    version not published by hand yet) it skips with a notice instead of failing. Otherwise it
    runs the package's build and tests, `pnpm pack` in the package directory, then
    `npm publish <tgz> --provenance --access public`. It uses npm trusted publishing:
    `id-token: write`, no token.
  - npm must be at least 11.5.1. The runner's Node 24 bundles a newer npm, so the job asserts
    the version.
- **Bootstrap**: trusted publishing can only be set up for a package that already exists. Steps:
  1. The maintainer publishes the first version once by hand, from the release tag, with
     `pnpm pack` then `npm publish <tgz> --access public`.
  2. The maintainer registers `release-please.yml` as the package's trusted publisher on
     npmjs.com.
  3. Every later version is published by CI.

  This is documented as a one-time maintainer step.
- **Why `pnpm pack` + `npm publish <tgz>`**: npm documents trusted publishing for its own CLI
  only, but `npm publish` does not rewrite `workspace:` ranges, and the package has one
  (`@repo/tsconfig` `workspace:*`, a dev dependency). `pnpm pack` writes a tarball with the ranges
  resolved; `npm publish` then publishes that tarball with provenance.
- **Versioning**:
  - The first version is `1.0.0` (`release-as`), so semver is meaningful from day one, with no
    `bump-minor-pre-major`.
  - A change that can flag previously accepted code is a `feat(arch-rules)!` commit, so major.
  - A new rule that only covers new paths is still major if existing code can trip it.
  - A fix that only stops a false positive is `fix`.
  - The commit subject names the affected rule ids, so the changelog lists them (FR-012).
- **Alternatives**:
  - An `NPM_TOKEN` secret was rejected: it is a long-lived credential in a public repo.
  - changesets was rejected: release-please already drives every version here.

## R7. Delivering updates (US4)

- **Decision**:
  - The npm entry in `.github/dependabot.yml` moves from `weekly` to `daily` and gains an
    `arch-rules` group (pattern `@azurioh/arch-rules`), listed first.
  - The other groups are unchanged, so grouping keeps the number of pull requests low.
  - Daily is needed to meet the 24-hour target (SC-001). Dependabot refuses two `npm` entries on
    the same directory and target branch, so the cadence of this one entry is the only knob.
- **Risk carried over from spec 1 (T060)**: Dependabot has never been observed opening a pnpm 12
  lockfile pull request on this repo, and one source says pnpm 12's multi-document lockfile may
  not be parsed. The first package release is the live test. If no pull request appears within
  24 hours, the fallback is to dispatch a `repository_dispatch` from the publish job that opens
  the bump pull request. That fallback is not built unless the test fails.
- **Alternatives**:
  - Renovate was rejected: it adds a second update tool.
  - A dispatch from the publish job to every consumer was rejected: it needs a token with write
    access to the private repos.

## R8. The layout check and the fixtures (FR-005, FR-006, SC-004, SC-005)

- **Decision**:
  - **Fixtures.**
    - `rules.test.ts`, `rule-ids.ts` and the layout fixtures move to `packages/arch-rules/tests/`.
    - The fixture runner writes each fixture into a temporary consumer that **extends the
      package by specifier**. That proves the published resolution path, not a copy of the
      config.
    - The completeness check keeps its rule: one violating and one compliant fixture per id.
    - A missing fixture fails `pnpm check`, so it fails the required `check` job. The publish
      job also re-runs the tests, so the release is blocked (FR-005).
  - **`ARCH-LAYOUT`.**
    - Becomes `arch-rules layout`, a CLI command that checks every `apps/*/src/features/*`
      folder in the consumer. That also fixes the old test's hard-coded `apps/web`.
    - Consumers run it in their `check` script, as a root Turborepo task.
    - No new CI job is added, so the required checks and the rulesets do not change.
  - **Parity (SC-005).** A short consumer-side test stays in the template,
    `apps/web/tests/architecture/arch-ids.test.ts`. For each rule id it writes one violating
    file and asserts the id appears. It is not a copy of the fixtures: one case per id, no
    compliant cases, no completeness. It is what catches a consumer override that silently
    disables a preset rule (R3).
- **Alternatives**:
  - Exporting the layout check as a Vitest helper was rejected: the consumer would then copy a
    test file that wires it up.
  - Dropping the parity test was rejected: R3 shows a consumer can silently disable a rule.

## R9. Syncing the agent rules (US3, FR-007 to FR-009)

- **Decision**:
  - **What ships.** The package ships `rules/*.md`:
    - `clean-architecture.md`, `errors.md`, `ui.md`, which are fully template-owned today;
    - a new `arch-enforcement.md` holding the template-specific part of `architecture.md`, that
      is the App layout section and the `ARCH-*` list, which sit outside the conventions
      markers.
  - **What stays in the template.** `architecture.md` keeps the plugin's marker blocks, the
    project-owned Test layout table and the one accepted global, since those are project-owned.
  - **`sync`.** `arch-rules sync` writes the files to `.claude/rules/arch-rules/`, each with a
    first line `<!-- managed by @azurioh/arch-rules@<version>: edit upstream, run arch-rules sync -->`.
  - **Ownership.**
    - A file in that folder that carries the header but that the installed version no longer
      ships is stale: `sync` deletes it and `check` reports it.
    - A file without the header is project-owned and never touched.
    - No lock file is needed.
  - **`check`.** `arch-rules check` compares every owned file byte for byte with the installed
    version. It fails, naming each file and saying `differs`, `missing` or `stale`.
  - **Where it runs.** In the root `check` script, next to `layout`.
  - **AGENTS.md.** The generator lives in the conventions plugin, not in the package. `sync`
    runs it when the plugin's `agents-md.sh` is found at its standard install path, and
    otherwise prints the exact command. CI's existing `agents-md` job already fails on a stale
    `AGENTS.md`, so a skipped regeneration cannot merge.
- **Alternatives**:
  - Keeping the rules in the conventions plugin was rejected: they are template-specific, and
    the user chose the same package.
  - Symlinking into `node_modules` was rejected: `agents-md.sh` follows links, but Codex and the
    GitHub UI would show nothing, and a clean checkout has no `node_modules`.

## R10. Building the CLI

- **Decision**: the CLI is written in TypeScript and compiled with `tsc` to `dist/`. The
  package's `build` task is wired in Turborepo. `bin` is `{"arch-rules": "./dist/cli.js"}` and
  `files` = `dist`, `preset.jsonc`, `biome-manifest.jsonc`, `plugins`, `rules`, `README.md`,
  `LICENSE`.
- **Reasons**:
  - Node refuses to strip types under `node_modules`, so shipping raw `.ts` is not an option.
  - There are no runtime dependencies: `node:fs`, `node:path` and `node:util`'s `parseArgs` are
    enough.
- **Alternatives**: plain `.mjs` with JSDoc was rejected, because it would sit outside the repo's
  TypeScript strict gate.
