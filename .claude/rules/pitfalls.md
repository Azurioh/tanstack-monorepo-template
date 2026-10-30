<!-- conventions:begin pitfalls.header -->
# Pitfalls — recurring traps (append, date, keep short)

Format: `- YYYY-MM-DD — symptom → cause → fix`. See `knowledge.md` for when to add.
<!-- conventions:end pitfalls.header -->
- 2026-10-29 — SSR loader fails with "fetch failed" behind a port-forward, container or proxy → the
  server called `/api/rpc` over HTTP at the browser's Host → SSR uses the in-process client the
  composition root registers (`globalThis.$rpcServerClient`, ADR 0011); never self-fetch.
- 2026-10-29 — `demo → main` promotion conflicts (for example on `.release-please-manifest.json`)
  → the release commit reached `staging` only squashed, so `main` was never an ancestor of `demo`
  → the release workflow also back-merges `main → demo` with a merge commit (ADR 0006); if it did
  not run, merge `main` into `demo` through a `chore: merge main into demo` PR.
