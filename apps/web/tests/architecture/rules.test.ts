import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ARCHITECTURE_RULE_IDS,
  findRulesWithoutBothFixtures,
  LAYOUT_RULE_ID,
  type RuleFixture,
} from "#tests/architecture/rule-ids";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const BIOME_BIN = join(REPO_ROOT, "node_modules", ".bin", "biome");
const ARCH_ID_IN_OUTPUT = /ARCH-[A-Z-]+(?=:)/g;
const SRC = "apps/web/src";
const ALPHA = `${SRC}/features/alpha`;

const LINT_RULE_IDS = ARCHITECTURE_RULE_IDS.filter((ruleId) => ruleId !== LAYOUT_RULE_ID);

const FIXTURES: readonly RuleFixture[] = [
  {
    ruleId: "ARCH-LAYER",
    path: `${ALPHA}/server/domain/greeting.ts`,
    source:
      'import { Repo } from "@/features/alpha/server/infrastructure/repo";\nexport { Repo };\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-LAYER",
    path: `${ALPHA}/server/application/greet.ts`,
    source:
      'import type { Procedures } from "@/features/alpha/server/rpc/procedures";\nexport type { Procedures };\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-LAYER",
    path: `${SRC}/shared/domain/money.ts`,
    source: 'import type { Clock } from "@/shared/server/ports/clock";\nexport type { Clock };\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-LAYER",
    path: `${ALPHA}/client/hooks/use-thing.ts`,
    source: 'import { aThing } from "@/features/alpha/testing";\nexport { aThing };\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-LAYER",
    path: `${SRC}/routes/index.tsx`,
    source: 'import { loadEnv } from "@/shared/server/config/env";\nexport { loadEnv };\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-LAYER",
    path: `${SRC}/routes/api/rpc.$.ts`,
    source:
      'import { createRouter } from "@/shared/server/rpc/router";\nexport { createRouter };\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-LAYER",
    path: `${ALPHA}/server/domain/greeting.ts`,
    source:
      'import { ValidationError } from "@/shared/domain/errors";\nimport { Name } from "@/features/alpha/server/domain/name";\nexport { Name, ValidationError };\n',
    expectViolation: false,
  },
  {
    ruleId: "ARCH-LAYER",
    path: `${ALPHA}/server/infrastructure/repo.ts`,
    source:
      'import type { Clock } from "@/shared/server/ports/clock";\nimport { SystemClock } from "@/shared/server/adapters/system-clock";\nexport { SystemClock };\nexport type { Clock };\n',
    expectViolation: false,
  },
  {
    ruleId: "ARCH-LAYER",
    path: `${ALPHA}/server/rpc/procedures.ts`,
    source:
      'import { inputSchema } from "@/features/alpha/schemas";\nimport { baseProcedure } from "@/shared/server/rpc/context";\nexport { baseProcedure, inputSchema };\n',
    expectViolation: false,
  },
  {
    ruleId: "ARCH-LAYER",
    path: `${SRC}/routes/api/rpc.$.ts`,
    source: 'import { router } from "@/shared/server/composition-root";\nexport { router };\n',
    expectViolation: false,
  },
  {
    ruleId: "ARCH-LAYER",
    path: `${SRC}/routes/index.tsx`,
    source:
      'import { createQueryClient } from "@/shared/client/query-client";\nexport { createQueryClient };\n',
    expectViolation: false,
  },
  {
    ruleId: "ARCH-FEATURE",
    path: `${ALPHA}/server/application/greet.ts`,
    source: 'import { Other } from "@/features/beta/server/domain/other";\nexport { Other };\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-FEATURE",
    path: `${ALPHA}/server.ts`,
    source: 'export { createProcedures } from "@/features/alphabet/server";\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-FEATURE",
    path: `${SRC}/shared/client/query-client.ts`,
    source: 'import { Page } from "@/features/alpha";\nexport { Page };\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-FEATURE",
    path: `${SRC}/shared/server/composition-root.ts`,
    source:
      'import { Repo } from "@/features/alpha/server/infrastructure/repo";\nexport { Repo };\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-FEATURE",
    path: `${SRC}/routes/index.tsx`,
    source: 'import { Page } from "@/features/alpha/client/pages/page";\nexport { Page };\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-FEATURE",
    path: `${SRC}/router.tsx`,
    source: 'import { Name } from "@/features/alpha/server/domain/name";\nexport { Name };\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-FEATURE",
    path: `${ALPHA}/server.ts`,
    source:
      'import { Greet } from "@/features/alpha/server/application/greet";\nexport { Greet };\n',
    expectViolation: false,
  },
  {
    ruleId: "ARCH-FEATURE",
    path: `${SRC}/shared/server/rpc/router.ts`,
    source:
      'import { createProcedures } from "@/features/alpha/server";\nexport { createProcedures };\n',
    expectViolation: false,
  },
  {
    ruleId: "ARCH-FEATURE",
    path: `${SRC}/routes/index.tsx`,
    source: 'import { Page } from "@/features/alpha";\nexport { Page };\n',
    expectViolation: false,
  },
  {
    ruleId: "ARCH-CLIENT-SERVER",
    path: `${ALPHA}/client/hooks/use-greet.ts`,
    source: 'import { greet } from "@/features/alpha/server";\nexport { greet };\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-CLIENT-SERVER",
    path: `${ALPHA}/client/hooks/use-greet.ts`,
    source: 'import { type Dto } from "@/features/alpha/server";\nexport type { Dto };\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-CLIENT-SERVER",
    path: `${ALPHA}/client/api/queries.ts`,
    source: 'import * as server from "@/shared/server/rpc/router";\nexport { server };\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-CLIENT-SERVER",
    path: `${SRC}/shared/client/rpc-client.ts`,
    source: 'import "@/shared/server/composition-root";\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-CLIENT-SERVER",
    path: `${ALPHA}/index.ts`,
    source: 'export { createProcedures } from "@/features/alpha/server";\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-CLIENT-SERVER",
    path: `${ALPHA}/client/hooks/use-greet.ts`,
    source: 'import type { Dto } from "@/features/alpha/server";\nexport type { Dto };\n',
    expectViolation: false,
  },
  {
    ruleId: "ARCH-CLIENT-SERVER",
    path: `${SRC}/shared/client/rpc-client.ts`,
    source:
      'import type { AppRouter } from "@/shared/server/rpc/router";\nexport type { AppRouter };\n',
    expectViolation: false,
  },
  {
    ruleId: "ARCH-VENDOR",
    path: `${ALPHA}/server/application/upload.ts`,
    source: 'import { S3Client } from "@aws-sdk/client-s3";\nexport { S3Client };\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-VENDOR",
    path: `${ALPHA}/client/components/checkout.tsx`,
    source: 'import Stripe from "stripe";\nexport { Stripe };\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-VENDOR",
    path: `${ALPHA}/server/infrastructure/s3-storage.ts`,
    source: 'import { S3Client } from "@aws-sdk/client-s3";\nexport { S3Client };\n',
    expectViolation: false,
  },
  {
    ruleId: "ARCH-VENDOR",
    path: `${SRC}/shared/server/adapters/pg-pool.ts`,
    source: 'import { Pool } from "pg";\nexport { Pool };\n',
    expectViolation: false,
  },
  {
    ruleId: "ARCH-REEXPORT",
    path: `${ALPHA}/server/domain/index.ts`,
    source: 'export * from "@/features/alpha/server/domain/greeting";\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-REEXPORT",
    path: `${ALPHA}/client/components/index.ts`,
    source: 'export { Form } from "@/features/alpha/client/components/form";\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-REEXPORT",
    path: `${SRC}/shared/domain/index.ts`,
    source: 'export type { DomainError } from "@/shared/domain/errors";\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-REEXPORT",
    path: `${ALPHA}/index.ts`,
    source: 'export { Page } from "@/features/alpha/client/pages/page";\n',
    expectViolation: false,
  },
  {
    ruleId: "ARCH-REEXPORT",
    path: `${ALPHA}/testing.ts`,
    source: 'export { FixedClock } from "@/shared/server/adapters/fixed-clock";\n',
    expectViolation: false,
  },
  {
    ruleId: "ARCH-REEXPORT",
    path: `${ALPHA}/server/domain/greeting.ts`,
    source: "const greeting = 1;\nexport { greeting as defaultGreeting };\n",
    expectViolation: false,
  },
  {
    ruleId: "ARCH-RELATIVE",
    path: `${ALPHA}/server/application/greet.ts`,
    source: 'import { Name } from "../domain/name";\nexport { Name };\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-RELATIVE",
    path: `${SRC}/routes/index.tsx`,
    source: 'import { x } from "..";\nexport { x };\n',
    expectViolation: true,
  },
  {
    ruleId: "ARCH-RELATIVE",
    path: `${ALPHA}/server/domain/greeting.ts`,
    source: 'import { Name } from "./name";\nexport { Name };\n',
    expectViolation: false,
  },
];

