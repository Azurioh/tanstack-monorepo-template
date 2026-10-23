#!/usr/bin/env bash
# Applies the versioned repository rules (.github/rulesets, .github/repository.json) to a GitHub
# repository: promotion branches, rulesets, merge settings, topics, Actions permissions and private
# vulnerability reporting. Idempotent; see specs/001-monorepo-foundation/contracts/setup-repo.md.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly ROOT_DIR
readonly RULESETS_DIR="${ROOT_DIR}/.github/rulesets"
readonly REPOSITORY_FILE="${ROOT_DIR}/.github/repository.json"
readonly PROMOTION_BRANCHES=(staging demo)

repo=""
template=false
dry_run=false
api_out=""
api_err=""
err_file=""
main_sha=""

usage() {
  cat <<'EOF'
Usage: scripts/setup-repo.sh [--repo <owner/name>] [--template] [--dry-run]

Applies branch rulesets and repository settings from .github/ to a GitHub repository.

Options:
  --repo <owner/name>  target repository (default: repository of the current directory)
  --template           also mark the repository as a template (is_template=true)
  --dry-run            print every API call that would change something, change nothing
  -h, --help           show this help

Exit codes: 0 success, 1 precondition or step failure, 2 invalid arguments.
EOF
}

die() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

bad_usage() {
  printf 'error: %s\n\n' "$1" >&2
  usage >&2
  exit 2
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --repo)
        if [[ $# -lt 2 || -z "$2" || "$2" == -* ]]; then
          bad_usage "--repo requires <owner/name>"
        fi
        if [[ ! "$2" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
          bad_usage "invalid repository '$2', expected <owner/name>"
        fi
        repo="$2"
        shift 2
        ;;
      --template)
        template=true
        shift
        ;;
      --dry-run)
        dry_run=true
        shift
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      *)
        bad_usage "unknown argument '$1'"
        ;;
    esac
  done
}

cleanup() {
  if [[ -n "$err_file" ]]; then
    rm -f "$err_file"
  fi
}

# Short, single-line description of a request body for dry-run output.
payload_summary() {
  jq -c 'if has("rules") then {name, enforcement, rules: [.rules[].type]} else . end' <<<"$1"
}

# Runs one GitHub API call. Sets api_out (response body) and api_err (gh error message).
# In dry-run mode, only GET requests are sent; any other method is printed instead.
api() {
  local method="$1" endpoint="$2" payload="${3-}"
  local args=(api --method "$method" -H "Accept: application/vnd.github+json" "$endpoint")
  api_out=""
  api_err=""
  if [[ "$dry_run" == true && "$method" != GET ]]; then
    if [[ -n "$payload" ]]; then
      printf 'dry-run: %s %s %s\n' "$method" "$endpoint" "$(payload_summary "$payload")"
    else
      printf 'dry-run: %s %s\n' "$method" "$endpoint"
    fi
    return 0
  fi
  if [[ -n "$payload" ]]; then
    args+=(--input -)
  else
    payload=""
  fi
  if api_out="$(gh "${args[@]}" <<<"$payload" 2>"$err_file")"; then
    return 0
  fi
  api_err="$(tr '\n' ' ' <"$err_file")"
  api_err="${api_err% }"
  return 1
}

# True when the last API error means the feature is not available on the account plan.
is_plan_unavailable() {
  grep -Eqi 'upgrade to github|not available|feature is not|plan does not' <<<"$api_err"
}

# Handles a failed step: plan-unavailable features are skipped, anything else stops the script.
step_failed() {
  local step="$1"
  if is_plan_unavailable; then
    printf 'skip %s (not available on this plan)\n' "$step"
    return 0
  fi
  printf 'fail %s: %s\n' "$step" "$api_err"
  exit 1
}

step_ok() {
  printf 'ok   %s\n' "$1"
}

