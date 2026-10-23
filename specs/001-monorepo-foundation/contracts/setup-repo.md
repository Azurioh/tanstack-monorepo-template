# Contract: `scripts/setup-repo.sh`

One-shot, idempotent command run by the maintainer after creating a repository from the template.

## Usage

```text
scripts/setup-repo.sh [--repo <owner/name>] [--template] [--dry-run]
```

| Option | Default | Effect |
|---|---|---|
| `--repo` | repository of the current directory (`gh repo view`) | target repository |
| `--template` | off | also sets `is_template=true` (used on the template repository itself) |
| `--dry-run` | off | prints every API call it would make, changes nothing |

Description and topics are read from `.github/repository.json`
(`{ "description": "...", "topics": ["..."] }`) so each generated project edits data, not the script.

## Preconditions (checked before any change)

1. `gh` installed and `gh auth status` succeeds.
2. Target repository exists and the token has `permissions.admin == true`.
3. Branch `main` exists.
4. Every `.github/rulesets/*.json` parses as JSON (`jq`).

A failed precondition prints `error: <reason>` to stderr and exits `1` with no change made.

## Steps (in order)

| # | Step | API | Idempotency |
|---|---|---|---|
| 1 | Create `staging`, `demo` from `main` HEAD | `POST /repos/{o}/{r}/git/refs` | skipped when the ref exists |
| 2 | Upsert rulesets | `GET /rulesets` → `PUT /rulesets/{id}` or `POST /rulesets` | matched by `name` |
| 3 | Merge settings + description (+ template flag) | `PATCH /repos/{o}/{r}` | PATCH is idempotent |
| 4 | Topics | `PUT /repos/{o}/{r}/topics` | full replace |
| 5 | Actions may create PRs | `PUT /repos/{o}/{r}/actions/permissions/workflow` | PUT is idempotent |
| 6 | Private vulnerability reporting | `PUT /repos/{o}/{r}/private-vulnerability-reporting` | PUT is idempotent |

Step 3 payload: `allow_squash_merge=true`, `allow_merge_commit=true`, `allow_rebase_merge=false`,
`squash_merge_commit_title=PR_TITLE`, `squash_merge_commit_message=PR_BODY`,
`merge_commit_title=PR_TITLE`, `merge_commit_message=PR_BODY`, `delete_branch_on_merge=true`,
`description`, and `is_template=true` with `--template`. Which method each branch accepts is
enforced by the rulesets, not by repository settings.

Rulesets are applied after branches exist (step 1 before 2) so `demo`/`staging` are protected from
creation onward.

## Output

One line per step: `ok   <step>`, `skip <step> (<reason>)` or `fail <step>: <API message>`.
A step that fails because the feature is unavailable on the account plan prints `skip` and the
script continues; any other failure exits `1`. Final line: `done: <owner/name>`.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | all steps `ok` or `skip` |
| 1 | precondition failed or a step failed |
| 2 | invalid arguments |
