# Contract: `arch-rules` CLI

The CLI runs from the consumer's repository root, or from the directory given with `--repo <dir>`.
It has no runtime dependencies. Its output is plain lines on stdout, and its errors go to stderr.
An unknown command, a missing command or an unknown flag is a usage error: a usage line on
stderr and exit code 2, distinct from the 1 used for a violation or an I/O error.

## `arch-rules sync`

Writes the installed version's agent rules into `.claude/rules/arch-rules/`.

1. For each `rules/<name>.md` in the package, it writes `.claude/rules/arch-rules/<name>.md`,
   with the managed header on line 1 and then the file's content.
2. It deletes each file in `.claude/rules/arch-rules/` whose line 1 is a managed header and whose
   name the installed version does not ship.
3. It never touches a file without the managed header (FR-008).
4. It regenerates `AGENTS.md`:
   - When `agents-md.sh` is found at
     `~/.claude/plugins/marketplaces/claude-conventions/plugins/conventions/scripts/agents-md.sh`,
     it runs that script with `--repo <dir>`.
   - Otherwise it prints `AGENTS.md not regenerated: run <command>` and still exits 0, because
     CI's `agents-md` job is the gate.
5. Output: one line per file, `written <name>` or `removed <name>`.
6. Exit code: 0, or 1 on an I/O error.

## `arch-rules check`

Read-only. It compares the local copies with the installed version.

- It prints one line per problem, `<state> .claude/rules/arch-rules/<name>.md`, where `<state>`
  is `differs`, `missing` or `stale`. Then it prints
  `run "pnpm exec arch-rules sync" and commit the result`.
- Exit code: 0 when everything is in sync, 1 when at least one problem is found.
- When `.claude/rules/arch-rules/` does not exist **and** the repo has no `.claude/` directory,
  it exits 0 with `no agent rules folder, skipped` (the edge case of a project without an agent
  setup).

## `arch-rules layout [--apps <glob>]`

Rule `ARCH-LAYOUT`. It checks every `apps/*/src/features/*` folder, or those matching `--apps`.

- **What a feature may contain**: exactly `server/{domain,application/ports,infrastructure,rpc}`,
  `client/{api,hooks,components,pages,copy.ts}`, `schemas.ts`, `index.ts`, `server.ts` and
  `testing.ts`. This is today's rule from `feature-layout.ts`.
- **Output**: one line per violation, `ARCH-LAYOUT: <path>: <reason>`.
- **Exit code**: 0 when the layout is clean, 1 when there is a violation.
- **Edge case**: an app without `src/features/` counts as clean.
