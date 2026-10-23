<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0 (MINOR: principle V materially changed)
  - V: squash only for feature PRs into staging; promotions use merge commits
  - IV: "latest stable compatible with the pinned runtime"
  - VI + Development Workflow: merge policy and optional reviews clarified
- Previous: (unratified template) → 1.0.0
- Modified principles: placeholders replaced by I–VIII
  I. Clean Architecture · II. Feature-First Structure · III. Quality Gates ·
  IV. Reproducibility · V. Conventional Commits & Releases · VI. Branch Flow & Repository Rules ·
  VII. Architecture Decision Records · VIII. Open-Source Hygiene
- Added sections: Technology & Repository Constraints, Development Workflow
- Removed sections: none
- Templates requiring updates: none (plan/spec/tasks templates read the constitution at runtime)
- Deferred TODOs: none
-->

# tanstack-monorepo-template Constitution

## Core Principles

### I. Clean Architecture (NON-NEGOTIABLE)

Dependencies MUST point inward. Domain and application code MUST NOT import a framework, a
database client, UI code or a vendor SDK; it depends on ports, and adapters implement them at the
edges. Every adapter that talks to the outside world MUST be replaceable by an in-memory
implementation for tests.
Rationale: projects generated from this template must stay testable and framework-swappable as
they grow.

### II. Feature-First Structure

The repository MUST be split into `apps/` (deployable units) and `packages/` (shared, versioned
code). Inside an app, code MUST be grouped by feature; features MUST NOT import each other, and
code shared across features MUST live in a `shared/` area or a workspace package. Imports MUST use
TypeScript path aliases or workspace package names, never `../../` traversal.
Rationale: features stay deletable and ownership boundaries stay visible.

### III. Quality Gates

A change MUST pass, with zero errors and zero warnings: Biome (lint + format), TypeScript type
checking, Vitest tests and knip (unused code and dependencies). Lefthook MUST run Biome on staged
files at `pre-commit` and commitlint at `commit-msg`. CI MUST run the same gates and block merging
when any fails. Every `if`/`else` MUST be braced.
Rationale: the template is the baseline every future project inherits; a gate skipped here is
skipped everywhere.

### IV. Reproducibility

The monorepo MUST use pnpm workspaces and Turborepo. The `packageManager` field and the Node
version (`.node-version`) MUST be pinned. Dependencies MUST be pinned to exact versions
(`save-exact=true`), installed through the package manager, and set to the latest stable release
compatible with the pinned runtime, verified on the registry at the time they are added. Updates arrive through automated dependency
PRs, never through ranges.
Rationale: two installs of the same commit MUST produce the same result.

### V. Conventional Commits & Releases

Commits and PR titles MUST follow Conventional Commits 1.0.0 (scope optional). Feature pull
requests into the integration branch MUST be squash-merged, with the PR title becoming the commit
message. Promotion pull requests between long-lived branches MUST use a merge commit titled with
the PR title, so every promoted commit reaches `main` unchanged. release-please MUST drive
versions, tags and changelogs from `main`.
Rationale: history becomes machine-readable, so release notes need no manual step; squashing a
promotion would collapse the changelog and make long-lived branches diverge.

### VI. Branch Flow & Repository Rules

The default promotion flow is `staging` → `demo` → `main`; a generated project MAY reduce it only
on an explicit decision recorded as an ADR. Branch rulesets MUST be versioned in
`.github/rulesets/` and applied by `scripts/setup-repo.sh`, together with repository settings
(squash merge into `staging`, merge commit for promotions, branch deletion on merge).
Rationale: GitHub does not copy settings from a template repository, so they have to live as code.

### VII. Architecture Decision Records

Every long-term decision (new dependency category, storage format, protocol, ownership boundary)
MUST be recorded as an ADR in `docs/adr/` named `NNNN-slug.md`, with a Status / Date / Applies to
header and Context / Decision / Consequences sections, and listed in `docs/adr/README.md`.
Superseded ADRs are kept and marked, never deleted.
Rationale: future contributors can answer "why?" without archaeology.

### VIII. Open-Source Hygiene

The repository MUST ship a README, LICENSE (MIT), CONTRIBUTING, CODE_OF_CONDUCT, SECURITY,
issue and PR templates, CODEOWNERS, automated dependency updates and a CI workflow, and MUST set a
description and topics on GitHub. Documentation MUST be in English.
Rationale: the template is public; contributors and adopters need a clear entry point.

## Technology & Repository Constraints

- Application framework: TanStack Start (React) for every web app in `apps/`.
- Language: TypeScript at its latest stable version, strict mode, shared base configuration in a
  workspace package.
- Styling and UI: Tailwind CSS with shadcn/ui as the only component base.
- Tooling: pnpm, Turborepo, Biome, Vitest, knip, Lefthook, commitlint, release-please.
- No secrets in the repository; environment variables are documented in `.env.example` files.

## Development Workflow

- Pull requests target `staging` and are promoted to `demo`, then `main`.
- A PR is mergeable only when CI is green, its title is a valid Conventional Commit and the
  required reviews, when the repository configures any, are approved.
- Any change that alters a principle above, or an accepted ADR, MUST ship with a new or
  superseding ADR in the same PR.

## Governance

This constitution supersedes any other practice in the repository. Amendments are made by pull
request, MUST state their rationale and, when they change a technical decision, reference an ADR.
Versioning follows semantic versioning: MAJOR for removed or redefined principles, MINOR for added
principles or materially expanded guidance, PATCH for clarifications. Every PR review MUST check
compliance with the principles above; any deviation MUST be justified in the PR description.

**Version**: 1.1.0 | **Ratified**: 2026-10-23 | **Last Amended**: 2026-10-23
