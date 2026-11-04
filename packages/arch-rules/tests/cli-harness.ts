import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const CLI_PATH = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

const temporaryDirectories: string[] = [];

interface CliResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/**
 * @param prefix - basename prefix of the directory
 * @returns a new empty directory, removed by `removeTemporaryDirectories`
 */
export async function createTemporaryDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

/** Removes every directory `createTemporaryDirectory` made since the last call. */
export async function removeTemporaryDirectories(): Promise<void> {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
}

/**
 * Runs the built CLI as a child process, the way a consumer invokes it. `home` replaces HOME so
 * the developer's own conventions plugin is never found or run.
 *
 * @param params.args - command-line arguments after `arch-rules`
 * @param params.home - directory the child sees as its home
 */
export function runCli(params: { args: readonly string[]; home: string }): CliResult {
  const result = spawnSync(process.execPath, [CLI_PATH, ...params.args], {
    encoding: "utf8",
    env: { ...process.env, HOME: params.home },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}
