/** Entries every feature folder has, exactly (ADR 0010 feature layout). */
const FEATURE_ENTRIES: readonly string[] = [
  "client/",
  "index.ts",
  "schemas.ts",
  "server/",
  "server.ts",
  "testing.ts",
];

/** Entries a feature's layer folders may hold; anything else is a layout violation. */
const LAYER_ENTRIES: Readonly<Record<string, readonly string[]>> = {
  server: ["application/", "domain/", "infrastructure/", "rpc/"],
  client: ["api/", "components/", "copy.ts", "hooks/", "pages/"],
};

/** One `src/features/<feature>` folder, as listed by the caller. */
export interface FeatureTree {
  /** Path the violations are reported against, typically relative to the repository root. */
  readonly path: string;
  /**
   * Every file and directory under the feature folder, recursively, as a `/`-separated path
   * relative to it; directories end with `/` (`server/`, `server/domain/`, `server/domain/x.ts`).
   */
  readonly entries: readonly string[];
}

/** One layout breach, printed by the CLI as `ARCH-LAYOUT: <path>: <reason>`. */
export interface Violation {
  readonly path: string;
  readonly reason: string;
}

/** A relative path one level deep: no `/` except the trailing one of a directory. */
function isDirectChild(relativePath: string): boolean {
  return relativePath !== "" && !relativePath.slice(0, -1).includes("/");
}

/** Direct children of `prefix` (`""` for the feature root), directories keeping their `/`. */
function childrenOf(entries: readonly string[], prefix: string): string[] {
  const relativePaths = entries
    .filter((entry) => entry.startsWith(prefix))
    .map((entry) => entry.slice(prefix.length));
  return relativePaths.filter(isDirectChild).toSorted();
}

function findFeatureReasons(entries: readonly string[]): string[] {
  const rootEntries = childrenOf(entries, "");
  const missing = FEATURE_ENTRIES.filter((entry) => !rootEntries.includes(entry)).map(
    (entry) => `missing ${entry}`,
  );
  const unexpected = rootEntries
    .filter((entry) => !FEATURE_ENTRIES.includes(entry))
    .map((entry) => `unexpected ${entry}`);
  // A feature missing a top-level entry is reported on that alone: its layer folders may not
  // exist yet, so judging their content would only add noise.
  if (missing.length > 0) {
    return [...missing, ...unexpected];
  }
  const layerReasons = Object.entries(LAYER_ENTRIES).flatMap(([layer, allowed]) =>
    childrenOf(entries, `${layer}/`)
      .filter((entry) => !allowed.includes(entry))
      .map((entry) => `unexpected ${layer}/${entry}`),
  );
  return [...unexpected, ...layerReasons];
}

/**
 * @param features - every feature folder to check, already listed by the caller
 * @returns one violation per missing or unexpected entry, empty when every feature complies
 */
export function findLayoutViolations(features: readonly FeatureTree[]): Violation[] {
  return features.flatMap((feature) =>
    findFeatureReasons(feature.entries).map((reason) => ({ path: feature.path, reason })),
  );
}
