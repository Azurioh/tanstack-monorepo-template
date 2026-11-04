#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { glob, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { diffStates, planSync, renderManagedCopy } from "./agent-rules.js";
import { UsageError } from "./errors.js";
import { type FeatureTree, findLayoutViolations } from "./feature-layout.js";

const USAGE = "usage: arch-rules <sync|check|layout> [--repo <dir>] [--apps <glob>]";
const LAYOUT_RULE_ID = "ARCH-LAYOUT";
const COMMANDS = ["sync", "check", "layout"] as const;
/** The CLI runs from `dist/cli.js`: the package root, holding `rules/` and `package.json`, is one level up. */
const PACKAGE_ROOT = fileURLToPath(new URL("../", import.meta.url));
const AGENT_RULES_FOLDER = ".claude/rules/arch-rules";
const RULE_EXTENSION = ".md";
const SYNC_REMEDIATION = 'run "pnpm exec arch-rules sync" and commit the result';
const AGENTS_MD_SCRIPT = [
  ".claude",
  "plugins",
  "marketplaces",
  "claude-conventions",
  "plugins",
  "conventions",
  "scripts",
  "agents-md.sh",
];
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

type Command = (typeof COMMANDS)[number];

function isCommand(value: string): value is Command {
  return COMMANDS.some((command) => command === value);
}

function isMissingPath(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

/** Version of the installed package, written into every managed header. */
async function readPackageVersion(): Promise<string> {
  const manifestPath = join(PACKAGE_ROOT, "package.json");
  const manifest: unknown = JSON.parse(await readFile(manifestPath, "utf8"));
  if (
    typeof manifest !== "object" ||
    manifest === null ||
    !("version" in manifest) ||
    typeof manifest.version !== "string"
  ) {
    throw new Error(`${manifestPath} has no string "version" field`);
  }
  return manifest.version;
}

/**
 * Every `*.md` file of `directory`, keyed by basename without the extension, sorted by name.
 * A missing directory yields an empty map: `sync` creates it, `check` reports every rule missing.
 */
async function readRuleFiles(directory: string): Promise<Map<string, string>> {
  const dirents = await readdir(directory, { withFileTypes: true }).catch((error: unknown) => {
    if (isMissingPath(error)) {
      return [];
    }
    throw error;
  });
  const names = dirents
    .filter((dirent) => dirent.isFile() && dirent.name.endsWith(RULE_EXTENSION))
    .map((dirent) => dirent.name.slice(0, -RULE_EXTENSION.length))
    .toSorted((left, right) => left.localeCompare(right));
  const rules = new Map<string, string>();
  for (const name of names) {
    rules.set(name, await readFile(join(directory, `${name}${RULE_EXTENSION}`), "utf8"));
  }
  return rules;
}

/** Shipped rules, local copies and installed version of `repo`, as `agent-rules.ts` takes them. */
async function readAgentRuleSources(repo: string): Promise<{
  shipped: Map<string, string>;
  local: Map<string, string>;
  version: string;
}> {
  // Reading the repo first surfaces a missing or non-directory --repo instead of treating it as
  // an empty project.
  await readdir(repo);
  return {
    shipped: await readRuleFiles(join(PACKAGE_ROOT, "rules")),
    local: await readRuleFiles(join(repo, AGENT_RULES_FOLDER)),
    version: await readPackageVersion(),
  };
}

/** Runs the conventions plugin's AGENTS.md generator, or prints the command to run it by hand. */
function regenerateAgentsMd(repo: string): number {
  const script = join(homedir(), ...AGENTS_MD_SCRIPT);
  // Running the script through bash keeps sync working when the file lost its executable bit.
  const args = [script, "--repo", repo];
  if (!existsSync(script)) {
    // CI's agents-md job is the gate, so a machine without the plugin still syncs successfully.
    process.stdout.write(`AGENTS.md not regenerated: run bash ${args.join(" ")}\n`);
    return EXIT_CLEAN;
  }
  const result = spawnSync("bash", args, { stdio: "inherit" });
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    const outcome =
      result.status === null ? `was killed by ${result.signal}` : `exited ${result.status}`;
    process.stderr.write(`arch-rules sync: AGENTS.md not regenerated: ${script} ${outcome}\n`);
    return EXIT_FAILURE;
  }
  return EXIT_CLEAN;
}

async function runSync(repo: string): Promise<number> {
  const sources = await readAgentRuleSources(repo);
  const plan = planSync(sources);
  const folder = join(repo, AGENT_RULES_FOLDER);
  await mkdir(folder, { recursive: true });
  for (const name of plan.write) {
    const content = sources.shipped.get(name);
    if (content === undefined) {
      throw new Error(`planned rule "${name}" is not shipped by the package`);
    }
    await writeFile(
      join(folder, `${name}${RULE_EXTENSION}`),
      renderManagedCopy({ content, version: sources.version }),
    );
    process.stdout.write(`written ${name}\n`);
  }
  for (const name of plan.remove) {
    await rm(join(folder, `${name}${RULE_EXTENSION}`));
    process.stdout.write(`removed ${name}\n`);
  }
  return regenerateAgentsMd(repo);
}

async function hasClaudeFolder(repo: string): Promise<boolean> {
  try {
    await stat(join(repo, ".claude"));
    return true;
  } catch (error) {
    if (isMissingPath(error)) {
      return false;
    }
    throw error;
  }
}

async function runCheck(repo: string): Promise<number> {
  const sources = await readAgentRuleSources(repo);
  if (!(await hasClaudeFolder(repo))) {
    process.stdout.write("no agent rules folder, skipped\n");
    return EXIT_CLEAN;
  }
  const problems = diffStates(sources);
  for (const problem of problems) {
    process.stdout.write(
      `${problem.state} ${AGENT_RULES_FOLDER}/${problem.name}${RULE_EXTENSION}\n`,
    );
  }
  if (problems.length === 0) {
    return EXIT_CLEAN;
  }
  process.stdout.write(`${SYNC_REMEDIATION}\n`);
  return EXIT_FAILURE;
}

function parseCommandLine(args: readonly string[]): {
  command: Command;
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
    if (!isCommand(command)) {
      throw new UsageError(`unknown command "${command}"`);
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`arch-rules: ${message}\n${USAGE}\n`);
    return EXIT_USAGE;
  }
  const { command, repo, apps } = invocation;
  try {
    if (command === "sync") {
      return await runSync(repo);
    }
    if (command === "check") {
      return await runCheck(repo);
    }
    return await runLayout({ repo, appsGlob: apps });
  } catch (error) {
    // Any failure here is file I/O; the cause names the path and the system error.
    const cause = error instanceof Error ? error.message : String(error);
    process.stderr.write(`arch-rules ${command}: cannot complete in ${repo}: ${cause}\n`);
    return EXIT_FAILURE;
  }
}

process.exitCode = await main(process.argv.slice(2));
