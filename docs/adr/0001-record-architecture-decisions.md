# 0001. Record architecture decisions

**Status**: Accepted
**Date**: 2026-10-23
**Applies to**: whole repository

## Context

This repository is a template: every project created from it inherits its structure, tooling and
rules. Choices made here are re-examined months later, often by someone who was not present when
they were made. Without a written rationale, the same questions ("why Biome and not ESLint?", "why
three long-lived branches?") get re-litigated in every new project, and reversing a decision
safely requires knowing what it was protecting against.

## Decision

We record every long-term decision as an Architecture Decision Record (ADR) in `docs/adr/`.

A decision is long-term when it introduces a new dependency category, a storage format, a protocol
between apps, an ownership boundary, or anything a future contributor would ask "why?" about.

Format:
- File name `NNNN-kebab-slug.md`: four digits, contiguous, never reused. The next number is the
  highest existing number plus one.
- Title line `# NNNN. Title`.
- Header lines `**Status**`, `**Date**` (ISO `YYYY-MM-DD` of the last status change) and
  `**Applies to**` (repository areas, or `whole repository`).
- Sections `## Context`, `## Decision` and `## Consequences`, in that order. An optional
  `## Alternatives considered` section may follow `## Decision`.
- [`template.md`](./template.md) is the copy-me skeleton.

Statuses:

| Status               | Meaning                                   |
| -------------------- | ----------------------------------------- |
| `Proposed`           | Under discussion in an open pull request  |
| `Accepted`           | In force                                  |
| `Superseded by NNNN` | Replaced by a later ADR; kept for history |
| `Deprecated`         | No longer applies and has no replacement  |

Allowed transitions: `Proposed → Accepted`, `Accepted → Superseded by NNNN`,
`Accepted → Deprecated`.

Superseding: an accepted ADR is never rewritten to change its decision. A new ADR states the new
decision and references the old one; the old file stays in place, only its status line changes to
`Superseded by NNNN` and its date is updated. Typos and broken links may be fixed in place.

Index: [`README.md`](./README.md) lists every ADR with number, title, status and scope. The pull
request that adds an ADR or changes a status also updates the index, so the index and the files
always match.

An ADR ships in the same pull request as the change it justifies.

## Alternatives considered

- Decisions in pull request descriptions only: rejected, they are hard to find once merged and are
  not versioned with the code.
- A wiki: rejected, it is not copied into projects created from the template and drifts from the
  code.

## Consequences

- Reviewers can ask for an ADR when a pull request makes a long-term choice; the pull request
  template includes that check.
- History stays readable: a superseded decision remains next to the one that replaced it.
- Writing an ADR costs a few minutes per decision; small, reversible choices do not need one.
