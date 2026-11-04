# Feature Specification: Shared Architecture Rules Package

**Feature Branch**: `003-shared-arch-rules`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "Shared architecture rules package (anti-drift distribution). Architecture
rules (lint overrides, pattern plugins, fixture tests, layout test) and the template-specific agent
rules are copied into a project when it is created from the template and never updated afterwards.
One versioned, publicly published package carries the lint preset and the matching agent rules;
fixture tests run in the package; consumers extend the preset; agent rules are synced and checked
in CI; new versions reach consumers as automated dependency-update PRs. Non-goals: migrating
existing private repos, upstreaming rules, shared CI / deploy, project generator."

## Context

A project created from this template receives a copy of the architecture rules (the `ARCH-*` lint
rules, their fixtures and the layout test) and of the agent rules that describe the same
architecture (clean architecture, errors, UI, the architecture part of the rules). From then on the
copy is frozen: when the template improves a rule, no project receives it, and nothing tells a
project that its copy differs. The generic agent rules already travel through the conventions
plugin; the architecture-specific ones and the lint rules do not.

This feature turns those rules into one versioned, published package that every project consumes,
starting with the template itself.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consume the architecture rules from one package (Priority: P1)

As the maintainer of a project created from the template, I get the architecture lint rules by
depending on one published package and pointing my lint configuration at it, instead of carrying
a copy of every rule, plugin and fixture in my repository.

**Why this priority**: Without a package there is nothing to version, update or check; every other
story builds on it. It also removes most of the copied rule material from each project.

**Independent Test**: In a project created from the template, replace the copied rules with the
package, run the full quality check, and confirm every `ARCH-*` rule still reports a violation on a
deliberately broken file with the same rule id as before.

**Acceptance Scenarios**:

1. **Given** the template with its current copied rules, **When** the rules are replaced by the
   package, **Then** the project's lint configuration only references the package plus the
   project's own additions, and the full quality check passes with zero warnings.
2. **Given** a project consuming the package, **When** a domain file imports infrastructure code,
   **Then** lint fails and names `ARCH-LAYER`, exactly as before the change.
3. **Given** a project consuming the package, **When** a second app is added under `apps/`,
   **Then** the rules apply to it without any configuration change (rules match by path pattern).
4. **Given** a project consuming the package, **When** it adds a project-specific restriction,
   **Then** the restriction applies alongside the package rules without editing the package.

---

### User Story 2 - Rules are proven once, in the package (Priority: P1)

As the maintainer of the rules, I prove every `ARCH-*` rule with violating and compliant fixtures
inside the package, and a release cannot happen while a rule lacks either fixture or a fixture
fails.

**Why this priority**: Consumers must be able to trust a new version without re-running the rule
proofs themselves; otherwise each project keeps its own copy of the fixtures and drifts again.

**Independent Test**: Remove the compliant fixture of one rule in the package and confirm the
package's checks fail; restore it and confirm they pass.

**Acceptance Scenarios**:

1. **Given** the package, **When** its checks run, **Then** each `ARCH-*` rule is exercised by at
   least one violating and one compliant fixture, and a missing fixture fails the run.
2. **Given** a consumer project, **When** its quality check runs, **Then** it does not re-run the
   package's rule fixtures.
3. **Given** a change to a rule in the package, **When** the change breaks an existing fixture,
   **Then** the package cannot be released until the fixture is fixed or updated.

---

### User Story 3 - Agent rules ship with the lint rules and cannot drift (Priority: P2)

As a maintainer working with coding agents, the agent rules that describe the architecture come
from the same package version as the lint rules, are written into my project's agent rules folder
by a sync command, and a CI check fails when my local copy differs from the installed version.

**Why this priority**: Agents follow written rules; if those rules describe an older architecture
than the lint enforces, agents produce code the lint rejects. Valuable, but only once the package
exists.

**Independent Test**: In a consumer, edit one synced agent-rule file by hand and confirm the CI
check fails; run the sync command and confirm it passes again.

**Acceptance Scenarios**:

1. **Given** a consumer that installs a package version, **When** the sync command runs, **Then**
   the package's agent rule files are written to the project's agent rules folder and the agents
   file generated from the rules is regenerated.
2. **Given** a consumer whose synced agent-rule file was edited by hand, **When** CI runs, **Then**
   a check fails and names the file that differs.
3. **Given** a consumer that upgrades the package, **When** it has not re-run the sync command,
   **Then** the same check fails until it does.
4. **Given** a consumer with its own project-specific agent rules, **When** the sync command runs,
   **Then** those project-specific rules are left untouched.

---

### User Story 4 - New rule versions reach projects automatically (Priority: P2)

As the maintainer, when I release a new version of the package, every consumer project receives
an automated dependency-update pull request, with no manual copy.

**Why this priority**: This closes the loop that is broken today; it depends on stories 1 and 3.

**Independent Test**: Publish a new package version and observe an automated update pull request
opened in the template within the configured window.

**Acceptance Scenarios**:

1. **Given** a new package version is published, **When** the dependency-update automation runs,
   **Then** the consumer receives a pull request that bumps the package.
2. **Given** that pull request, **When** its CI runs and the synced agent rules are out of date,
   **Then** the agent-rules check fails, telling the maintainer to run the sync command on the
   branch before merging.