check_preconditions() {
  local file
  if ! command -v gh >/dev/null 2>&1; then
    die "gh is not installed (https://cli.github.com)"
  fi
  if ! command -v jq >/dev/null 2>&1; then
    die "jq is not installed (https://jqlang.org)"
  fi
  if ! gh auth status >/dev/null 2>&1; then
    die "gh is not authenticated, run 'gh auth login'"
  fi
  if ! compgen -G "${RULESETS_DIR}/*.json" >/dev/null; then
    die "no ruleset found in ${RULESETS_DIR}"
  fi
  for file in "${RULESETS_DIR}"/*.json; do
    if ! jq -e '.name | strings' "$file" >/dev/null 2>&1; then
      die "${file} is not valid JSON or has no name"
    fi
  done
  if ! jq -e '(.description | strings) and (.topics | arrays)' "$REPOSITORY_FILE" >/dev/null 2>&1; then
    die "${REPOSITORY_FILE} must be JSON with a description string and a topics array"
  fi
  if [[ -z "$repo" ]]; then
    if ! repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null)"; then
      die "cannot resolve the repository of the current directory, pass --repo <owner/name>"
    fi
  fi
  if ! api GET "repos/${repo}"; then
    die "repository ${repo} not found or not accessible: ${api_err}"
  fi
  if [[ "$(jq -r '.permissions.admin // false' <<<"$api_out")" != true ]]; then
    die "admin permission on ${repo} is required"
  fi
  if ! api GET "repos/${repo}/git/ref/heads/main"; then
    die "branch main does not exist on ${repo}"
  fi
  main_sha="$(jq -r '.object.sha' <<<"$api_out")"
}

# Step 1: create the promotion branches from main HEAD when missing.
create_branches() {
  local branch payload
  for branch in "${PROMOTION_BRANCHES[@]}"; do
    if ! api GET "repos/${repo}/git/matching-refs/heads/${branch}"; then
      step_failed "branch ${branch}"
      continue
    fi
    if jq -e --arg ref "refs/heads/${branch}" 'any(.[]; .ref == $ref)' <<<"$api_out" >/dev/null; then
      printf 'skip branch %s (exists)\n' "$branch"
      continue
    fi
    payload="$(jq -n --arg ref "refs/heads/${branch}" --arg sha "$main_sha" '{ref: $ref, sha: $sha}')"
    if api POST "repos/${repo}/git/refs" "$payload"; then
      step_ok "branch ${branch}"
    else
      step_failed "branch ${branch}"
    fi
  done
}

# Step 2: create or update each ruleset, matched by name.
upsert_rulesets() {
  local file name payload existing id
  if ! api GET "repos/${repo}/rulesets?includes_parents=false&per_page=100"; then
    step_failed "rulesets"
    return 0
  fi
  existing="$api_out"
  for file in "${RULESETS_DIR}"/*.json; do
    payload="$(jq -c . "$file")"
    name="$(jq -r .name <<<"$payload")"
    id="$(jq -r --arg name "$name" 'map(select(.name == $name)) | first | .id // empty' <<<"$existing")"
    if [[ -n "$id" ]]; then
      if api PUT "repos/${repo}/rulesets/${id}" "$payload"; then
        step_ok "ruleset ${name} (updated)"
      else
        step_failed "ruleset ${name}"
      fi
    else
      if api POST "repos/${repo}/rulesets" "$payload"; then
        step_ok "ruleset ${name} (created)"
      else
        step_failed "ruleset ${name}"
      fi
    fi
  done
}

# Step 3: merge settings, description and template flag.
update_settings() {
  local payload
  payload="$(jq -c --argjson template "$template" '{
    allow_squash_merge: true,
    allow_merge_commit: true,
    allow_rebase_merge: false,
    squash_merge_commit_title: "PR_TITLE",
    squash_merge_commit_message: "PR_BODY",
    merge_commit_title: "PR_TITLE",
    merge_commit_message: "PR_BODY",
    delete_branch_on_merge: true,
    description: .description
  } + (if $template then {is_template: true} else {} end)' "$REPOSITORY_FILE")"
  if api PATCH "repos/${repo}" "$payload"; then
    step_ok "settings"
  else
    step_failed "settings"
  fi
}

# Step 4: replace the topics.
update_topics() {
  local payload
  payload="$(jq -c '{names: .topics}' "$REPOSITORY_FILE")"
  if api PUT "repos/${repo}/topics" "$payload"; then
    step_ok "topics"
  else
    step_failed "topics"
  fi
}

# Step 5: read-only default token, workflows may create and approve pull requests.
update_actions_permissions() {
  local payload='{"default_workflow_permissions":"read","can_approve_pull_request_reviews":true}'
  if api PUT "repos/${repo}/actions/permissions/workflow" "$payload"; then
    step_ok "actions permissions"
  else
    step_failed "actions permissions"
  fi
}

# Step 6: private vulnerability reporting, the channel documented in SECURITY.md.
enable_vulnerability_reporting() {
  if api PUT "repos/${repo}/private-vulnerability-reporting"; then
    step_ok "private vulnerability reporting"
  else
    step_failed "private vulnerability reporting"
  fi
}

main() {
  parse_args "$@"
  err_file="$(mktemp)"
  trap cleanup EXIT
  check_preconditions
  if [[ "$dry_run" == true ]]; then
    printf 'dry-run: no change will be made to %s\n' "$repo"
  fi
  create_branches
  upsert_rulesets
  update_settings
  update_topics
  update_actions_permissions
  enable_vulnerability_reporting
  printf 'done: %s\n' "$repo"
}

main "$@"
