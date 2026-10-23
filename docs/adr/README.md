# Architecture Decision Records

Each long-term decision of this template is recorded here. The process itself is described in
[ADR 0001](./0001-record-architecture-decisions.md).

## Index

| Number                                               | Title                              | Status                                 | Applies to                                 |
| ---------------------------------------------------- | ---------------------------------- | -------------------------------------- | ------------------------------------------ |
| [0001](./0001-record-architecture-decisions.md)      | Record architecture decisions      | Accepted                               | whole repository                           |
| [0002](./0002-monorepo-layout-and-tooling.md)        | Monorepo layout and tooling        | Accepted                               | whole repository                           |
| [0003](./0003-clean-architecture.md)                 | Clean architecture                 | Accepted                               | `apps/*`, `packages/*`                     |
| [0004](./0004-quality-gates.md)                      | Quality gates                      | Accepted                               | whole repository                           |
| [0005](./0005-dependency-versioning-and-releases.md) | Dependency versioning and releases | Accepted                               | whole repository                           |
| [0006](./0006-branch-flow-and-repository-rules.md)   | Branch flow and repository rules   | Accepted                               | whole repository                           |
| [0007](./0007-ui-layer.md)                           | UI layer                           | Accepted                               | `apps/*`, shared UI packages               |
| [0008](./0008-deployment.md)                         | Deployment                         | Accepted (not yet implemented, spec 3) | `apps/*`, `.github/workflows/`             |
| [0009](./0009-per-pr-previews.md)                    | Opt-in per-pull-request previews   | Accepted (not yet implemented, spec 3) | `apps/*`, `.github/workflows/`, deployment |

## By scope

- **Process**: [0001](./0001-record-architecture-decisions.md)
- **Workspace and tooling**: [0002](./0002-monorepo-layout-and-tooling.md),
  [0004](./0004-quality-gates.md), [0005](./0005-dependency-versioning-and-releases.md)
- **Code architecture**: [0003](./0003-clean-architecture.md), [0007](./0007-ui-layer.md)
- **Repository and workflow**: [0005](./0005-dependency-versioning-and-releases.md),
  [0006](./0006-branch-flow-and-repository-rules.md)
- **Delivery**: [0008](./0008-deployment.md), [0009](./0009-per-pr-previews.md)

## Adding an ADR

1. Copy [`template.md`](./template.md) to `NNNN-kebab-slug.md`, where `NNNN` is the highest
   existing number plus one.
2. Fill in the title, header lines and sections; set **Status** to `Proposed`.
3. Add a row to the index above and list the ADR under its scope.
4. Open the ADR in the same pull request as the change it justifies; set **Status** to `Accepted`
   before merging.
5. To replace a decision, write a new ADR and change the old one's status to
   `Superseded by NNNN`. Never delete an ADR.
