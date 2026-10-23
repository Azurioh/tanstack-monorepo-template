# 0005. Dependency versioning and releases

**Status**: Accepted
**Date**: 2026-10-23
**Applies to**: whole repository (`package.json` files, `.npmrc`, `.github/dependabot.yml`, release-please configuration)

## Context

Two installs of the same commit must produce the same result, dependencies must not silently go
stale, and release notes should not require a manual step. These three concerns interact: exact
pins need an automated update channel, and automated releases need a machine-readable history.

## Decision

**Versions**
- Every dependency is pinned to an exact version (`save-exact=true` in `.npmrc`; workspace
  packages use `workspace:*`). No `^` or `~` ranges.
- A dependency is added through the package manager (`pnpm add -E`) at the latest stable release
  compatible with the pinned runtime, verified on the registry at the time it is added.
- The lockfile is committed and CI installs with `--frozen-lockfile`.

**Updates**
- Dependabot (`.github/dependabot.yml`) checks weekly for two ecosystems: `npm` (directory `/`,
  which covers the pnpm workspace) and `github-actions`.
- Every update pull request targets `staging`, never `main`.
- `versioning-strategy: increase` rewrites the exact specifier to the new exact version.
- Updates are grouped to limit noise: `tanstack` (`@tanstack/*`), `tooling` (Biome, Turborepo,
  knip, Lefthook, commitlint, TypeScript, Vitest), `types` (`@types/*`) and one group for all
  GitHub Actions.
- GitHub Actions are pinned to a full commit SHA with the tag in a trailing comment; Dependabot
  keeps the SHAs current.

**Commits and releases**
- Commits and pull request titles follow Conventional Commits 1.0.0, enforced by commitlint
  locally and by the `pr-title` check in CI.
- Feature pull requests are squash-merged into `staging`, so the pull request title becomes the
  single commit on the branch. Promotions use merge commits (see ADR 0006).
- release-please runs on pushes to `main` in manifest mode (`release-please-config.json` and
  `.release-please-manifest.json`). It opens a release pull request that bumps versions and writes
  `CHANGELOG.md` from the Conventional Commits; merging it tags the release. Manifest mode lets
  each app added later get its own entry without changing the workflow.

## Alternatives considered

- Version ranges with a lockfile: rejected, the manifest no longer says which version runs.
- Renovate: rejected for now, it requires installing a GitHub App on each repository, whereas
  Dependabot is native and needs no setup step.
- Changesets: rejected, it adds a manual step to every contribution and is designed for publishing
  npm packages, which this repository does not do.

## Consequences

- Upgrades are visible, reviewable pull requests that run the full CI suite on `staging`.
- Changelogs and version numbers require no manual work, provided commit titles stay Conventional.
- **Open risk**: Dependabot support for pnpm 12 lockfiles is not confirmed by its documentation.
  It is verified on the first live scheduled run. If Dependabot cannot parse or update the
  lockfile, the fallback is Renovate, which supports pnpm workspaces, configured with the same
  groups and target branch; that switch will be recorded in a superseding ADR.
