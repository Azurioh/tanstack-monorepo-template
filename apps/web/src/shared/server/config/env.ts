import { z } from "zod";
import { ConfigurationError } from "@/shared/domain/errors";
import { LOG_LEVELS } from "@/shared/server/logging/logger";

/** Raw variables, usually `process.env`. */
type EnvSource = Readonly<Record<string, string | undefined>>;

/** One environment variable: its schema and the rule quoted when it is missing or invalid. */
interface EnvVariable {
  readonly schema: z.ZodType;
  readonly rule: string;
}

type EnvVariables = Readonly<Record<string, EnvVariable>>;

type EnvParseResult<T> =
  | { readonly success: true; readonly values: T }
  | { readonly success: false; readonly details: readonly string[] };

function blankAsUnset(value: unknown): unknown {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
}

/**
 * Variables read by one owner: the app itself or a feature. A feature declares its own spec in
 * its `server.ts`, so removing the feature removes its variables.
 */
export class EnvSpec<T> {
  private readonly schema: z.ZodObject;

  private constructor(private readonly variables: EnvVariables) {
    this.schema = z.object(
      Object.fromEntries(
        Object.entries(variables).map(([key, variable]) => [
          key,
          z.preprocess(blankAsUnset, variable.schema),
        ]),
      ),
    );
  }

  /**
   * @param variables - schema and rule of each variable, keyed by variable name; blank values
   *   count as unset
   * @returns the spec
   */
  static define<V extends EnvVariables>(
    variables: V,
  ): EnvSpec<{ [K in keyof V]: z.output<V[K]["schema"]> }> {
    return new EnvSpec(variables);
  }

  /** Names of the variables of this spec; `.env.example` must list them. */
  get keys(): readonly string[] {
    return Object.keys(this.variables);
  }

  /**
   * @param source - raw variables
   * @returns the parsed values, or `NAME (rule)` for each invalid variable, never its value
   */
  parse(source: EnvSource): EnvParseResult<T> {
    const result = this.schema.safeParse(source);
    if (result.success) {
      // The object schema is built from `variables`, whose outputs are exactly `T`.
      return { success: true, values: result.data as T };
    }
    const invalid = new Set(result.error.issues.map((issue) => issue.path[0]));
    const details = Object.entries(this.variables)
      .filter(([key]) => invalid.has(key))
      .map(([key, variable]) => `${key} (${variable.rule})`);
    return { success: false, details };
  }
}

/** Values described by an `EnvSpec`. */
export type EnvValues<S> = S extends EnvSpec<infer T> ? T : never;

/** App-wide variables; feature settings belong to each feature's own spec. */
export const appEnv = EnvSpec.define({
  LOG_LEVEL: { schema: z.enum(LOG_LEVELS).default("info"), rule: LOG_LEVELS.join(" | ") },
});

type FeatureEnvSpecs = Readonly<Record<string, EnvSpec<unknown>>>;

/**
 * Parses the app-wide variables and the variables of every feature from `source`, once at
 * startup. Throws a single `ConfigurationError` naming every invalid variable and its rule,
 * never its value.
 *
 * @param source - raw variables, usually `process.env`
 * @param features - each feature's spec, keyed by feature name
 * @returns the app values and each feature's values under the same key
 */
export function loadEnv<F extends FeatureEnvSpecs>(
  source: EnvSource,
  features: F,
): { app: EnvValues<typeof appEnv>; features: { [K in keyof F]: EnvValues<F[K]> } } {
  const app = appEnv.parse(source);
  const parsed = Object.entries(features).map(
    ([name, spec]) => [name, spec.parse(source)] as const,
  );
  const details = [app, ...parsed.map(([, result]) => result)].flatMap((result) =>
    result.success ? [] : result.details,
  );
  if (!app.success || details.length > 0) {
    throw new ConfigurationError({
      code: "ENV_INVALID",
      message: `Missing or invalid environment variables: ${details.join(", ")}`,
    });
  }
  const values = Object.fromEntries(
    parsed.map(([name, result]) => [name, result.success ? result.values : undefined]),
  );
  // Every feature parsed successfully, so `values` holds each feature's values under its key.
  return { app: app.values, features: values as { [K in keyof F]: EnvValues<F[K]> } };
}
