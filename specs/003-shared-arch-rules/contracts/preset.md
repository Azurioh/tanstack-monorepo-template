# Contract: Biome preset and package exports

## `package.json` (published fields)

```jsonc
{
  "name": "@azurioh/arch-rules",
  "license": "MIT",
  "type": "module",
  "repository": { "type": "git", "url": "git+https://github.com/Azurioh/tanstack-monorepo-template.git", "directory": "packages/arch-rules" },
  "exports": { "./biome": "./preset.jsonc" },
  "bin": { "arch-rules": "./dist/cli.js" },
  "files": ["dist", "preset.jsonc", "biome-manifest.jsonc", "plugins", "rules"],
  "peerDependencies": { "@biomejs/biome": ">=2.6.3 <3.0.0" }
}
```

- `repository.url` must match the GitHub repository exactly, or trusted publishing refuses the
  upload (R6).
- `biome-manifest.jsonc` sits at the package root, which is where Biome resolves
  `@azurioh/arch-rules/<rule>` from (R2).

## `biome-manifest.jsonc`

```jsonc
{ "version": 1, "plugins": { "rules": [
  { "feature-boundaries": "./plugins/feature-boundaries.grit" },
  { "client-server": "./plugins/client-server.grit" },
  { "no-passthrough-reexports": "./plugins/no-passthrough-reexports.grit" },
  { "vendor-sdks": "./plugins/vendor-sdks.grit" }
] } }
```

## `preset.jsonc`

- It holds `plugins` (each one a `@azurioh/arch-rules/<rule>` path with the same `includes` as
  today) and the 12 `overrides` of today's root `biome.jsonc`, both with their `apps/*` globs.
- It holds no `files`, `formatter`, `css`, `assist`, `root` or `$schema`. Those stay in the
  consumer.

## Consumer `biome.jsonc` (minimum)

```jsonc
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "root": true,
  "extends": ["@azurioh/arch-rules/biome"],
  "files": { /* project */ },
  "formatter": { /* project */ },
  "plugins": [ /* project additions: Grit rules, concatenated with the preset's */ ],
  "overrides": [ /* project additions on paths the preset does not cover */ ]
}
```

**Rule for additions (R3)**: a consumer `noRestrictedImports` override on a glob the preset
already covers **replaces** the preset's restriction for those files. It is forbidden: add a Grit
plugin instead. The consumer's parity test catches a violation of this rule.
