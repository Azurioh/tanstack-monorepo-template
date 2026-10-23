# Contract: Branch rulesets

Files: `.github/rulesets/staging.json`, `demo.json`, `main.json`. Body is sent as-is to the GitHub
REST rulesets API, so it also imports through Settings → Rules → Rulesets → Import.

Two variants:

| Branch | Role | `allowed_merge_methods` | `required_linear_history` |
|---|---|---|---|
| `staging` | integration, receives feature PRs | `["squash"]` | yes |
| `demo`, `main` | promotion targets | `["merge"]` | no (merge commits) |

Example (`main`, promotion variant; `staging` adds `{ "type": "required_linear_history" }` and uses
`["squash"]`):

```json
{
  "name": "protect-main",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["merge"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [{ "context": "check" }, { "context": "pr-title" }]
      }
    }
  ]
}
```

## Invariants

- Required status check contexts MUST equal the job names in `.github/workflows/ci.yml`
  (`check`, `pr-title`). Renaming a job requires updating all three rulesets in the same PR.
- `required_approving_review_count` is `0` for a solo maintainer; a team project raises it and
  sets `require_code_owner_review: true` (documented in ADR 0006).
- No `bypass_actors`: nobody, admin included, pushes directly or merges a red pull request.
- Promotion PR titles are Conventional Commits too (e.g. `chore: promote staging to demo`); the
  repository merge-commit title setting uses the PR title, so `main` history stays parseable.
- Never squash a promotion: it would collapse the changelog and make `staging`/`demo` diverge
  from `main` (ADR 0006).
