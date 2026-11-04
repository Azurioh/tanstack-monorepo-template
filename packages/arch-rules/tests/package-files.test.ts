import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const PACKAGE_DIR = fileURLToPath(new URL("../", import.meta.url));
// npm packs package.json and LICENSE whatever `files` says (README too, but the package has none).
const ALWAYS_PACKED: readonly string[] = ["package.json", "LICENSE"];
const PACKED_ROOT_FILES: readonly string[] = ["preset.jsonc", "biome-manifest.jsonc"];

interface PackedDirectory {
  readonly sourceDir: string;
  readonly sourceExtension: string;
  readonly packedDir: string;
  readonly packedExtension: string;
}

// One entry per published directory: every source file of that directory ships under its packed
// name, nothing else does. tsc emits exactly one .js per src/*.ts (no maps, no declarations).
const PACKED_DIRECTORIES: readonly PackedDirectory[] = [
  { sourceDir: "src", sourceExtension: ".ts", packedDir: "dist", packedExtension: ".js" },
  {
    sourceDir: "plugins",
    sourceExtension: ".grit",
    packedDir: "plugins",
    packedExtension: ".grit",
  },
];
// biome-manifest.jsonc references each plugin by path; a dropped file would break consumers.
const GRIT_PLUGIN_COUNT = 4;
const FORBIDDEN_PREFIXES: readonly string[] = ["src/", "tests/"];

let packedPaths: string[] = [];

/**
 * @param directory - published directory to expand
 * @returns the packed path of each of its source files
 */
function expectedPackedPaths(directory: PackedDirectory): string[] {
  return readdirSync(join(PACKAGE_DIR, directory.sourceDir))
    .filter((file) => file.endsWith(directory.sourceExtension))
    .map((file) => {
      const stem = file.slice(0, -directory.sourceExtension.length);
      return `${directory.packedDir}/${stem}${directory.packedExtension}`;
    });
}

/**
 * @param output - stdout of `npm pack --dry-run --json`
 * @returns the path of every file the tarball would hold
 */
function parsePackedPaths(output: string): string[] {
  const parsed: unknown = JSON.parse(output);
  if (!Array.isArray(parsed) || parsed.length !== 1) {
    throw new Error("npm pack --json did not describe exactly one package");
  }
  const [pack]: unknown[] = parsed;
  if (
    typeof pack !== "object" ||
    pack === null ||
    !("files" in pack) ||
    !Array.isArray(pack.files)
  ) {
    throw new Error("npm pack --json output has no files list");
  }
  return pack.files.map((file: unknown) => {
    if (
      typeof file !== "object" ||
      file === null ||
      !("path" in file) ||
      typeof file.path !== "string"
    ) {
      throw new Error("npm pack --json listed a file without a path");
    }
    return file.path;
  });
}

describe("published package (npm pack)", () => {
  beforeAll(() => {
    // --dry-run writes no tarball; --ignore-scripts keeps a future prepack hook out of the test.
    const result = spawnSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
      cwd: PACKAGE_DIR,
      encoding: "utf8",
    });
    if (result.status !== 0) {
      throw new Error(`npm pack --dry-run exited ${result.status}: ${result.stderr}`);
    }
    packedPaths = parsePackedPaths(result.stdout);
  });

  it("holds exactly the published file set", () => {
    const expected = [
      ...ALWAYS_PACKED,
      ...PACKED_ROOT_FILES,
      ...PACKED_DIRECTORIES.flatMap(expectedPackedPaths),
    ];

    expect([...packedPaths].sort()).toEqual([...expected].sort());
  });

  it("ships the CLI binary and the four Grit plugins", () => {
    expect(packedPaths).toContain("dist/cli.js");
    expect(
      packedPaths.filter((path) => path.startsWith("plugins/") && path.endsWith(".grit")),
    ).toHaveLength(GRIT_PLUGIN_COUNT);
  });

  it("ships no source or test file", () => {
    const leaked = packedPaths.filter((path) =>
      FORBIDDEN_PREFIXES.some((prefix) => path.startsWith(prefix)),
    );

    expect(leaked).toEqual([]);
  });
});
