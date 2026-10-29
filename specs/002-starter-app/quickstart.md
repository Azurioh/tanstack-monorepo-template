# Quickstart: validate the starter app

Each scenario maps to a success criterion of [spec.md](./spec.md). Run them in order after
implementation, from the repository root.

## 1. Fresh clone is green (SC-001)

```bash
git clone <repo> /tmp/tmt && cd /tmp/tmt
cp apps/web/.env.example apps/web/.env
time (pnpm install --frozen-lockfile && pnpm check && pnpm --filter web test:e2e)
```

Expected: exit 0, no warning lines; total < 8 min. `pnpm check` includes the production build.

## 2. Demo works in dev (SC-002)

```bash
pnpm --filter web dev
```

Open the printed URL: submit `Ada` → "Hello, Ada!" appears and is listed under recent greetings;
submit spaces only → validation message, no request in the network tab; resize to 375 px →
layout intact, buttons ≥ 44 px. Remove `GREETING_HISTORY_LIMIT` from `.env`, then run
`pnpm --filter web build && pnpm --filter web start` → the process exits 1 with a message naming
the variable. The dev server loads the server entry lazily: it keeps running and logs the same
message on the first request, which answers 500.

## 3. Architecture rules (SC-003)

```bash
pnpm --filter web test -- tests/architecture
```

Expected: one passing case per violating and compliant fixture for every id in
[contracts/architecture-rules.md](./contracts/architecture-rules.md), and the completeness
assertion passes. Manual spot check: add `import '@/features/greeting/server/infrastructure/in-memory-greeting-repository'`
to a domain file → `pnpm lint` fails naming `ARCH-LAYER`; revert.

## 4. Copy the demo feature (SC-004)

Follow the README section "Add a feature by copying the demo" (`apps/web` → copy `greeting` to
`farewell`, register it, `pnpm format`, `pnpm --filter web build`, `pnpm check`), then:

```bash
git diff --stat -- biome.jsonc knip.json scripts/biome apps/web/vite.config.ts apps/web/vitest.config.ts
```

Expected: `pnpm check` green; the last command prints nothing. Discard the copy afterwards.

## 5. Agent rules in sync (SC-005)

```bash
echo "- test line" >> .claude/rules/coding.md
git commit -am "chore: test agents-md sync" && git push   # on a throwaway branch, open a PR
```

Expected: the `agents-md` job fails. Regenerate (`scripts/agents-md.sh` from the plugin, or the
plugin hook) → green. Close the PR.

## 6. No private names (SC-006)

```bash
git grep -niE '<private names list from the maintainer>' -- . ':!specs/002-starter-app'
```

Expected: no output. The list lives in the maintainer's notes, not in the repository.

## 7. Remove the demo (SC-007)

Follow the README section "Remove the demo": delete the feature, its unit, contract and e2e tests;
remove its lines from `router.ts`, `composition-root.ts` and `routes/index.tsx`; remove
`@testing-library/user-event`; `pnpm format`; `pnpm check`.

Expected: green. Discard the change.

## 8. Pipeline (spec user story 5)

Open a PR that changes the greeting copy so the e2e assertion fails → `e2e` check red, merge
blocked. Fix it → green. After merge to `main`, the release PR lists the change under `web`.
