# Quickstart: validating the shared architecture rules

Run every command from the repository root. Prerequisites: Node and pnpm at the versions pinned
in the repository, and `pnpm install` done.

## 1. The package proves its rules (US2, FR-005)

```bash
pnpm --filter @azurioh/arch-rules test
```

Expected: every `ARCH-*` id passes one violating and one compliant fixture, each run through a
temporary consumer that extends `@azurioh/arch-rules/biome`.

Then delete one compliant fixture of `ARCH-REEXPORT` and run the same command again. Expected: it
fails and names `ARCH-REEXPORT` as missing a compliant fixture. Restore the fixture.

## 2. The template consumes the published package (US1, SC-003, SC-005)

```bash
pnpm why @azurioh/arch-rules          # resolves from the registry, exact version, not link:
pnpm check                            # zero errors, zero warnings
```

Then:
- In `apps/web/src/features/greeting/server/domain/`, add an import from `../infrastructure/x`.
  Expected: `pnpm lint` fails with `ARCH-LAYER`. Revert.
- Copy `apps/web` to `apps/web2` (local only) and repeat the violation there. Expected: the same
  id fires, with no configuration change (FR-003). Delete `apps/web2`.
- `biome.jsonc` contains `extends` plus project settings only. No `ARCH-*` override and no
  `scripts/biome/` remain.

## 3. Project additions (US1 scenario 4, FR-004)

Add a local Grit plugin to the template's `plugins` that bans one import. Expected: it fires next
to `ARCH-LAYER` on the same file. Remove it.

## 4. The agent rules cannot drift (US3, SC-002)

```bash
pnpm exec arch-rules check                         # exit 0
echo "x" >> .claude/rules/arch-rules/ui.md
pnpm exec arch-rules check                         # exit 1: "differs .claude/rules/arch-rules/ui.md"
pnpm exec arch-rules sync && pnpm exec arch-rules check   # exit 0
```

Also check:
- A file without the managed header in `.claude/rules/arch-rules/` survives `sync`.
- `.claude/rules/architecture.md` is never touched.

## 5. Layout check (FR-006)

```bash
mkdir -p apps/web/src/features/greeting/helpers
pnpm exec arch-rules layout     # exit 1: "ARCH-LAYOUT: apps/web/src/features/greeting/helpers: ..."
rmdir apps/web/src/features/greeting/helpers
```

## 6. Release and update loop (US4, SC-001)

This step is live and runs once, after merge:

1. A `feat(arch-rules)` commit reaches `main`.
2. The release PR is merged, which tags `arch-rules-v<x>`.
3. The `publish-arch-rules` job is green, and `npm view @azurioh/arch-rules version` shows `<x>`
   with provenance.
4. Within 24 hours, Dependabot opens `chore(deps): bump @azurioh/arch-rules` on `staging` in the
   template.

## 7. Adoption timing (SC-006)

In a scratch clone of the template, follow `packages/arch-rules/README.md` § Adopt. Time it from
the first command to a green `pnpm check`. Target: under 15 minutes.
