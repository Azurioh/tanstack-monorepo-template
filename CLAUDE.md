<!-- conventions:begin claude.intro -->
Claude Code conventions for this repository. The rules live in `.claude/rules/`
(`workflow.md`, `architecture.md`, `coding.md`, `knowledge.md` always apply;
`pitfalls.md` collects recurring traps; a `commands.md` per app holds its CI
sequence). Hooks, skills and agents come from the `conventions` plugin, not
from this repo. `AGENTS.md` (OpenAI Codex) is generated from these rules: edit
them, never `AGENTS.md`; `knowledge.md` and `pitfalls.md` serve both tools.
<!-- conventions:end claude.intro -->

## Stack

| App | Path       | Stack                                                                | Verify                          |
| --- | ---------- | -------------------------------------------------------------------- | ------------------------------- |
| web | `apps/web` | TanStack Start, oRPC, TanStack Query, Tailwind + shadcn (`@repo/ui`) | `.claude/rules/web/commands.md` |

<!-- conventions:begin claude.branches -->
## Branches

`main` is **production** (reached from `staging` through `demo` by merge-commit promotion PRs, ADR 0006; release-please runs there). `staging` is
the integration branch. **Every PR targets `staging`, never
`main`.** A PR against `main` is wrong whatever
it contains — retarget it before reviewing.

    git switch staging && git pull && git switch -c feat/my-change
    /conventions:pr
<!-- conventions:end claude.branches -->

<!-- conventions:begin claude.commands -->
## Commands

- Verification = the app's `commands.md` sequence, run through
  `/conventions:verify-app <app|all>` before claiming a task done.
- Dependencies: `pnpm add -E <pkg>` (exact pin, latest
  stable from the registry); never hand-edit a manifest or lockfile.
- `/conventions:pr` opens the PR (size cap 400 lines / 15
  files, stacked PRs beyond); `/conventions:test-gaps` lists untested changes;
  `/conventions:adr` records a long-term decision; `/conventions:release` prepares
  `staging → main`; `/conventions:deps-audit` fixes advisories.
<!-- conventions:end claude.commands -->
