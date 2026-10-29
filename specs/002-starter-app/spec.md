# Feature Specification: Starter App

**Feature Branch**: `002-starter-app`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "Starter app `apps/web`: a TanStack Start demo app that is the
reference implementation of the template's architecture and development rules (ported and
generalized from a private project). Spec 2 of 3. One demo feature crossing every layer, shared
infrastructure, styling, tests at every level, automated architecture enforcement, generalized
agent rules integrated with the claude-conventions plugin. Authentication, real database,
i18n, dark mode, monitoring, multiple apps, deployment and the generator are out of scope."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run a working demo app from a fresh clone (Priority: P1)

The maintainer creates a project from the template, installs dependencies and starts the app in
development mode. A page opens in the browser with a form; the maintainer types a name, submits it
and sees a greeting computed on the server. The same app builds for production and passes every
quality check without any edit.

**Why this priority**: an app that runs is the minimum that makes the template a starting point
for a real project instead of a tooling skeleton.

**Independent Test**: on a fresh clone, install, start the dev server, submit a name in the browser
and read the greeting; then run the full check suite, the production build and the end-to-end
suite.

**Acceptance Scenarios**:

1. **Given** a fresh clone, **When** the maintainer starts the app and submits the name "Ada",
   **Then** the page shows a greeting containing "Ada" returned by the server.
2. **Given** the form, **When** the maintainer submits an empty or whitespace-only name, **Then**
   the page shows a validation message and no server call is made.
3. **Given** a name longer than the allowed maximum, **When** it reaches the server (bypassing the
   form), **Then** the server rejects it with a typed business error and the page shows a readable
   message.
4. **Given** a fresh clone, **When** the maintainer runs the full check suite, the production build
   and the end-to-end suite, **Then** all pass with zero errors and zero warnings.
5. **Given** the app is missing a required environment variable or has an invalid value, **When**
   it starts, **Then** it stops immediately with a message naming the variable.

---

### User Story 2 - Copy the demo feature as the model for a new feature (Priority: P1)

The maintainer (or an AI agent) adds a first business feature by copying the demo feature folder,
renaming it and replacing its logic. The layout, entry points, test locations and wiring are
already right, so the new feature passes every check without editing any tool or rule
configuration.

**Why this priority**: the demo exists to be copied; if copying it requires fixing configuration,
the reference implementation fails its purpose.

**Independent Test**: copy the demo feature under a new name, rename its identifiers, register it
in the composition root and router, and run the full check suite.

**Acceptance Scenarios**:

1. **Given** the demo feature, **When** it is copied and renamed into a second feature and
   registered, **Then** the full check suite passes without changes to any lint, type-check,
   unused-code or architecture configuration.
2. **Given** the demo feature, **When** a reader opens it, **Then** each layer (domain,
   application, infrastructure, transport, client) is in its own folder and each layer has at
   least one test in the documented test location.

---

### User Story 3 - Architecture rules are enforced, not only documented (Priority: P1)

A contributor or agent writes code that breaks a layering rule: the domain imports the
infrastructure, one feature imports another, client code imports server code at runtime, a vendor
SDK is used outside the infrastructure layer, or a module re-exports another without adding
anything. The check suite fails locally and in CI and names the file and the broken rule.

**Why this priority**: rules that are only written down drift silently; enforcement is what the
private source project lacked and what this template adds.

**Independent Test**: for each rule, add the matching violating fixture or edit and run the check
suite; each one must fail with a message naming the rule.

**Acceptance Scenarios**:

1. **Given** a domain file that imports from the infrastructure layer, **When** the checks run,
   **Then** they fail and name the layer-direction rule.
2. **Given** a feature that imports another feature's internals, **When** the checks run, **Then**
   they fail and point to the shared area as the place for common code.
3. **Given** client code that imports a server module as a value, **When** the checks run, **Then**
   they fail; a type-only import of the same module passes.
4. **Given** a vendor SDK import outside the infrastructure layer, **When** the checks run,
   **Then** they fail.
5. **Given** a module that only re-exports another module, **When** the checks run, **Then** they
   fail, except for the documented feature entry points.
6. **Given** the rule test suite, **When** it runs, **Then** every listed rule has a violating
   fixture that is proven to fail and a compliant fixture that is proven to pass.

---

### User Story 4 - AI agents work in a generated project with the same rules (Priority: P2)

