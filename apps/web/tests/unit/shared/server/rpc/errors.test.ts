import { createRouterClient, ORPCError } from "@orpc/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ConfigurationError, ValidationError } from "@/shared/domain/errors";
import { FixedClock } from "@/shared/server/adapters/fixed-clock";
import { SequentialIdGenerator } from "@/shared/server/adapters/sequential-id-generator";
import { createLogger } from "@/shared/server/logging/logger";
import { baseProcedure, type RpcContext } from "@/shared/server/rpc/context";

class SampleRejectedError extends ValidationError {
  constructor() {
    super({ code: "SAMPLE_REJECTED", message: "Sample rejected by a business rule" });
  }
}

const testRouter = {
  rejects: baseProcedure.handler(() => {
    throw new SampleRejectedError();
  }),
  misconfigured: baseProcedure.handler(() => {
    throw new ConfigurationError({ code: "SAMPLE_MISCONFIGURED", message: "internal detail" });
  }),
  crashes: baseProcedure.handler(() => {
    throw new Error("database password is hunter2");
  }),
  validates: baseProcedure.input(z.object({ name: z.string().min(1) })).handler(() => "ok"),
  validatesWithCode: baseProcedure
    .input(z.object({ name: z.string().min(1, { error: "SAMPLE_EMPTY" }) }))
    .handler(() => "ok"),
  succeeds: baseProcedure.handler(() => "ok"),
};

function setup() {
  const lines: string[] = [];
  const context: RpcContext = {
    logger: createLogger({
      level: "debug",
      clock: new FixedClock(new Date("2026-01-15T10:00:00.000Z")),
      write: (line) => lines.push(line),
    }),
    referenceIds: new SequentialIdGenerator("ref"),
  };
  const client = createRouterClient(testRouter, { context });
  const logs = () => lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  return { client, logs };
}

async function rejection(promise: Promise<unknown>): Promise<ORPCError<string, unknown>> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  if (!(error instanceof ORPCError)) {
    throw new Error(`Expected an ORPCError, got ${String(error)}`);
  }
  return error;
}

describe("RPC error mapping", () => {
  it("maps a business error to BAD_REQUEST with its code only", async () => {
    const { client, logs } = setup();

    const error = await rejection(client.rejects());

    expect(error.code).toBe("BAD_REQUEST");
    expect(error.data).toEqual({ code: "SAMPLE_REJECTED" });
    expect(error.message).not.toContain("business rule");
    expect(logs().filter((entry) => entry.level === "error")).toEqual([]);
  });

  it("maps an unexpected error to INTERNAL_SERVER_ERROR with a reference id, logged once", async () => {
    const { client, logs } = setup();

    const error = await rejection(client.crashes());

    expect(error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(error.data).toEqual({ referenceId: "ref-1" });
    expect(error.message).not.toContain("hunter2");
    expect(logs()).toHaveLength(1);
    expect(logs()[0]).toMatchObject({
      level: "error",
      referenceId: "ref-1",
      error: { message: "database password is hunter2" },
    });
  });

  it("treats a configuration error as unexpected", async () => {
    const { client, logs } = setup();

    const error = await rejection(client.misconfigured());

    expect(error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(error.data).toEqual({ referenceId: "ref-1" });
    expect(logs()[0]).toMatchObject({ level: "error", referenceId: "ref-1" });
  });

  it("passes oRPC errors such as input validation through unchanged", async () => {
    const { client, logs } = setup();

    const error = await rejection(client.validates({ name: "" }));

    expect(error.code).toBe("BAD_REQUEST");
    expect(error.message).toBe("Input validation failed");
    expect(logs()).toEqual([]);
  });

  it("maps an input issue whose message is a business code to BAD_REQUEST with that code", async () => {
    const { client, logs } = setup();

    const error = await rejection(client.validatesWithCode({ name: "" }));

    expect(error.code).toBe("BAD_REQUEST");
    expect(error.data).toEqual({ code: "SAMPLE_EMPTY" });
    expect(logs()).toEqual([]);
  });

  it("returns successful results untouched", async () => {
    const { client } = setup();

    await expect(client.succeeds()).resolves.toBe("ok");
  });
});
