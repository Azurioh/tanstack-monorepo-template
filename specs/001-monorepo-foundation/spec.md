# Feature Specification: Monorepo Foundation

**Feature Branch**: `001-monorepo-foundation`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "Monorepo foundation for an open-source TanStack Start template repo
(azurioh/tanstack-monorepo-template, MIT). Spec 1 of 3. Workspace tooling, quality gates, commit
and release automation, branch flow with versioned repository rules, open-source hygiene files and
a founding set of Architecture Decision Records. Starter app, generator, anti-drift CI and
deployment implementation are out of scope."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start a project from a working, verified baseline (Priority: P1)

The maintainer creates a new repository from the template, clones it and installs dependencies.
Without editing anything, every quality check (lint, format, type checking, tests, unused-code
detection) runs across the whole workspace and passes. The same checks run automatically on every
pull request.

**Why this priority**: this is the reason the template exists. Without a green baseline, every
project restarts the manual setup that caused the drift between previous projects.

**Independent Test**: create a repository from the template, clone it on a clean machine, install
and run the full check suite; then open a pull request and watch the same checks run remotely.

**Acceptance Scenarios**:

1. **Given** a fresh clone of the template, **When** the maintainer installs dependencies and runs
   the full check suite, **Then** every check passes with zero errors and zero warnings.
2. **Given** a fresh clone, **When** the maintainer inspects the workspace, **Then** the package
   manager version, runtime version and every dependency version are pinned to exact values.
3. **Given** a pull request that introduces a lint error, **When** the CI runs, **Then** the
   pull request is reported as failing and cannot be merged.
4. **Given** a pull request that adds an unused dependency or export, **When** the CI runs,
   **Then** the unused-code check fails and names the offending item.

---

### User Story 2 - Commit history and releases stay consistent without manual effort (Priority: P1)

The maintainer commits and opens pull requests. Commit messages and pull request titles that do not
follow Conventional Commits are rejected. Feature pull requests are squash-merged into `staging`
so the title becomes the commit; promotion pull requests (`staging` → `demo` → `main`) use a merge
commit so every feature commit reaches `main` unchanged. Once changes reach the production branch, a release pull request with a version bump and a
changelog is opened automatically. Dependency updates arrive as pull requests on the integration
branch.

**Why this priority**: commit and release conventions diverged across previous projects; enforcing
them at the source is what keeps generated projects aligned.

**Independent Test**: try a non-conforming commit locally, open a pull request with a
non-conforming title, then merge a conforming change into the production branch and observe the
release pull request.

**Acceptance Scenarios**:

1. **Given** staged changes, **When** the maintainer commits with the message `update stuff`,
   **Then** the commit is rejected locally with a message explaining the expected format.
2. **Given** staged files with formatting issues, **When** the maintainer commits, **Then** the
   pre-commit check reports or fixes the issues on the staged files only.
3. **Given** a pull request titled `Update stuff`, **When** the CI runs, **Then** the title check
   fails; **When** the title is changed to `chore: update stuff`, **Then** it passes.
4. **Given** a conforming change merged into the production branch, **When** the release
   automation runs, **Then** a release pull request is opened with a version bump and changelog.
5. **Given** an outdated dependency, **When** the dependency update bot runs, **Then** it opens a
   pull request targeting the integration branch, never the production branch.

---

### User Story 3 - Apply repository rules in one command (Priority: P2)

GitHub does not copy branches, rulesets or settings from a template repository. After creating a
repository from the template, the maintainer runs one documented command that creates the
promotion branches, applies the versioned branch rulesets and sets repository settings, metadata
and template flag.

**Why this priority**: without it, branch protection and merge policy are configured by hand and
drift again; it is P2 because the baseline (P1) is usable before protection is applied.

**Independent Test**: create a blank repository from the template, run the setup command once and
query the repository through the GitHub API.

**Acceptance Scenarios**:

1. **Given** a newly created repository with only `main`, **When** the maintainer runs the setup
   command, **Then** `staging` and `demo` branches exist, one ruleset per protected branch is
   active, `staging` accepts only squash merges and `demo`/`main` only merge commits (both titled
   with the pull request title), rebase merge is disabled, branches are deleted on merge, GitHub
   Actions may create pull requests, private vulnerability reporting is enabled, and the
   description and topics are set.
2. **Given** a repository where the setup command already ran, **When** it runs again, **Then** it
   completes without error and without creating duplicate rulesets.
3. **Given** the maintainer is not authenticated with sufficient rights, **When** the setup
   command runs, **Then** it stops before any change and states which permission is missing.
4. **Given** a protected branch, **When** someone pushes directly or force-pushes to it, **Then**
   the push is rejected.

---

### User Story 4 - Understand and extend the foundation (Priority: P2)

