# 0008. Deployment

**Status**: Accepted
**Date**: 2026-10-23
**Applies to**: `apps/*`, `.github/workflows/`

Not yet implemented — see spec 3.

## Context

Applications created from the template need a repeatable way to reach a server. The branch flow
(ADR 0006) already defines three long-lived branches, each representing a stage of confidence.
Building images on the server or by hand makes deployments unreproducible and hard to roll back.

## Decision

- **CI builds the image.** A workflow builds one container image per app on GitHub Actions from the
  exact commit that was merged.
- **GitHub Container Registry (GHCR)** stores the images, tagged with the commit SHA and the
  branch, next to the source code and under the same permissions.
- **Dokploy** pulls and runs the images on the target server. The server never builds code.
- **One environment per promotion branch**: a merge into `staging`, `demo` or `main` deploys the
  matching environment. Promoting a change is therefore the same operation as merging a promotion
  pull request.

## Alternatives considered

- Building on the server (Dokploy building from the Git repository): rejected, builds compete with
  running workloads and are not guaranteed to match what CI tested.
- A managed platform (serverless or edge hosting): rejected as the default, it ties the template to
  a vendor; a project may supersede this ADR.

## Consequences

- The artifact deployed to `main` is byte-for-byte the image tested and built by CI.
- Rolling back means redeploying a previous image tag.
- Each app needs a Dockerfile and each environment needs a Dokploy application with registry
  credentials; spec 3 provides both.
