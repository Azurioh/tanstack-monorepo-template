import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { findLayoutViolations } from "#tests/architecture/feature-layout";
import { LAYOUT_RULE_ID } from "#tests/architecture/rule-ids";

const FEATURES_DIRECTORY = fileURLToPath(new URL("../../src/features/", import.meta.url));

const COMPLIANT_FEATURE = [
  "server/domain/greeting.ts",
  "server/application/ports/greeting-repository.ts",
  "server/infrastructure/in-memory-greeting-repository.ts",
  "server/rpc/greeting-procedures.ts",
  "client/api/greeting-queries.ts",
  "client/hooks/use-greeting.ts",
  "client/components/greeting-form.tsx",
  "client/pages/greeting-page.tsx",
  "client/copy.ts",
  "schemas.ts",
  "index.ts",
  "server.ts",
  "testing.ts",
];

interface LayoutFixture {
  readonly name: string;
  readonly files: readonly string[];
  readonly expectViolation: boolean;
}

const FIXTURES: readonly LayoutFixture[] = [
  { name: "the documented layout", files: COMPLIANT_FEATURE, expectViolation: false },
  {
    name: "an extra utils/ folder",
    files: [...COMPLIANT_FEATURE, "utils/format.ts"],
    expectViolation: true,
  },
  {
    name: "a missing testing.ts",
    files: COMPLIANT_FEATURE.filter((file) => file !== "testing.ts"),
    expectViolation: true,
  },
  {
    name: "an undocumented server/ layer",
    files: [...COMPLIANT_FEATURE, "server/services/greeter.ts"],
    expectViolation: true,
  },
];

const temporaryDirectories: string[] = [];

function createFeature(files: readonly string[]): string {
  const featureDirectory = mkdtempSync(join(tmpdir(), "feature-layout-"));
  temporaryDirectories.push(featureDirectory);
  for (const file of files) {
    const path = join(featureDirectory, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "");
  }
  return featureDirectory;
}

describe(`${LAYOUT_RULE_ID}: feature folder layout`, () => {
  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("has a violating and a compliant fixture", () => {
    expect(new Set(FIXTURES.map((fixture) => fixture.expectViolation))).toEqual(
      new Set([true, false]),
    );
  });

  it.each(FIXTURES)("reports $name iff it violates the layout", (fixture) => {
    const violations = findLayoutViolations(createFeature(fixture.files));

    expect(violations.length > 0).toBe(fixture.expectViolation);
    expect(violations.every((violation) => violation.startsWith(`${LAYOUT_RULE_ID}:`))).toBe(true);
  });

  it.each(readdirSync(FEATURES_DIRECTORY))(
    "src/features/%s follows the documented layout",
    (feature) => {
      expect(findLayoutViolations(join(FEATURES_DIRECTORY, feature))).toEqual([]);
    },
  );
});