A reader (the maintainer months later, or a visitor) opens the repository and finds a README
explaining what the template is and how to start, contribution and security policies, issue and
pull request templates, code owners, and a set of Architecture Decision Records explaining every
foundational choice.

**Why this priority**: the template is public and long-lived; decisions without written rationale
get re-litigated in each new project.

**Independent Test**: from the repository home page alone, a reader can find how to start a
project, how to contribute, how to report a vulnerability and why each foundational tool was
chosen.

**Acceptance Scenarios**:

1. **Given** the repository home page, **When** a reader looks for license, contributing guide,
   code of conduct and security policy, **Then** GitHub's community profile lists all of them as
   present.
2. **Given** a reader opens a new issue, **When** they choose a type, **Then** bug report and
   feature request forms are offered.
3. **Given** the ADR index, **When** a reader opens it, **Then** ADRs 0001 to 0009 are listed with
   number, title, status and scope, and each ADR has Status, Date, Applies to, Context, Decision
   and Consequences.
4. **Given** a maintainer wants to record a new decision, **When** they follow ADR 0001, **Then**
   they know the file name, numbering, header and how to supersede an existing ADR.

---

### Edge Cases

- A dependency has no stable release newer than a pre-release the ecosystem relies on: the latest
  stable version is used and the exception is recorded in the relevant ADR.
- The workspace contains no application yet: a minimal placeholder package ensures every pipeline
  task runs and passes instead of being skipped silently.
- A contributor commits with hooks bypassed: the CI enforces the same checks, so the pull request
  still fails.
- A commit message uses a scope (`feat(web): ...`) or a breaking-change marker (`feat!: ...`):
  both are accepted as valid Conventional Commits.
- The setup command runs against a repository that already has rulesets with the same name: they
  are updated in place, not duplicated.
- The setup command runs on a personal account where some settings are organization-only: the
  command reports the skipped setting and continues with the others.
- The maintainer wants a shorter branch flow: the change is made on explicit request and recorded
  as a new ADR superseding ADR 0006.

## Requirements *(mandatory)*

### Functional Requirements

**Workspace**

- **FR-001**: The repository MUST be a multi-package workspace with a directory for deployable
  applications and a directory for shared packages.
- **FR-002**: The repository MUST pin the package manager version and the runtime version.
- **FR-003**: Every dependency MUST be declared with an exact version, and the workspace MUST be
  configured so newly added dependencies are saved with exact versions.
- **FR-004**: Every dependency MUST be at its latest stable release at the time it is added,
  verified against the package registry.
- **FR-005**: The type-checking configuration MUST be shared from a single workspace package, in
  strict mode, and extended by every other package.
- **FR-006**: The workspace MUST contain a minimal placeholder package exercising every check
  (lint, type check, test, unused-code detection) so the pipeline is never empty.
- **FR-007**: Tasks MUST run through a task orchestrator that caches results and respects
  inter-package dependencies.

**Quality gates**

- **FR-008**: A single command MUST run lint, format check, type check, tests and unused-code
  detection across the workspace.
- **FR-009**: Lint and format checks MUST treat warnings as failures.
- **FR-010**: A pre-commit hook MUST run the lint/format check on staged files only.
- **FR-011**: A commit-message hook MUST reject messages that do not follow Conventional Commits
  1.0.0; scopes and breaking-change markers MUST be accepted.
- **FR-012**: Hooks MUST be installed automatically when dependencies are installed.
- **FR-013**: The CI MUST run the full check suite on every pull request and on every push to the
  promotion branches, and MUST block merging on failure.
- **FR-014**: The CI MUST validate that pull request titles follow Conventional Commits 1.0.0.
- **FR-015**: Third-party CI actions MUST be pinned to an immutable reference.

**Releases and dependency updates**

- **FR-016**: Release automation MUST open a release pull request on the production branch with a
  computed version bump and changelog derived from commit history.
- **FR-017**: Automated dependency update pull requests MUST target the integration branch
  (`staging`) and preserve exact version pinning. Related updates (e.g. one framework family)
  MUST be grouped into a single pull request, and enabling updates MUST require no manual
  installation step.

**Branch flow and repository rules**

- **FR-018**: The promotion flow MUST be `staging` → `demo` → `main`.
- **FR-019**: Branch rulesets for `staging`, `demo` and `main` MUST be stored as versioned files in
  the repository, requiring a pull request and passing CI checks and forbidding force-push and
  deletion. `staging` MUST allow only squash merges and require linear history; `demo` and `main`
  MUST allow only merge commits, so promoted commits keep their identity and the long-lived
  branches never diverge.
