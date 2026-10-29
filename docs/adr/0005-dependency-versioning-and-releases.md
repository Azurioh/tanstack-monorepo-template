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
- **Packages**: the root (`.`, tag `tanstack-monorepo-template-v<version>`, root `CHANGELOG.md`)
  and `apps/web` (component `web`, tag `web-v<version>`, `apps/web/CHANGELOG.md`, version in
  `apps/web/package.json`). The root has `exclude-paths: ["apps/web"]`: a commit whose files are
  all under `apps/web` is released only under `web`; a commit that also touches files outside it
  is listed in both changelogs (release-please skips a commit for a package only when every file
  belongs to an excluded path). Shared packages (`packages/*`) stay part of the root release.
- With more than one package, release-please opens one combined release pull request,
  `chore: release main`, that bumps each package with releasable commits.
- A new package starts at `0.0.0` in `.release-please-manifest.json` with
  `initial-version: "0.1.0"` and `bump-minor-pre-major: true` in its config entry (see below).
- After each release, `main` is back-merged into `staging` automatically (see ADR 0006).

**0.x versioning**
- The first release is `0.1.0`, not `1.0.0`. The manifest starts at `0.0.0`, which release-please
  treats as "never released", so it would otherwise use its default first version, `1.0.0`;
  `initial-version: "0.1.0"` in `release-please-config.json` sets it instead. It applies only while
  no release exists, so it needs no removal afterwards (unlike `release-as`, which pins every
  later release until removed).
- While the version is below `1.0.0`, `bump-minor-pre-major` turns a breaking change into a minor
  release instead of `1.0.0`; `feat` still produces a minor release and `fix` a patch release.
- Leaving `0.x` is a deliberate decision: a `Release-As: 1.0.0` footer on a commit, or `release-as`
  set for one release and removed afterwards.

**Release token**
- release-please authenticates with a GitHub App installation token created in the workflow by
  `actions/create-github-app-token` from the `RELEASE_APP_CLIENT_ID` variable and the
  `RELEASE_APP_PRIVATE_KEY` secret; the workflow's own `GITHUB_TOKEN` is read-only.
- Why: a pull request opened with `GITHUB_TOKEN` does not trigger workflows (GitHub's guard
  against recursive runs). The checks required by the `main` ruleset (`check`, `pr-title`, `e2e`,
  `agents-md`) never run on it, so the release pull request can never be merged. A pull request opened by an App
  triggers workflows normally.
- The token is scoped to Contents, Pull requests and Issues (labels), all read and write.

## Alternatives considered

- Version ranges with a lockfile: rejected, the manifest no longer says which version runs.
- Renovate: rejected for now, it requires installing a GitHub App on each repository, whereas
  Dependabot is native and needs no setup step.
- Changesets: rejected, it adds a manual step to every contribution and is designed for publishing
  npm packages, which this repository does not do.
- Release token as a fine-grained personal access token: rejected, it expires and is tied to one
  person's account, so releases stop when it lapses or that person leaves.
- Keeping `GITHUB_TOKEN` and closing then reopening the release pull request to trigger the
  checks: rejected, a manual step on every release that is easy to forget.

## Consequences

- Upgrades are visible, reviewable pull requests that run the full CI suite on `staging`.
- Changelogs and version numbers require no manual work, provided commit titles stay Conventional.
- A template-derived project signals pre-stable status with `0.x` until it chooses `1.0.0`.
- Each repository needs the release App installed and its credentials stored once
  (`scripts/setup-repo.sh` step 7); without them the release workflow fails.
- **Open risk**: Dependabot support for pnpm 12 lockfiles is not confirmed by its documentation.
  It is verified on the first live scheduled run. If Dependabot cannot parse or update the
  lockfile, the fallback is Renovate, which supports pnpm workspaces, configured with the same
  groups and target branch; that switch will be recorded in a superseding ADR.
