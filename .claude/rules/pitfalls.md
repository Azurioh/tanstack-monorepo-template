<!-- conventions:begin pitfalls.header -->
# Pitfalls — recurring traps (append, date, keep short)

Format: `- YYYY-MM-DD — symptom → cause → fix`. See `knowledge.md` for when to add.
<!-- conventions:end pitfalls.header -->
- 2026-10-29 — SSR loader fails with "fetch failed" behind a port-forward, container or proxy → the
  server called `/api/rpc` over HTTP at the browser's Host → SSR uses the in-process client the
  composition root registers (`globalThis.$rpcServerClient`, ADR 0011); never self-fetch.
