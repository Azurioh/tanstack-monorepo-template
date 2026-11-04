import { readdirSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { renderManagedCopy } from "../src/agent-rules.js";
import { createTemporaryDirectory, removeTemporaryDirectories, runCli } from "./cli-harness.js";

const VERSION = "1.2.0";
const PROJECT_NOTE = "# Project note\n\nOwned by this repository.\n";
const SHIPPED_RULES_DIR = fileURLToPath(new URL("../rules/", import.meta.url));
const SHIPPED_RULE_NAMES: readonly string[] = readdirSync(SHIPPED_RULES_DIR)
  .filter((file) => file.endsWith(".md"))
  .map((file) => file.slice(0, -".md".length))
  .toSorted((left, right) => left.localeCompare(right));
const AGENT_RULES_FOLDER = ".claude/rules/arch-rules";
const REMEDIATION = 'run "pnpm exec arch-rules sync" and commit the result';
const AGENTS_MD_SCRIPT =
  ".claude/plugins/marketplaces/claude-conventions/plugins/conventions/scripts/agents-md.sh";
const STUB_ARGS_FILE = "agents-md-args.txt";

interface Workspace {
  readonly repo: string;
  readonly home: string;
}

/** A repository with an empty `.claude/` folder and an empty home without the plugin. */
async function createWorkspace(): Promise<Workspace> {
  const repo = await createTemporaryDirectory("arch-rules-agent-repo-");
  const home = await createTemporaryDirectory("arch-rules-agent-home-");
  await mkdir(join(repo, ".claude"));
  return { repo, home };
}

function agentRulePath(params: { repo: string; name: string }): string {
  return join(params.repo, AGENT_RULES_FOLDER, `${params.name}.md`);
}

function sync(workspace: Workspace): ReturnType<typeof runCli> {
  return runCli({ args: ["sync", "--repo", workspace.repo], home: workspace.home });
}

function check(workspace: Workspace): ReturnType<typeof runCli> {
  return runCli({ args: ["check", "--repo", workspace.repo], home: workspace.home });
}

/** A stub generator under the temporary home: records its arguments, exits with `exitCode`. */
async function installAgentsMdStub(params: { home: string; exitCode: number }): Promise<void> {
  const script = join(params.home, AGENTS_MD_SCRIPT);
  await mkdir(dirname(script), { recursive: true });
  // No executable bit: sync must run the script through bash.
  await writeFile(
    script,
    `printf '%s\\n' "$@" > "${join(params.home, STUB_ARGS_FILE)}"\nexit ${params.exitCode}\n`,
  );
}

describe("arch-rules sync and check (CLI)", () => {
  afterEach(removeTemporaryDirectories);

  it("writes every shipped rule, after which check exits 0", async () => {
    const workspace = await createWorkspace();

    const synced = sync(workspace);
    const checked = check(workspace);

    expect(synced.status).toBe(0);
    expect(synced.stdout).toBe(
      [
        ...SHIPPED_RULE_NAMES.map((name) => `written ${name}`),
        `AGENTS.md not regenerated: run bash ${join(workspace.home, AGENTS_MD_SCRIPT)} --repo ${workspace.repo}`,
        "",
      ].join("\n"),
    );
    expect(checked.status).toBe(0);
    expect(checked.stdout).toBe("");
  });

  it("reports a hand-edited copy as differs, naming the file", async () => {
    const workspace = await createWorkspace();
    sync(workspace);
    const uiPath = agentRulePath({ repo: workspace.repo, name: "ui" });
    await writeFile(uiPath, `${await readFile(uiPath, "utf8")}- A local addition.\n`);

    const result = check(workspace);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe(`differs ${AGENT_RULES_FOLDER}/ui.md\n${REMEDIATION}\n`);
  });

  it("reports a deleted copy as missing", async () => {
    const workspace = await createWorkspace();
    sync(workspace);
    await rm(agentRulePath({ repo: workspace.repo, name: "errors" }));

    const result = check(workspace);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe(`missing ${AGENT_RULES_FOLDER}/errors.md\n${REMEDIATION}\n`);
  });

  it("reports a managed copy the package no longer ships as stale, and sync removes it", async () => {
    const workspace = await createWorkspace();
    sync(workspace);
    const stalePath = agentRulePath({ repo: workspace.repo, name: "legacy" });
    await writeFile(stalePath, renderManagedCopy({ content: "# Legacy\n", version: VERSION }));

    const checked = check(workspace);
    const synced = sync(workspace);

    expect(checked.status).toBe(1);
    expect(checked.stdout).toBe(`stale ${AGENT_RULES_FOLDER}/legacy.md\n${REMEDIATION}\n`);
    expect(synced.status).toBe(0);
    expect(synced.stdout).toContain("removed legacy\n");
    await expect(readFile(stalePath, "utf8")).rejects.toThrow("ENOENT");
    expect(check(workspace).status).toBe(0);
  });

  it("leaves a file without the managed header untouched", async () => {
    const workspace = await createWorkspace();
    const notePath = agentRulePath({ repo: workspace.repo, name: "project-note" });
    await mkdir(dirname(notePath), { recursive: true });
    await writeFile(notePath, PROJECT_NOTE);

    const synced = sync(workspace);

    expect(synced.status).toBe(0);
    expect(await readFile(notePath, "utf8")).toBe(PROJECT_NOTE);
    expect(check(workspace).status).toBe(0);
  });

  it("skips check in a repository without .claude/", async () => {
    const repo = await createTemporaryDirectory("arch-rules-agent-repo-");
    const home = await createTemporaryDirectory("arch-rules-agent-home-");

    const result = runCli({ args: ["check", "--repo", repo], home });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("no agent rules folder, skipped\n");
  });

  it("runs the AGENTS.md generator with --repo when the plugin is installed", async () => {
    const workspace = await createWorkspace();
    await installAgentsMdStub({ home: workspace.home, exitCode: 0 });

    const result = sync(workspace);

    expect(result.status).toBe(0);
    expect(await readFile(join(workspace.home, STUB_ARGS_FILE), "utf8")).toBe(
      `--repo\n${workspace.repo}\n`,
    );
    expect(result.stdout).not.toContain("not regenerated");
    expect(result.stderr).not.toContain("not regenerated");
  });

  it("exits 1 when the AGENTS.md generator fails", async () => {
    const workspace = await createWorkspace();
    await installAgentsMdStub({ home: workspace.home, exitCode: 3 });

    const result = sync(workspace);

    expect(result.status).toBe(1);
    expect(result.stderr).toBe(
      `arch-rules sync: AGENTS.md not regenerated: ${join(workspace.home, AGENTS_MD_SCRIPT)} exited 3\n`,
    );
  });
});
