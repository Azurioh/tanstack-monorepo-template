# 0006. Branch flow and repository rules

**Status**: Accepted
**Date**: 2026-10-23
**Applies to**: whole repository (`.github/rulesets/`, `scripts/setup-repo.sh`, GitHub repository settings)

## Context

Changes should be integrated continuously, shown in a realistic environment before release, and
released from a branch that only receives tested work. GitHub does not copy branch protection or
repository settings when a repository is created from a template, so whatever protects these
branches must live as code and be applied by a command.

## Decision

**Branch flow**

```text
feature/* --squash--> staging --merge commit--> demo --merge commit--> main
```

- `staging` is the integration branch and the target of every feature pull request, including
  Dependabot updates.
- `demo` receives promotions from `staging` for review in a demo environment.
- `main` receives promotions from `demo`; release-please runs there.
- A project may reduce the flow (for example drop `demo`) only through a superseding ADR.

**Merge methods**
- Feature pull requests into `staging` are **squash-merged**, with the pull request title as the
  commit title, keeping `staging` linear with one Conventional Commit per change.
- Promotion pull requests (`staging → demo`, `demo → main`) use a **merge commit** titled with the
  pull request title, which is also a Conventional Commit (for example
  `chore: promote staging to demo`).
- Promotions are never squashed. Squashing a promotion collapses every promoted change into one
  commit, so release-please sees a single entry instead of the individual features and fixes. It
  also gives the target branch a commit that does not exist on the source, so the long-lived
  branches diverge and the next promotion conflicts or re-applies changes. Rebase merges are
  rejected for the same reason: GitHub rewrites the commit SHAs.

**Rulesets as code**
- One ruleset per branch in `.github/rulesets/` (`staging.json`, `demo.json`, `main.json`), in the
  GitHub REST format, so they can also be imported through the GitHub UI.
- Every protected branch: no deletion, no force push, changes only through pull requests, required
  status checks `check` and `pr-title`, conversations resolved before merging, stale approvals
  dismissed on push.
- `staging` allows only squash merges and requires linear history; `demo` and `main` allow only
  merge commits.
- **No bypass actors.** Nobody, administrators included, can push directly or merge a red pull
  request.
- **Zero required approvals** by default, so a solo maintainer can merge their own green pull
  request. Teams raise `required_approving_review_count` in the ruleset files.
- `scripts/setup-repo.sh [--repo owner/name] [--template] [--dry-run]` applies everything once
  after a repository is created: it creates `staging` and `demo`, upserts the rulesets by name,
  sets merge settings (squash and merge commit on, rebase off, pull request title as commit title,
  branch deletion on merge), sets description and topics from `.github/repository.json`, allows
  GitHub Actions to create pull requests, and enables private vulnerability reporting. It is
  idempotent.

## Alternatives considered

- Single `main` branch with trunk-based development: rejected as the default, there is no
  pre-release environment; projects that want it supersede this ADR.
- Classic branch protection rules: rejected, rulesets are exportable as JSON and support
  restricting merge methods per branch.
- An administrator bypass: rejected, it lets a red pull request through and relies on a role
  identifier that differs between accounts.

## Consequences

- Every generated project is protected minutes after creation by running one script.
- `main` history shows merge commits for promotions; `staging` stays linear.
- Hotfixes follow the same path (`staging → demo → main`); there is no shortcut by design.
- Ruleset availability on public personal repositories is documented by GitHub and verified on a
  throwaway repository before the first release.
