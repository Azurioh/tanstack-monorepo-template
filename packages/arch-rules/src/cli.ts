#!/usr/bin/env node
import { glob, readdir } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import { UsageError } from "./errors.js";
import { type FeatureTree, findLayoutViolations } from "./feature-layout.js";

const USAGE = "usage: arch-rules layout [--repo <dir>] [--apps <glob>]";
const LAYOUT_RULE_ID = "ARCH-LAYOUT";
const EXIT_CLEAN = 0;
const EXIT_FAILURE = 1;
const EXIT_USAGE = 2;

/** Glob results use the platform separator; reported paths and tree entries always use `/`. */
function toPosix(path: string): string {
  return path.split(sep).join("/");
}

/** Every file and directory under `featureDirectory`, directories ending with `/`. */
async function listEntries(featureDirectory: string): Promise<string[]> {
  const dirents = await readdir(featureDirectory, { recursive: true, withFileTypes: true });
  return dirents.map((dirent) => {
    const relativePath = toPosix(
      join(dirent.parentPath, dirent.name).slice(featureDirectory.length + 1),
    );
    return dirent.isDirectory() ? `${relativePath}/` : relativePath;
  });
}

/** Feature folders of every app matching `appsGlob`; an app without `src/features/` adds none. */
async function listFeatures(params: { repo: string; appsGlob: string }): Promise<FeatureTree[]> {
  const { repo, appsGlob } = params;
  // glob() over a missing or non-directory cwd yields nothing; reading it first surfaces the
  // ENOENT / ENOTDIR instead of reporting a clean layout.
  await readdir(repo);
  const features: FeatureTree[] = [];
  for await (const match of glob(`${appsGlob}/src/features/*`, {
    cwd: repo,
    withFileTypes: true,
  })) {
    if (match.isDirectory()) {
      const featureDirectory = join(match.parentPath, match.name);
      features.push({
        path: toPosix(featureDirectory.slice(repo.length + 1)),
        entries: await listEntries(featureDirectory),
      });
    }
  }
  // Glob order depends on the filesystem; sorting keeps the output stable across machines.
  return features.toSorted((left, right) => left.path.localeCompare(right.path));
}

async function runLayout(params: { repo: string; appsGlob: string }): Promise<number> {
  const violations = findLayoutViolations(await listFeatures(params));
  for (const violation of violations) {
    process.stdout.write(`${LAYOUT_RULE_ID}: ${violation.path}: ${violation.reason}\n`);
  }
  return violations.length > 0 ? EXIT_FAILURE : EXIT_CLEAN;
}

function parseCommandLine(args: readonly string[]): {
  command: string;
  repo: string;
  apps: string;
} {
  try {
    const { values, positionals } = parseArgs({
      args: [...args],
      allowPositionals: true,
      options: {
        repo: { type: "string", default: process.cwd() },
        apps: { type: "string", default: "apps/*" },
      },
    });
    const [command, ...extra] = positionals;
    if (command === undefined || extra.length > 0) {
      throw new UsageError("expected exactly one command");
    }
    return { command, repo: resolve(values.repo), apps: values.apps };
  } catch (error) {
    if (error instanceof UsageError) {
      throw error;
    }
    // parseArgs rejects unknown or malformed flags with a TypeError: that is the user's input.
    throw new UsageError(error instanceof Error ? error.message : String(error), { cause: error });
  }
}

async function main(args: readonly string[]): Promise<number> {
  let invocation: ReturnType<typeof parseCommandLine>;
  try {
    invocation = parseCommandLine(args);
    if (invocation.command !== "layout") {
      throw new UsageError(`unknown command "${invocation.command}"`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`arch-rules: ${message}\n${USAGE}\n`);
    return EXIT_USAGE;
  }
  try {
    return await runLayout({ repo: invocation.repo, appsGlob: invocation.apps });
  } catch (error) {
    // Any failure here is reading the repository; the cause names the path and the system error.
    const cause = error instanceof Error ? error.message : String(error);
    process.stderr.write(`arch-rules layout: cannot read ${invocation.repo}: ${cause}\n`);
    return EXIT_FAILURE;
  }
}

process.exitCode = await main(process.argv.slice(2));
