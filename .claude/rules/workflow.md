# Workflow

<!-- conventions:begin workflow.branches -->
## Branches

- `main` = production (reached from `staging` through `demo` by merge-commit promotion PRs, ADR 0006; release-please runs there). `staging` =
  integration branch. **Every PR targets `staging`.** Release =
  deliberate PR `staging → main` via `/conventions:release`.
- Branch off the integration branch:
  `git switch staging && git pull && git switch -c feat/<name>`.
  Branch names are `<type>/<kebab-case-slug>`, `<type>` from the commit types.
- Never commit directly on `main` or `staging`;
  never force-push (the plugin hooks refuse both).
<!-- conventions:end workflow.branches -->

- Release flow (ADR 0006): feature PRs are squash-merged into `staging`; promotions
  `staging → demo → main` are merge-commit PRs, never squashed or rebased; release-please opens
  the release PR on `main`, then a back-merge PR `main → staging` merges itself.
- Commit and PR titles are checked by commitlint (`pr-title` job); scopes are optional.
- Required checks on `staging`, `demo` and `main` = the CI job names `check`, `pr-title`, `e2e`,
  `agents-md` (`.github/rulesets/*.json`). A renamed or added job changes all three rulesets in
  the same PR, and the maintainer re-runs `scripts/setup-repo.sh` after the merge to apply them.
- The `agents-md` job checks out `Azurioh/claude-conventions` at the commit in
  `CONVENTIONS_SHA` (`.github/workflows/ci.yml`). Dependabot does not track it: bump it by hand
  to the plugin commit in use (`git -C ~/.claude/plugins/marketplaces/claude-conventions
  rev-parse HEAD`), regenerate `AGENTS.md` and commit both together.

<!-- conventions:begin workflow.commits -->
## Commits

- Format `<type>(scope): description` — types: feat, fix, refactor, docs,
  test, chore, perf, ci, release. English only.
- One logical change per commit. No `wip` / `fix typo` / `address review`
  commits in a PR — fold them first: `git commit --fixup` +
  `git rebase --autosquash`.
- **Never commit without the user's OK.**
- Never push or open a PR without the user's OK for that change, and never
  merge into `staging` or `main`: the human merges.
<!-- conventions:end workflow.commits -->

<!-- conventions:begin workflow.pr -->
## PR hygiene

- Open every PR with `/conventions:pr`, never a raw `gh pr create`. Title uses
  the same `<type>(scope): description` format. Body states what/why, the
  verification command that was run and `Closes #N` when an issue is linked.
  Titles, bodies and review comments are English.
- **Size cap: ≤ 400 changed lines (additions + deletions) and
  ≤ 15 files**, excluding lockfiles, generated migrations and
  vendored UI components (`prSize.exclude` in `.claude/conventions.json`). The
  `pr-size` hook blocks `gh pr create` beyond the cap unless
  `--label large-pr` is passed explicitly (mass renames / generated
  code only).
- Bigger change → **GitHub native stack** via `/conventions:pr --stack`: one
  branch + PR per logical group, branch names describe the content (never
  numbered), linked with `gh stack link --base staging <branches
  bottom→top>`. GitHub shows the order, diffs per layer and retargets bases
  automatically on merge.
<!-- conventions:end workflow.pr -->

<!-- conventions:begin workflow.deps -->
## Dependencies

- New dependencies are added exact-pinned at the latest stable version from the
  registry: `pnpm add -E <pkg>` (the `deps-exact` hook
  refuses the unpinned form). Existing caret ranges are not retrofitted. Never
  hand-edit a manifest or a lockfile.
- Security advisories on transitives → `/conventions:deps-audit` (direct
  dependency bump first, override/resolution pin for transitives).
<!-- conventions:end workflow.deps -->

<!-- conventions:begin workflow.worktrees -->
## Shared worktrees

- Never bare `git stash` / `git stash pop` (the stash stack is shared across
  worktrees). Use `git stash push -u -m <tag>`, then
  `git stash list --format='%H %gs'` to find it, then `git stash apply <sha>`.
<!-- conventions:end workflow.worktrees -->

<!-- conventions:begin workflow.verification -->
## Verification and discovery

- CI parity per app: the sequence in `.claude/rules/<app>/commands.md`
  (single-app repo: `.claude/rules/commands.md`), run in file order from the
  repo root. `/conventions:verify-app <app|all>` runs it — do this before
  claiming a task done.
- Cross-cutting rules: structure, boundaries and tests in `architecture.md`;
  change discipline, style and dependencies in `coding.md`; test gaps →
  `/conventions:test-gaps <app|all>`.
- Long-term choices → `/conventions:adr`; recurring traps → `pitfalls.md`
  (see `knowledge.md`).
<!-- conventions:end workflow.verification -->

- Layer mapping and wiring → `clean-architecture.md`; error taxonomy and logging →
  `errors.md`; UI components, forms and tap targets → `ui.md`.

<!-- conventions:begin workflow.agents-md -->
## AGENTS.md (Codex)

- `AGENTS.md` is generated from `CLAUDE.md` + `.claude/rules/**` (the plugin's
  `agents-md` hook reruns the generator on every rule edit). Never edit it by
  hand: change the rule, and the next generation carries it to Codex.
- `knowledge.md` and `pitfalls.md` are shared by Claude and Codex — a trap
  recorded by either one is read by both.
<!-- conventions:end workflow.agents-md -->
