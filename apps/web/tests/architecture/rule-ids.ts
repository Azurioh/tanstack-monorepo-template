/** Every architecture rule id of specs/002-starter-app/contracts/architecture-rules.md. */
export const ARCHITECTURE_RULE_IDS = [
  "ARCH-LAYER",
  "ARCH-FEATURE",
  "ARCH-CLIENT-SERVER",
  "ARCH-VENDOR",
  "ARCH-REEXPORT",
  "ARCH-RELATIVE",
  "ARCH-LAYOUT",
] as const;

export type ArchitectureRuleId = (typeof ARCHITECTURE_RULE_IDS)[number];

/** Rule enforced by the layout test instead of Biome. */
export const LAYOUT_RULE_ID: ArchitectureRuleId = "ARCH-LAYOUT";

/** A snippet written at `path` that must trigger `ruleId` if and only if `expectViolation`. */
export interface RuleFixture {
  readonly ruleId: ArchitectureRuleId;
  readonly path: string;
  readonly source: string;
  readonly expectViolation: boolean;
}

/**
 * @param params.fixtures - fixtures of the rules a test covers
 * @param params.ruleIds - rule ids that test is responsible for
 * @returns the rule ids that lack a violating or a compliant fixture
 */
export function findRulesWithoutBothFixtures(params: {
  fixtures: readonly RuleFixture[];
  ruleIds: readonly ArchitectureRuleId[];
}): ArchitectureRuleId[] {
  return params.ruleIds.filter((ruleId) => !hasBothFixtures({ fixtures: params.fixtures, ruleId }));
}

function hasBothFixtures(params: {
  fixtures: readonly RuleFixture[];
  ruleId: ArchitectureRuleId;
}): boolean {
  const own = params.fixtures.filter((fixture) => fixture.ruleId === params.ruleId);
  const hasViolating = own.some((fixture) => fixture.expectViolation);
  const hasCompliant = own.some((fixture) => !fixture.expectViolation);
  return hasViolating && hasCompliant;
}
