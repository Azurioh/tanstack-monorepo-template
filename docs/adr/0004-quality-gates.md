# 0004. Quality gates

**Status**: Accepted
**Date**: 2026-10-23
**Applies to**: whole repository (`biome.jsonc`, `knip.json`, `lefthook.yml`, `commitlint.config.ts`, `.github/workflows/ci.yml`)

## Context

Every project created from the template inherits its quality bar. A gate that is skipped here is
skipped everywhere. Gates must also run identically on a laptop and in CI, otherwise contributors
discover failures only after pushing.

## Decision

A change must pass, with zero errors and zero warnings:
- **Biome 2.6** for linting and formatting of TypeScript, JavaScript, JSON and Markdown, from a
  single root `biome.jsonc`. The recommended rule set applies plus
  `style.useBlockStatements: "error"` (every `if`/`else` is braced). `pnpm lint` runs
  `biome ci --error-on-warnings .`; `pnpm format` applies safe fixes.
- **TypeScript** type checking with `tsc --noEmit` in strict mode, at the root and in each
  package.
- **Vitest 5** for tests, run per package.
- **knip 6** for unused files, exports and dependencies across the workspace, with configuration
  hints treated as errors.
- **Lefthook** git hooks, installed by the root `prepare` script on every `pnpm install`:
  `pre-commit` runs Biome on staged files and re-stages fixes; `commit-msg` runs commitlint with
  the Conventional Commits preset.
- **CI parity**: the `check` job in `.github/workflows/ci.yml` runs `pnpm check`, the same command
  developers run locally. The `pr-title` job validates the pull request title. Both are required
  status checks on every protected branch (see ADR 0006).

## Alternatives considered

- ESLint with typescript-eslint and Prettier: rejected. Two tools to configure and keep in sync,
  and typescript-eslint's type-aware rules rely on the TypeScript JavaScript compiler API, which
  TypeScript 7.0 does not ship.
- Husky with lint-staged: rejected, two packages where Lefthook covers both, and Lefthook is a
  single binary with parallel commands.
- Warnings allowed in CI: rejected, warnings accumulate until nobody reads them.

## Consequences

- One formatter and linter configuration covers every file, including root configuration and
  documentation.
- Some ESLint plugins have no Biome equivalent; a missing rule is accepted until Biome provides it
  or a superseding ADR adds another tool.
- Hooks can be bypassed locally with `--no-verify`, but CI runs the same gates and blocks merging.
