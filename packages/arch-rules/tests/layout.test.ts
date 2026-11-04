import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { type FeatureTree, findLayoutViolations } from "../src/feature-layout.js";
import { createTemporaryDirectory, removeTemporaryDirectories, runCli } from "./cli-harness.js";

const COMPLIANT_FEATURE: readonly string[] = [
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
  readonly expectedReasons: readonly string[];
}

const FIXTURES: readonly LayoutFixture[] = [
  { name: "the documented layout", files: COMPLIANT_FEATURE, expectedReasons: [] },
  {
    name: "an extra utils/ folder",
    files: [...COMPLIANT_FEATURE, "utils/format.ts"],
    expectedReasons: ["unexpected utils/"],
  },
  {
    name: "a missing testing.ts",
    files: COMPLIANT_FEATURE.filter((file) => file !== "testing.ts"),
    expectedReasons: ["missing testing.ts"],
  },
  {
    name: "an undocumented server/ layer",
    files: [...COMPLIANT_FEATURE, "server/services/greeter.ts"],
    expectedReasons: ["unexpected server/services/"],
  },
];

/** The tree a filesystem listing yields for `files`: each file plus every ancestor directory. */
function toFeatureTree(path: string, files: readonly string[]): FeatureTree {
  const entries = new Set<string>();
  for (const file of files) {
    entries.add(file);
    const segments = file.split("/");
    for (let depth = 1; depth < segments.length; depth += 1) {
      entries.add(`${segments.slice(0, depth).join("/")}/`);
    }
  }
  return { path, entries: [...entries] };
}

describe("ARCH-LAYOUT: findLayoutViolations", () => {
  it("has a violating and a compliant fixture", () => {
    expect(new Set(FIXTURES.map((fixture) => fixture.expectedReasons.length > 0))).toEqual(
      new Set([true, false]),
    );
  });

  it.each(FIXTURES)("reports $name iff it violates the layout", (fixture) => {
    const featurePath = "apps/web/src/features/greeting";

    const violations = findLayoutViolations([toFeatureTree(featurePath, fixture.files)]);

    expect(violations).toEqual(
      fixture.expectedReasons.map((reason) => ({ path: featurePath, reason })),
    );
  });

  it("reports each violation against its own feature", () => {
    const violations = findLayoutViolations([
      toFeatureTree("apps/one/src/features/clean", COMPLIANT_FEATURE),
      toFeatureTree("apps/two/src/features/broken", [...COMPLIANT_FEATURE, "utils/format.ts"]),
    ]);

    expect(violations).toEqual([
      { path: "apps/two/src/features/broken", reason: "unexpected utils/" },
    ]);
  });
});

/** A temporary repository holding `files` (empty), removed after each test. */
async function createRepo(files: readonly string[]): Promise<string> {
  const repo = await createTemporaryDirectory("arch-rules-layout-");
  for (const file of files) {
    const path = join(repo, file);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, "");
  }
  return repo;
}

/** `files` placed under `featureDirectory`. */
function featureFiles(params: { featureDirectory: string; files: readonly string[] }): string[] {
  const { featureDirectory, files } = params;
  return files.map((file) => `${featureDirectory}/${file}`);
}

/** Runs the built CLI with a fresh, empty home directory. */
async function runInFreshHome(args: readonly string[]): Promise<{
  status: number | null;
  stdout: string;
  stderr: string;
}> {
  return runCli({ args, home: await createTemporaryDirectory("arch-rules-home-") });
}

describe("arch-rules layout (CLI)", () => {
  afterEach(removeTemporaryDirectories);

  it("reports a violation in the second app and exits 1", async () => {
    const repo = await createRepo([
      ...featureFiles({
        featureDirectory: "apps/first/src/features/greeting",
        files: COMPLIANT_FEATURE,
      }),
      ...featureFiles({
        featureDirectory: "apps/second/src/features/greeting",
        files: [...COMPLIANT_FEATURE, "utils/format.ts"],
      }),
    ]);

    const result = await runInFreshHome(["layout", "--repo", repo]);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe(
      "ARCH-LAYOUT: apps/second/src/features/greeting: unexpected utils/\n",
    );
  });

  it("treats an app without src/features/ as clean and exits 0", async () => {
    const repo = await createRepo([
      ...featureFiles({
        featureDirectory: "apps/first/src/features/greeting",
        files: COMPLIANT_FEATURE,
      }),
      "apps/no-features/src/main.ts",
    ]);

    const result = await runInFreshHome(["layout", "--repo", repo]);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("rejects an unknown command with a usage error and exits 2", async () => {
    const result = await runInFreshHome(["unknown"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("usage: arch-rules");
  });
});
