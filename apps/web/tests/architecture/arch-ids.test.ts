import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

interface ViolatingFile {
  readonly ruleId: string;
  readonly path: string;
  readonly source: string;
}

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const BIOME_BIN = join(REPO_ROOT, "node_modules", ".bin", "biome");
// The registry install the template consumes, never the workspace packages/arch-rules.
const INSTALLED_PRESET = join(REPO_ROOT, "node_modules", "@azurioh", "arch-rules");
const ARCH_ID_IN_OUTPUT = /ARCH-[A-Z-]+(?=:)/g;
const SRC = "apps/web/src";
const GREETING = `${SRC}/features/greeting`;

const VIOLATING_FILES: readonly ViolatingFile[] = [
  {
    ruleId: "ARCH-LAYER",
    path: `${GREETING}/server/domain/greeting.ts`,
    source:
      'import { InMemoryGreetingRepository } from "@/features/greeting/server/infrastructure/in-memory-greeting-repository";\nexport { InMemoryGreetingRepository };\n',
  },
  {
    ruleId: "ARCH-FEATURE",
    path: `${GREETING}/server/application/greet.ts`,
    source:
      'import { Invoice } from "@/features/billing/server/domain/invoice";\nexport { Invoice };\n',
  },
  {
    ruleId: "ARCH-CLIENT-SERVER",
    path: `${GREETING}/client/hooks/use-greeting-form.ts`,
    source:
      'import { createGreetingUseCases } from "@/features/greeting/server";\nexport { createGreetingUseCases };\n',
  },
  {
    ruleId: "ARCH-VENDOR",
    path: `${GREETING}/server/application/greet.ts`,
    source: 'import Stripe from "stripe";\nexport { Stripe };\n',
  },
  {
    ruleId: "ARCH-REEXPORT",
    path: `${SRC}/shared/client/copy.ts`,
    source: 'export type { DomainError } from "@/shared/domain/errors";\n',
  },
  {
    ruleId: "ARCH-RELATIVE",
    path: `${GREETING}/server/application/greet.ts`,
    source: 'import { Greeting } from "../domain/greeting";\nexport { Greeting };\n',
  },
];

let consumer = "";

/**
 * @param violatingFile - file written at its real path inside the temporary template copy
 * @returns the distinct architecture rule ids Biome reports for that single file
 */
function reportedRuleIds(violatingFile: ViolatingFile): string[] {
  const file = join(consumer, violatingFile.path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, violatingFile.source);
  const result = spawnSync(
    BIOME_BIN,
    ["lint", "--vcs-enabled=false", "--max-diagnostics=none", "--colors=off", violatingFile.path],
    { cwd: consumer, encoding: "utf8" },
  );
  rmSync(file);
  const output = `${result.stdout}${result.stderr}`;
  return [...new Set(output.match(ARCH_ID_IN_OUTPUT))];
}

describe("architecture lint ids (template biome.jsonc + published preset)", () => {
  beforeAll(() => {
    consumer = mkdtempSync(join(tmpdir(), "arch-ids-template-"));
    cpSync(join(REPO_ROOT, "biome.jsonc"), join(consumer, "biome.jsonc"));
    mkdirSync(join(consumer, "node_modules", "@azurioh"), { recursive: true });
    symlinkSync(INSTALLED_PRESET, join(consumer, "node_modules", "@azurioh", "arch-rules"), "dir");
  });

  afterAll(() => {
    rmSync(consumer, { recursive: true, force: true });
  });

  it.each(VIOLATING_FILES)("$ruleId fires on $path", (violatingFile) => {
    expect(reportedRuleIds(violatingFile)).toEqual([violatingFile.ruleId]);
  });
});