- **FR-020**: A setup command MUST create missing promotion branches, create or update the
  rulesets, enable squash merge and merge commits (both titled with the pull request title) and
  disable rebase merge, delete branches on merge, allow GitHub Actions to create pull requests
  (required by release automation), enable private vulnerability reporting, and set description,
  topics and the template flag.
- **FR-021**: The setup command MUST be idempotent and MUST verify authentication and permissions
  before making any change.
- **FR-022**: The README MUST document the setup command as the first step after creating a
  repository from the template.

**Open-source hygiene**

- **FR-023**: The repository MUST include README, LICENSE (MIT), CONTRIBUTING, CODE_OF_CONDUCT,
  SECURITY, a pull request template, bug report and feature request issue forms, CODEOWNERS and an
  editor configuration file.
- **FR-024**: The README MUST cover: what the template is, what it includes, quick start, available
  scripts, repository structure, branch flow, links to ADRs and contribution guide, and license.
- **FR-025**: CONTRIBUTING MUST describe setup, scripts, commit convention, branch flow and the pull
  request process.
- **FR-026**: SECURITY MUST describe a private vulnerability reporting channel, and that channel
  MUST be enabled on the repository by the setup command.
- **FR-027**: All documentation MUST be written in English.

**Architecture Decision Records**

- **FR-028**: ADRs MUST live in `docs/adr/`, be named `NNNN-slug.md`, carry Status, Date and
  Applies to headers and Context, Decision and Consequences sections.
- **FR-029**: An ADR index MUST list every ADR with number, title, status and scope.
- **FR-030**: The initial ADR set MUST be: 0001 ADR process, 0002 monorepo layout and tooling,
  0003 clean architecture, 0004 quality gates, 0005 dependency versioning and releases, 0006 branch
  flow and repository rules, 0007 UI layer, 0008 deployment, 0009 opt-in per-pull-request
  previews.
- **FR-031**: ADRs MUST be written fresh for the template and MUST NOT contain content specific to
  the owner's private projects.
- **FR-032**: ADRs 0008 and 0009 MUST be marked as decided but not yet implemented, referencing
  the later spec that implements them.

**Personal tooling**

- **FR-033**: Spec-driven development tooling and agent configuration shipped with the template
  MUST be confined to dedicated directories and documented as removable.

### Key Entities

- **Workspace package**: a unit inside the monorepo (application or shared package) with its own
  manifest and tasks.
- **Ruleset definition**: a versioned file describing protection rules for one branch, applied to
  GitHub by the setup command.
- **ADR**: a numbered decision record with status (Proposed, Accepted, Superseded, Deprecated),
  date, scope and rationale.
- **Release pull request**: an automatically maintained pull request carrying the next version and
  changelog.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a fresh clone, installing dependencies and running the full check suite completes
  successfully, with zero errors and zero warnings, in under 5 minutes.
- **SC-002**: 100% of non-conforming commit messages tried locally are rejected, and a pull request
  with a non-conforming title cannot be merged.
- **SC-003**: Running the setup command once on a blank repository produces `staging` and `demo`
  branches, 3 active rulesets (squash-only on `staging`, merge-commit-only on `demo` and `main`) and
  rebase merge disabled, all verifiable through the GitHub API;
  a second run makes no change and reports no error.
- **SC-004**: The first conforming merge into `main` results in an open release pull request.
- **SC-005**: 100% of automated dependency update pull requests target `staging`.
- **SC-006**: GitHub's community profile for the repository reports every recommended file as
  present, and the repository has a description and at least 5 topics.
- **SC-007**: 9 ADRs (0001–0009) exist, each with all mandatory headers and sections, and all are
  listed in the ADR index.
- **SC-008**: Starting a new project from the template takes the maintainer under 15 minutes from
  "create repository" to a protected repository with a green CI run.

## Assumptions

- Primary user is the template owner; public adoption is welcome but not optimized for. Personal
  tooling stays but is isolated and removable.
- Decided tooling (recorded in ADRs, constraints for planning): pnpm workspaces, Turborepo, latest
  stable TypeScript, Biome, Vitest, knip, Lefthook, commitlint with the conventional preset,
  release-please, Dependabot (native, no app install, grouped updates), GitHub Actions, GitHub rulesets applied through the `gh` CLI.
- The maintainer has the `gh` CLI installed and authenticated with admin rights on the target
  repository when running the setup command.
- Repository visibility is public; rulesets are available on public repositories for personal
  accounts.
- `staging` is the integration branch targeted by feature pull requests; `main` is production.
- Release automation versions the repository as a whole while no application exists; per-app
  versioning is introduced with the starter app (spec 2).
- Out of scope: starter app `apps/web` (spec 2); project generator, anti-drift CI and container
  deployment implementation (spec 3); npm package publishing; translated documentation.
