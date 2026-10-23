# Contributing

Thanks for your interest in improving this template. This guide covers setup, the scripts you will
use, the commit convention, the branch flow and the pull request process. By participating you
agree to follow the [code of conduct](./CODE_OF_CONDUCT.md).

## Prerequisites

- Node.js 24 LTS, the exact version in `.node-version` (other versions are rejected by
  `engine-strict`).
- pnpm through Corepack: run `corepack enable` once; the version comes from the `packageManager`
  field in `package.json`.
- Git.

## Setup

```bash
git clone https://github.com/azurioh/tanstack-monorepo-template.git
cd tanstack-monorepo-template
pnpm install      # also installs the Lefthook git hooks
pnpm check        # must pass before you change anything
```

## Scripts

| Script           | What it does                                                 |
| ---------------- | ------------------------------------------------------------ |
| `pnpm check`     | Full suite, same as CI: `turbo run lint typecheck test knip` |
| `pnpm lint`      | Biome lint and format check, warnings are errors             |
| `pnpm format`    | Biome safe fixes and formatting, written to disk             |
| `pnpm typecheck` | `tsc --noEmit` on root configuration files                   |
| `pnpm knip`      | Unused files, exports and dependencies                       |

A change is ready only when `pnpm check` passes with zero errors and zero warnings.

## Git hooks

Lefthook runs automatically:
- `pre-commit`: Biome checks and formats staged files, then re-stages the fixes.
- `commit-msg`: commitlint rejects messages that are not Conventional Commits.

Do not bypass them with `--no-verify`; CI runs the same checks and blocks the merge.

## Commit convention

Commit messages and pull request titles follow
[Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):
`<type>(<optional scope>)<optional !>: <description>`.

Common types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

```text
feat: add health check endpoint
fix(example): handle an empty input
docs: explain the promotion flow
ci: cache the pnpm store
feat(web)!: drop support for the legacy session cookie
chore: promote staging to demo
```

The type drives the release: `fix` produces a patch release, `feat` a minor release, and `!` or a
`BREAKING CHANGE:` footer a major release.

## Dependencies

- Add dependencies with the package manager, never by editing `package.json`:
  `pnpm add -E <pkg>` (or `pnpm --filter @repo/<name> add -E <pkg>` for a package).
- Use the latest stable version compatible with the pinned Node.js runtime. Versions are exact; no
  `^` or `~` ranges.
- Dependabot opens grouped update pull requests against `staging` every week.

## Branch flow

```text
feature branch --squash--> staging --merge commit--> demo --merge commit--> main
```

- Branch off `staging` and open your pull request **against `staging`**.
- Feature pull requests are **squash-merged**; the pull request title becomes the commit message,
  so it must be a valid Conventional Commit.
- Maintainers promote `staging` to `demo` and `demo` to `main` with merge commits. Promotions are
  never squashed: that would collapse the changelog into one entry and make the branches diverge.
- release-please opens a release pull request on `main`; merging it tags the release and updates
  `CHANGELOG.md`. Never edit `CHANGELOG.md` by hand.

The full rationale is in [ADR 0006](./docs/adr/0006-branch-flow-and-repository-rules.md).

## Pull request process

1. Open an issue first for anything larger than a small fix, so the approach can be agreed on.
2. Keep each pull request focused on one change.
3. Fill in the pull request template: what changed, why, and how it was verified.
4. Make sure the `check` and `pr-title` status checks are green and every review conversation is
   resolved; both are required to merge.
5. A maintainer squash-merges the pull request into `staging`.

## Architecture Decision Records

A pull request that makes a long-term decision (a new dependency category, a storage format, a
protocol between apps, an ownership boundary, or anything a future contributor would ask "why?"
about) must include an ADR in `docs/adr/`. Changing an accepted decision requires a new ADR that
supersedes the old one. See [ADR 0001](./docs/adr/0001-record-architecture-decisions.md) and copy
[`docs/adr/template.md`](./docs/adr/template.md).

## Reporting security issues

Never report a vulnerability in a public issue. Follow the [security policy](./SECURITY.md).