3. **Given** a breaking rule change, **When** it is released, **Then** the version number signals
   it as breaking and the release notes list the rules that changed.

---

### Edge Cases

- A consumer pins an old package version: it keeps working with that version; only the update
  pull request proposes the new one.
- A new rule version flags existing code in a consumer: the update pull request's CI goes red and
  the consumer fixes the code (or defers the update); the package never weakens a rule silently.
- A consumer's layout lacks a path the rules expect (no `client/` folder yet): rules that target
  absent paths simply do not apply; they do not error.
- A project deletes a synced agent-rule file: the check reports it as missing.
- A consumer has no coding-agent setup: the lint rules still work; the agent-rule sync is optional
  and its check only runs where the synced files exist.
- The package registry is unreachable during install: install fails as for any dependency; no
  partial rule set is used.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The architecture lint rules (import restrictions per layer, pattern plugins, vendor
  list) MUST be published as one versioned, publicly available package.
- **FR-002**: The package MUST keep every rule id (`ARCH-LAYER`, `ARCH-FEATURE`,
  `ARCH-CLIENT-SERVER`, `ARCH-VENDOR`, `ARCH-REEXPORT`, `ARCH-RELATIVE`, `ARCH-LAYOUT`) and print
  it in each diagnostic.
- **FR-003**: Rules MUST match files by path pattern, never by feature or app name, so they apply
  to any app under `apps/` and any feature under `src/features/`.
- **FR-004**: A consumer's lint configuration MUST be able to extend the package and add its own
  rules without modifying the package.
- **FR-005**: The package MUST contain violating and compliant fixtures for every rule and a
  completeness check; its release MUST be blocked when a fixture fails or is missing.
- **FR-006**: The feature-layout check (`ARCH-LAYOUT`) MUST be usable by a consumer against its
  own `src/features/*` folders, from the package, without copying its implementation.
- **FR-007**: The package MUST ship the template-specific agent rules (clean architecture, errors,
  UI, and the architecture-rules part) in the same version as the lint rules.
- **FR-008**: The package MUST provide a sync command that writes its agent rules into the
  consumer's agent rules folder, regenerates the agents file or prints the exact command that
  does, and never touches files the package does not own; the CI `agents-md` check catches a
  stale agents file.
- **FR-009**: The package MUST provide a check that fails when a synced file is missing or differs
  from the installed version, naming each offending file; consumers run it in CI.
- **FR-010**: The template MUST consume the package as its first consumer: the copied rules,
  plugins and rule fixtures are removed from the template and replaced by the package.
- **FR-011**: The template MUST configure automated dependency updates so a new package version
  opens a pull request on the integration branch.
- **FR-012**: Package versions MUST follow semantic versioning: a change that can flag previously
  accepted code is breaking; release notes list changed rules.
- **FR-013**: The package MUST be released through the repository's existing release automation,
  with its own version and changelog.
- **FR-014**: The package MUST contain no private-project names, consistent with the template's
  open-source hygiene.
- **FR-015**: Documentation MUST explain how a project adopts the package, syncs agent rules,
  adds project-specific rules, and handles an update pull request that turns red.

### Key Entities

- **Rules package**: the published unit; has a version, a changelog, the lint preset, the pattern
  plugins, the layout check, the agent rules, and the sync and check commands.
- **Lint preset**: the set of import restrictions and plugin registrations a consumer extends.
- **Agent rule file**: a rules document owned by the package and copied into a consumer; identified
  by its file name; either in sync with the installed version or not.
- **Consumer project**: a repository created from the template that depends on the package; owns
  its own additional lint rules and agent rules.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new package release appears in a consumer as an automated update pull request
  within 24 hours, with zero manual copy steps.
- **SC-002**: Hand-editing any synced agent-rule file in a consumer turns a CI check red on the
  next pull request, 100% of the time, naming the file.
- **SC-003**: The template's own lint configuration shrinks to a reference to the package plus
  project-specific additions; the full quality check stays green with zero warnings.
- **SC-004**: Rule fixtures run once, in the package; no consumer repository contains a copy of
  them.
- **SC-005**: For every `ARCH-*` rule, a deliberate violation in the template is reported with the
  same rule id before and after the switch to the package.
- **SC-006**: A maintainer adopts the package in a fresh project created from the template, by
  following the documentation, in under 15 minutes.

## Assumptions

- Consumers are monorepos created from this template with apps under `apps/` and the feature-first
  layout; projects with another layout are out of scope.
- The package is published to the public npm registry under a scope the maintainer controls;
  the exact name is decided in the plan.
- The package lives in this repository as a workspace package and is released by the existing
  release automation as an additional component.
- The generic agent rules keep coming from the conventions plugin; only the template-specific
  ones move into the package.
- Dependency-update automation already configured in the template (Dependabot) is extended to the
  package; a different tool is a plan-level decision.

## Out of Scope

- Migrating the existing private repositories to the package or to the `server/`/`client/` layout.
- Upstreaming a rule from a project to the template (stays a manual pull request).
- Shared CI as reusable workflows, container images, registry publishing, Dokploy deployment and
  preview environments (next spec).
- A project generator (later spec).
