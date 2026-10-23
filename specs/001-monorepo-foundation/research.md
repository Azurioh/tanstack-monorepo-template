# Research: Monorepo Foundation

Versions verified on the npm registry and nodejs.org on 2026-10-23. Re-verify at implementation
time (constitution IV) and update the pins if a newer stable release exists.

### Runtime and package manager

- Decision: Node.js `24.22.1` (Active LTS "Krypton") in `.node-version` and `engines.node`;
  pnpm `12.15.0` in `packageManager`.
- Rationale: Active LTS is the production-safe line; Node 26 is "current", not LTS. pnpm 12 is the
  latest stable.
- Alternatives considered: Node 26.12.1 (not LTS yet); pnpm 11 (older major).
- Sources: https://nodejs.org/dist/index.json, `npm view pnpm version`.

### Tool versions

- Decision: turbo `2.11.10`, typescript `7.0.2`, @biomejs/biome `2.6.2`, vitest `5.0.5`,
  knip `6.42.1`, lefthook `2.2.2`, @commitlint/cli and @commitlint/config-conventional `21.2.4`,
  @types/node `24.19.2`.
- Rationale: latest stable of each. `@types/node` follows the runtime major (24) instead of
  `latest` (26.x), otherwise types advertise APIs the runtime lacks; vitest 5 accepts
  `@types/node` >= 24, commitlint 21 needs Node >= 22.12.
- Alternatives considered: `@types/node@26` (rejected: mismatched runtime).
- Sources: `npm view <pkg> version`.

### TypeScript 7 (native) compatibility

- Decision: use `typescript@7.0.2`; type checking via `tsc --noEmit` (native binary).
- Rationale: TS 7.0 ships no JavaScript compiler API until 7.1. Nothing in the decided stack
  imports it: Biome is self-contained, knip v6 parses with oxc and does not depend on
  `typescript`, Vitest transpiles with its own pipeline. Implementation MUST verify knip runs
  green on the placeholder package; fallback is an aliased side-by-side TS 6
  (`@typescript/typescript6`) recorded in ADR 0002.
- Alternatives considered: TS 6 only (rejected: constitution requires latest stable);
  `@typescript/native-preview` / `tsgo` (rejected: dev preview).
- Sources: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/,
  https://github.com/webpro-nl/knip/blob/main/packages/docs/src/content/docs/blog/knip-v6.mdx

### Turborepo

- Decision: `turbo.json` with `$schema: https://turborepo.dev/schema.json`; package tasks
  `typecheck`, `test`, `build` (`dependsOn: ["^build"]`); root tasks `//#lint`, `//#typecheck`
  (root config files) and `//#knip`. A root `check` script runs `turbo run lint typecheck test knip`.
- Rationale: knip analyses the whole workspace graph and Biome must also cover root config files,
  so both are root tasks; package tasks cache per package.
- Alternatives considered: per-package knip (rejected: misses cross-workspace unused exports).

### Biome

- Decision: one root `biome.jsonc`: `vcs { enabled, clientKind: "git", useIgnoreFile }`,
  `files.includes` with `!` negations for generated paths, recommended rules plus
  `linter.rules.style.useBlockStatements: "error"`. CI uses `biome ci --error-on-warnings`;
  pre-commit uses `biome check --write --staged --no-errors-on-unmatched --error-on-warnings`.
- Rationale: single tool for lint + format; braces rule enforces constitution III.
- Alternatives considered: ESLint + Prettier (rejected: two tools, typescript-eslint needs the
  TS JS API that TS 7.0 lacks).
- Sources: https://biomejs.dev/linter/rules/use-block-statements/

### Git hooks

- Decision: Lefthook, installed by a root `"prepare": "lefthook install"` script. `pre-commit`
  runs Biome on staged files with `stage_fixed: true`; `commit-msg` runs
  `pnpm exec commitlint --edit {1}`.
- Rationale: `prepare` runs on every `pnpm install` regardless of pnpm's build-script allowlist
  (pnpm 11+ blocks dependency postinstall scripts by default).
- Alternatives considered: lefthook postinstall + `allowBuilds` (rejected: depends on pnpm config
  semantics that changed between majors).
- Sources: https://github.com/evilmartians/lefthook/blob/master/docs/usage/commands/install.md

### commitlint

- Decision: `commitlint.config.ts` exporting `{ extends: ["@commitlint/config-conventional"] }`
  typed with `UserConfig` from `@commitlint/types`.
- Rationale: official preset = Conventional Commits 1.0.0 (scopes and `!` accepted).

### Release automation

- Decision: `googleapis/release-please-action@v5.0.0` (SHA-pinned) in manifest mode
  (`release-please-config.json` + `.release-please-manifest.json`), single root package,
  `release-type: node`, running on push to `main`; workflow permissions `contents: write`,
  `pull-requests: write`.
- Rationale: changelog derived from Conventional Commits; manifest mode lets spec 2 add one entry
  per app without changing the workflow.
