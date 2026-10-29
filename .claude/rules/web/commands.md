---
paths:
  - "apps/web/**"
---

# web — commands

Verification (CI parity, run from the repo root, in this order):

    pnpm check && pnpm exec turbo run test:e2e --filter=web

- `pnpm check` runs `turbo run lint typecheck test knip build` for the whole workspace (Biome
  with `--error-on-warnings`, `tsc --noEmit`, Vitest, knip, `vite build`); the architecture
  fixtures run inside `test`. `test:e2e` depends on `build` and serves the production build on
  port 4310 through Playwright's `webServer`. Zero errors and zero warnings before "done".
- First run on a machine: `pnpm --filter web exec playwright install chromium`.
- Build / start: `pnpm --filter web build`, `pnpm --filter web start` (needs
  `GREETING_HISTORY_LIMIT`; startup fails naming any missing or invalid variable, see
  `apps/web/.env.example`).