let workspace = "";

/**
 * @param fixture - snippet to lint inside the temporary workspace
 * @returns the distinct architecture rule ids Biome reports for that single file
 */
function reportedRuleIds(fixture: RuleFixture): string[] {
  const file = join(workspace, fixture.path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, fixture.source);
  const result = spawnSync(
    BIOME_BIN,
    ["lint", "--vcs-enabled=false", "--max-diagnostics=none", "--colors=off", fixture.path],
    { cwd: workspace, encoding: "utf8" },
  );
  rmSync(file);
  const output = `${result.stdout}${result.stderr}`;
  return [...new Set(output.match(ARCH_ID_IN_OUTPUT))];
}

describe("architecture rules (Biome)", () => {
  beforeAll(() => {
    workspace = mkdtempSync(join(tmpdir(), "architecture-rules-"));
    cpSync(join(REPO_ROOT, "biome.jsonc"), join(workspace, "biome.jsonc"));
    cpSync(join(REPO_ROOT, "scripts", "biome"), join(workspace, "scripts", "biome"), {
      recursive: true,
    });
  });

  afterAll(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("has a violating and a compliant fixture for every lint rule", () => {
    expect(findRulesWithoutBothFixtures({ fixtures: FIXTURES, ruleIds: LINT_RULE_IDS })).toEqual(
      [],
    );
  });

  it.each(FIXTURES.filter((fixture) => fixture.expectViolation))(
    "$ruleId fires on $path: $source",
    (fixture) => {
      expect(reportedRuleIds(fixture)).toEqual([fixture.ruleId]);
    },
  );

  it.each(FIXTURES.filter((fixture) => !fixture.expectViolation))(
    "$ruleId accepts $path: $source",
    (fixture) => {
      expect(reportedRuleIds(fixture)).toEqual([]);
    },
  );
});