- Alternatives considered: Changesets (rejected in intake: extra contributor step, designed for
  npm publishing).
- Sources: https://github.com/googleapis/release-please-action/releases/tag/v5.0.0

### CI

- Decision: `.github/workflows/ci.yml` (pull_request + push to `staging`, `demo`, `main`) with a
  composite action `.github/actions/setup` (pnpm/action-setup v6.1.0 reading `packageManager`,
  actions/setup-node v7.1.0 with `node-version-file: .node-version` and pnpm cache,
  `pnpm install --frozen-lockfile`); jobs `check` (lint, typecheck, test, knip) and
  `pr-title` (amannn/action-semantic-pull-request v6.1.1). actions/checkout v7.0.1. All actions
  pinned to full commit SHA with the tag in a trailing comment.
- Rationale: FR-013/014/015; Dependabot keeps SHAs current through the `github-actions` ecosystem.
- Note: `ci.yml` job names are the required status checks referenced by the rulesets.

### Dependency updates

- Decision: Dependabot, `.github/dependabot.yml`: ecosystems `npm` (directory `/`, covers the pnpm
  workspace) and `github-actions`; `target-branch: staging`; weekly; `versioning-strategy:
  increase` (rewrites the exact specifier to the new exact version); groups `tanstack`
  (`@tanstack/*`), `tooling` (biome, turbo, knip, lefthook, commitlint, typescript, vitest),
  `types` (`@types/*`), and one group for all GitHub Actions.
- Rationale: native, zero install step (decided in plan challenge).
- Open risk: Dependabot support for pnpm 12 lockfiles not confirmed from docs. Implementation
  verifies on the first scheduled run; mitigation recorded in ADR 0005.
- Alternatives considered: Renovate (rejected: GitHub App install per repository).

### GitHub repository API

- Decision: `scripts/setup-repo.sh` (bash, `gh api`, `set -euo pipefail`, shellcheck-clean):
  1. Preflight: `gh auth status`, repository resolved from `gh repo view`, `permissions.admin`
     must be true.
  2. Branches: create `staging` and `demo` from `main` HEAD when missing
     (`POST /repos/{o}/{r}/git/refs`).
  3. Rulesets: for each `.github/rulesets/*.json`, `GET /repos/{o}/{r}/rulesets`, match by `name`,
     `PUT /rulesets/{id}` if present else `POST`.
  4. Settings: `PATCH /repos/{o}/{r}` with `allow_squash_merge=true`, `allow_merge_commit=true`,
     `allow_rebase_merge=false`, `squash_merge_commit_title=PR_TITLE`,
     `squash_merge_commit_message=PR_BODY`, `merge_commit_title=PR_TITLE`,
     `merge_commit_message=PR_BODY`, `delete_branch_on_merge=true`, `is_template` (flag),
     `description`.
  5. Topics: `PUT /repos/{o}/{r}/topics`.
  6. Actions: `PUT /repos/{o}/{r}/actions/permissions/workflow` with
     `default_workflow_permissions=read`, `can_approve_pull_request_reviews=true`.
  7. `PUT /repos/{o}/{r}/private-vulnerability-reporting` (SECURITY.md channel).
- Merge policy (analysis finding I1): squash only for feature PRs into `staging`; merge commit for
  promotions `staging` → `demo` → `main`. Squashing promotions would collapse the release-please
  changelog into one commit and make long-lived branches diverge. Rebase merge rejected: GitHub
  rewrites SHAs, same divergence.
- Ruleset rules: `deletion`, `non_fast_forward`, `required_linear_history` (`staging` only),
  `pull_request` (`allowed_merge_methods: ["squash"]` on `staging`, `["merge"]` on `demo`/`main`,
  0 required approvals for a solo maintainer,
  dismiss stale reviews, require conversation resolution), `required_status_checks`
  (`check`, `pr-title`). `conditions.ref_name.include: ["refs/heads/<branch>"]`. No bypass actors: with 0 required
  approvals the owner can merge their own green PR, and nobody (admin included) can push directly
  or merge a red PR.
- Alternatives considered: admin bypass (rejected: lets a red PR through and relies on an
  unverified role id).
- Open risk: ruleset availability on public personal repositories is documented but not verified
  live; the quickstart validates it on a throwaway repository.
- Sources: https://docs.github.com/en/rest/repos/rules, https://docs.github.com/en/rest/repos/repos

### Open-source files

- Decision: community profile files (`README.md`, `LICENSE`, `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1, `SECURITY.md` — GitHub private vulnerability
  reporting), `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.yml`
  + `config.yml` (`blank_issues_enabled: false`), `.github/CODEOWNERS` (`* @Azurioh`),
  `.editorconfig`.
- Rationale: `GET /repos/{o}/{r}/community/profile` checks readme, license, contributing,
  code_of_conduct, issue_template, pull_request_template (SC-006).