The maintainer opens a generated project with Claude Code or Codex. The agent reads the project
rules (architecture, clean architecture, errors, UI, workflow, knowledge capture) from the
repository, the conventions plugin hooks guard dependency pinning, pull-request size and rule-file
sync, and the agent-facing summary file is generated from the rules and kept in sync by CI.

**Why this priority**: the maintainer works with agents on every project; rules that agents do not
load are not applied. It depends on stories 1–3 being in place to describe real code.

**Independent Test**: open the repository with an agent, ask where a new use case goes and check
the answer matches the rules; edit a rule file without regenerating the summary and check CI
fails.

**Acceptance Scenarios**:

1. **Given** the repository, **When** the conventions plugin loads, **Then** it finds its
   configuration and reports no missing-configuration warning.
2. **Given** a rule file changed without regenerating the agent summary, **When** CI runs,
   **Then** the sync check fails.
3. **Given** the rule files, **When** they are searched for private-project names or domain terms,
   **Then** none are found.

---

### User Story 5 - The app is part of the release and quality pipeline (Priority: P2)

The app has its own version and changelog entry, its tasks (dev, build, typecheck, test,
end-to-end) are orchestrated and cached with the rest of the workspace, and the end-to-end suite
runs in CI on every pull request.

**Why this priority**: without pipeline integration the app would be the one part of the template
that can break unnoticed.

**Independent Test**: open a pull request touching the app and check the end-to-end job runs and
gates the merge; merge a `feat` commit scoped to the app and check the release pull request lists
it under the app.

**Acceptance Scenarios**:

1. **Given** a pull request that breaks the demo page, **When** CI runs, **Then** the end-to-end
   check fails and blocks the merge.
2. **Given** a released change to the app, **When** release automation runs, **Then** the app's
   version and changelog are updated separately from the root.

---

### Edge Cases

- Name with leading or trailing whitespace: trimmed before validation; the greeting uses the
  trimmed value.
- Name containing markup or script characters: rendered as text, never interpreted.
- Server unreachable or returning an unexpected error: the page shows a generic error message and
  the form stays usable; the error is logged server-side without leaking internals to the client.
- Repeated rapid submissions: only the latest result is displayed.
- The demo feature is deleted entirely by a project that does not need it: the remaining app still
  passes every check once its registration lines are removed.
- A new feature folder that does not follow the layout: the architecture checks still apply to it
  (rules target every feature, not the demo by name).

## Requirements *(mandatory)*

### Functional Requirements

**App and demo feature**

- **FR-001**: The template MUST contain exactly one app under `apps/web`, a full-stack web app
  that serves a page and a typed server API.
- **FR-002**: The app MUST contain one demo feature, "greeting", that turns a submitted name into
  a greeting computed on the server.
- **FR-003**: The demo feature MUST be split into the layers domain, application, infrastructure,
  transport and client, each in its own folder, following the dependency direction domain ←
  application ← infrastructure ← transport, with client code depending on server code by type
  only.
- **FR-004**: The domain layer MUST contain an entity or value object with its validation rules
  and a typed business error, and MUST NOT depend on any framework, I/O or vendor library.
- **FR-005**: The application layer MUST contain one use case and the port (abstraction) it
  depends on; the infrastructure layer MUST contain an in-memory implementation of that port.
- **FR-006**: The transport layer MUST expose the use case through a single typed RPC router
  mounted at one endpoint, consumed by a typed client usable from both server and browser
  rendering.
- **FR-007**: The client layer MUST read data through the route loader and a cached query, submit
  through a mutation, validate the form with a shared schema before any server call, and keep
  user-facing strings in one copy file per feature.
- **FR-008**: Each feature MUST expose a public entry point for client code, one for server code
  and one for test helpers; code outside the feature MUST import only through these.
- **FR-009**: The app MUST have a shared area holding the composition root (the single place
  where ports are bound to implementations), the environment configuration, the RPC router, the
  query client, and code reused by several features.
- **FR-010**: Environment variables MUST be validated once at startup against a schema; startup
  MUST fail with a message naming any missing or invalid variable; an example environment file
  MUST list every variable.
- **FR-011**: Imports inside the app MUST use a root path alias; parent-relative imports MUST be
  rejected.
- **FR-012**: Business errors MUST be mapped to typed RPC errors at the transport boundary and
  rendered as readable messages; unexpected errors MUST be logged server-side and shown as a
  generic message.

**Styling**

- **FR-013**: The app MUST use utility-first styling with shared design tokens and accessible UI
  components provided by a shared workspace UI package consumed by the app.
