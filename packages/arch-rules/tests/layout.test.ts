import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { type FeatureTree, findLayoutViolations } from "../src/feature-layout.js";

const CLI_PATH = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

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

const temporaryRepos: string[] = [];

/** A temporary repository holding `files` (empty), removed after each test. */
async function createRepo(files: readonly string[]): Promise<string> {
  const repo = await mkdtemp(join(tmpdir(), "arch-rules-layout-"));
  temporaryRepos.push(repo);
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

/** Runs the built CLI as a child process, the way a consumer invokes it. */
function runCli(args: readonly string[]): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], { encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe("arch-rules layout (CLI)", () => {
  afterEach(async () => {
    await Promise.all(
      temporaryRepos.splice(0).map((repo) => rm(repo, { recursive: true, force: true })),
    );
  });

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

    const result = runCli(["layout", "--repo", repo]);

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

    const result = runCli(["layout", "--repo", repo]);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("rejects an unknown command with a usage error and exits 2", () => {
    const result = runCli(["unknown"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("usage: arch-rules");
  });
});
