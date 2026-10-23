# Quickstart: validate the monorepo foundation

Each scenario maps to a success criterion of [spec.md](./spec.md). Run them in order after
implementation.

## Prerequisites

- Node.js version from `.node-version` (24 LTS), Corepack enabled (`corepack enable`)
- `gh` authenticated with admin rights on a throwaway GitHub account/repository
- `jq`, `shellcheck`

## 1. Fresh clone is green (SC-001)

```bash
git clone <repo> /tmp/tmt && cd /tmp/tmt
time (pnpm install --frozen-lockfile && pnpm check)
```

Expected: exit 0, no warning lines from Biome, `tsc`, Vitest or knip; total < 5 min.
Also: `grep -E '"[~^]' package.json packages/*/package.json` prints nothing (exact pins).

## 2. Hooks enforce Conventional Commits (SC-002, local half)

```bash
git commit --allow-empty -m "update stuff"        # rejected by commitlint
git commit --allow-empty -m "chore: verify hooks"  # accepted
git commit --allow-empty -m "feat(web)!: scoped breaking change"  # accepted
```

Stage a badly formatted `.ts` file and commit: Biome formats it and re-stages it.

## 3. Setup script (SC-003)

```bash
gh repo create <you>/tmt-sandbox --public --template azurioh/tanstack-monorepo-template --clone
cd tmt-sandbox && shellcheck scripts/setup-repo.sh
scripts/setup-repo.sh --dry-run
scripts/setup-repo.sh
scripts/setup-repo.sh            # second run: only ok/skip, exit 0
gh api repos/{owner}/{repo}/rulesets --jq 'length'                         # 3
gh api repos/{owner}/{repo} --jq '{allow_squash_merge,allow_merge_commit,allow_rebase_merge,delete_branch_on_merge}'
gh api repos/{owner}/{repo}/branches --jq '.[].name'                       # demo, main, staging
git push origin HEAD:main         # rejected by ruleset
```

## 4. CI and PR title (SC-002, remote half)

Open a PR to `staging` titled `Update stuff` → `pr-title` fails, merge blocked. Rename to
`chore: update stuff` → green, squash merge only. Promotion PR `staging` → `demo` titled
`chore: promote staging to demo` offers merge commit only; after merging, `git log demo` contains
the original feature commits and `staging` is not behind `demo` in content
(`git diff origin/staging origin/demo` is empty).

## 5. Release automation (SC-004)

Promote `staging` → `demo` → `main` via PRs. After the `main` merge, `gh pr list --label
"autorelease: pending"` shows one release PR.

## 6. Dependabot (SC-005)

Settings → Insights → Dependency graph → Dependabot → "Check for updates". Every opened PR has
base `staging`: `gh pr list --author app/dependabot --json baseRefName --jq '.[].baseRefName'`.

## 7. Community profile and metadata (SC-006)

```bash
gh api repos/{owner}/{repo}/community/profile --jq '.files | map_values(. != null)'
gh api repos/{owner}/{repo} --jq '{description, topics}'
```

Expected: every file `true` (code_of_conduct, contributing, issue_template, pull_request_template,
license, readme); description set; >= 5 topics.

## 8. ADRs (SC-007)

```bash
ls docs/adr/0*.md | wc -l                                   # 9
for f in docs/adr/0*.md; do for h in '^\*\*Status\*\*' '^\*\*Date\*\*' '^\*\*Applies to\*\*' '^## Context' '^## Decision' '^## Consequences'; do grep -q "$h" "$f" || echo "$f missing $h"; done; done
```

Expected: 9 files, no "missing" line, every file listed in `docs/adr/README.md`.

## 9. Time to protected project (SC-008)

Time scenario 3 from `gh repo create` to the first green CI run on a PR: < 15 min.

Delete the sandbox afterwards: `gh repo delete <you>/tmt-sandbox`.
