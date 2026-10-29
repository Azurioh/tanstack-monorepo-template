import { readdirSync } from "node:fs";
import { join } from "node:path";
import { LAYOUT_RULE_ID } from "#tests/architecture/rule-ids";

/** Entries every feature folder has, exactly (contracts/feature-layout.md). */
const FEATURE_ENTRIES = ["client/", "index.ts", "schemas.ts", "server/", "server.ts", "testing.ts"];

/** Entries a feature's layer folders may hold; anything else is a layout violation. */
const LAYER_ENTRIES: Readonly<Record<string, readonly string[]>> = {
  server: ["application/", "domain/", "infrastructure/", "rpc/"],
  client: ["api/", "components/", "copy.ts", "hooks/", "pages/"],
};

function listEntries(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name))
    .toSorted();
}

function findLayerViolations(featureDirectory: string): string[] {
  return Object.entries(LAYER_ENTRIES).flatMap(([layer, allowed]) =>
    listEntries(join(featureDirectory, layer))
      .filter((entry) => !allowed.includes(entry))
      .map((entry) => `${LAYOUT_RULE_ID}: unexpected ${layer}/${entry}`),
  );
}

/**
 * @param featureDirectory - absolute path of one `src/features/<feature>` folder
 * @returns one `ARCH-LAYOUT` message per missing or unexpected entry, empty when compliant
 */
export function findLayoutViolations(featureDirectory: string): string[] {
  const entries = listEntries(featureDirectory);
  const missing = FEATURE_ENTRIES.filter((entry) => !entries.includes(entry)).map(
    (entry) => `${LAYOUT_RULE_ID}: missing ${entry}`,
  );
  const unexpected = entries
    .filter((entry) => !FEATURE_ENTRIES.includes(entry))
    .map((entry) => `${LAYOUT_RULE_ID}: unexpected ${entry}`);
  if (missing.length > 0) {
    return [...missing, ...unexpected];
  }
  return [...unexpected, ...findLayerViolations(featureDirectory)];
}