- **FR-014**: The demo page MUST be responsive (phone and desktop), with tap targets of at least
  44px and no hover-only affordances.

**Tests**

- **FR-015**: Each layer of the demo feature MUST have unit tests in a documented location
  mirroring the source layout.
- **FR-016**: The port MUST have a contract test suite, run against the in-memory
  implementation, that any future implementation can reuse.
- **FR-017**: An end-to-end test MUST cover the happy path and the validation error of the demo
  page against a production build of the app.

**Architecture enforcement**

- **FR-018**: The check suite MUST fail on: a layer importing an outer layer; a feature importing
  another feature; client code importing server code as a value; a vendor SDK imported outside the
  infrastructure layer; a module that only re-exports another outside the feature entry points;
  a parent-relative import inside the app.
- **FR-019**: Every rule in FR-018 MUST have a violating fixture proven to fail and a compliant
  fixture proven to pass, run as part of the test suite.
- **FR-020**: The rules MUST target every feature by path pattern, not the demo feature by name.
- **FR-021**: The unused-code check MUST cover the app and the UI package.

**Agent rules and conventions**

- **FR-022**: The repository MUST contain generalized rule files for architecture, clean
  architecture, errors, UI, workflow and knowledge capture, free of private-project names and
  domain terms.
- **FR-023**: The repository MUST be configured for the claude-conventions plugin: its
  configuration file, the generated agent summary file, and its hooks (exact dependency pins,
  pull-request size, rule-file sync).
- **FR-024**: CI MUST fail when the generated agent summary is out of sync with the rule files.
- **FR-025**: An ADR MUST record the app's layer layout and enforcement approach, and an ADR MUST
  record the transport choice (typed RPC router instead of framework server functions).

**Pipeline**

- **FR-026**: The app's dev, build, typecheck, test and end-to-end tasks MUST run through the
  workspace task runner with caching; CI MUST run the build and the end-to-end suite on every
  pull request as required checks.
- **FR-027**: The app MUST have its own release entry with separate version and changelog.
- **FR-028**: Every new dependency MUST be the latest stable version, verified on the registry,
  pinned exactly, and compatible with the pinned runtime and TypeScript version.
- **FR-029**: The README MUST document how to run the app, the feature layout, how to add a
  feature by copying the demo, and how to remove the demo.

### Key Entities

- **Greeting request**: a name submitted by the user; trimmed, non-empty, bounded length.
- **Greeting**: the server's answer built from a valid name; the message shown on the page.
- **Greeting error**: a typed business error raised when the name breaks a domain rule.
- **Feature**: a folder grouping the layers of one business capability, with three public entry
  points.
- **Architecture rule**: a named constraint on imports, with a violating and a compliant fixture.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a fresh clone, install plus the full check suite, production build and end-to-end
  suite complete green with zero warnings in under 8 minutes on a developer laptop.
- **SC-002**: From starting the dev server, the maintainer sees a greeting for a submitted name in
  under 1 minute, with no configuration step other than copying the example environment file.
- **SC-003**: 100% of the architecture rules listed in FR-018 have a violating fixture that fails
  and a compliant fixture that passes.
- **SC-004**: A second feature created by copying and renaming the demo feature passes the full
  check suite with zero changes to rule or tool configuration.
- **SC-005**: Editing a rule file without regenerating the agent summary makes CI fail in 100% of
  cases.
- **SC-006**: A repository-wide search for the private source project's names and domain terms
  returns zero matches.
- **SC-007**: Removing the demo feature and its registration lines leaves an app that passes every
  check.

## Assumptions

- The private source project's rules are the reference; they are generalized, not copied, and
  their per-app deltas are not ported.
- The typed RPC library and the UI component approach follow the source project's target choices
  (typed RPC router, accessible headless components with utility-first styling); exact libraries
  and versions are decided in the plan and verified on the registry.
- The claude-conventions plugin is available to the maintainer; contributors without it still get
  the rule files and the CI sync check.
- The in-memory adapter is enough to demonstrate the port; a real database adapter is a project
  decision.
- Light theme only; English copy only.
- The foundation from spec 1 (workspace, quality gates, CI, rulesets, release automation) is in
  place; new required checks are added to the versioned rulesets.

## Out of Scope

- Authentication and authorization.
- A real database adapter and migrations.
- Internationalization; dark mode.
- Analytics and error-monitoring services.
- More than one app.
- Docker images, deployment and the project generator (spec 3).
