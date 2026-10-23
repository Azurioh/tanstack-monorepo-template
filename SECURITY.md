# Security Policy

## Supported versions

Only the latest commit on the `main` branch is supported. Fixes are not backported to earlier
releases; projects created from this template should pull fixes from `main`.

| Version        | Supported |
| -------------- | --------- |
| Latest `main`  | Yes       |
| Anything older | No        |

## Reporting a vulnerability

**Do not open a public issue, discussion or pull request for a security problem.**

Report it privately through GitHub's private vulnerability reporting:
1. Open the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Describe the issue: affected files or configuration, steps to reproduce, impact, and a
   suggested fix if you have one.

Only maintainers can see the report. Private vulnerability reporting is enabled on every
repository configured with `scripts/setup-repo.sh`.

## What to expect

- **Acknowledgement** within 5 business days.
- **Initial assessment** (confirmed, needs more information, or not a vulnerability) within
  10 business days.
- **Fix and disclosure**: confirmed issues are fixed on `staging` and promoted to `main` as soon
  as possible. A GitHub security advisory is published once the fix is released, crediting the
  reporter unless they prefer to stay anonymous.

Please keep the report confidential until the advisory is published.

## Scope

This repository is a template: its own tooling configuration, GitHub workflows, rulesets and
scripts are in scope. Vulnerabilities in third-party dependencies should be reported upstream;
Dependabot delivers their fixes here.
