import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ConfigurationError } from "@/shared/domain/errors";
import { appEnv, EnvSpec, loadEnv } from "@/shared/server/config/env";

const sampleEnv = EnvSpec.define({
  SAMPLE_SIZE: { schema: z.string().regex(/^\d+$/).transform(Number), rule: "integer" },
});

function invalidEnv(message: string) {
  return expect.objectContaining({
    code: "ENV_INVALID",
    message: expect.stringContaining(message),
  });
}

describe("loadEnv", () => {
  it("parses the app variables and each feature's variables", () => {
    expect(loadEnv({ LOG_LEVEL: "warn", SAMPLE_SIZE: "3" }, { sample: sampleEnv })).toEqual({
      app: { LOG_LEVEL: "warn" },
      features: { sample: { SAMPLE_SIZE: 3 } },
    });
  });

  it("defaults LOG_LEVEL to info when it is missing or blank", () => {
    expect(loadEnv({}, {}).app.LOG_LEVEL).toBe("info");
    expect(loadEnv({ LOG_LEVEL: "  " }, {}).app.LOG_LEVEL).toBe("info");
  });

  it("ignores variables outside the specs", () => {
    expect(loadEnv({ LOG_LEVEL: "warn", PATH: "/usr/bin" }, {})).toEqual({
      app: { LOG_LEVEL: "warn" },
      features: {},
    });
  });

  it("rejects an unknown LOG_LEVEL with a configuration error", () => {
    const load = () => loadEnv({ LOG_LEVEL: "verbose" }, {});

    expect(load).toThrow(ConfigurationError);
    expect(load).toThrow(invalidEnv("LOG_LEVEL (debug | info | warn | error)"));
  });

  it("treats a blank feature variable as missing", () => {
    expect(() => loadEnv({ SAMPLE_SIZE: " " }, { sample: sampleEnv })).toThrow(
      invalidEnv("SAMPLE_SIZE (integer)"),
    );
  });

  it("names every invalid variable, app and features, in one error", () => {
    const load = () => loadEnv({ LOG_LEVEL: "loud", SAMPLE_SIZE: "x" }, { sample: sampleEnv });

    expect(load).toThrow(invalidEnv("LOG_LEVEL"));
    expect(load).toThrow(invalidEnv("SAMPLE_SIZE"));
  });

  it("never echoes the invalid values", () => {
    expect(() => loadEnv({ SAMPLE_SIZE: "secret-value" }, { sample: sampleEnv })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("secret-value") }),
    );
  });
});

const featureEntries: Record<string, Record<string, unknown>> = import.meta.glob(
  "/src/features/*/server.ts",
  { eager: true },
);

function featureEnvKeys(): string[] {
  return Object.values(featureEntries)
    .flatMap((entry) => Object.values(entry))
    .filter((value) => value instanceof EnvSpec)
    .flatMap((spec) => spec.keys);
}

describe(".env.example", () => {
  it("lists exactly the app variables and those of every feature", () => {
    const content = readFileSync(new URL("../../../../../.env.example", import.meta.url), "utf8");
    const keys = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"))
      .map((line) => line.split("=")[0]);

    expect(keys.toSorted()).toEqual([...appEnv.keys, ...featureEnvKeys()].toSorted());
  });
});
