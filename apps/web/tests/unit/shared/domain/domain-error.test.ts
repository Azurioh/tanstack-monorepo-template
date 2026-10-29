import { describe, expect, it } from "vitest";
import { ConfigurationError, DomainError, ValidationError } from "@/shared/domain/errors";

class SampleValidationError extends ValidationError {}

describe("DomainError", () => {
  it("carries a stable code, a kind and a log-only message", () => {
    const error = new SampleValidationError({
      code: "SAMPLE_INVALID",
      message: "Sample is invalid",
    });

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("SAMPLE_INVALID");
    expect(error.kind).toBe("validation");
    expect(error.message).toBe("Sample is invalid");
    expect(error.name).toBe("SampleValidationError");
  });

  it("classifies configuration errors", () => {
    const error = new ConfigurationError({
      code: "ENV_INVALID",
      message: "Environment is invalid",
    });

    expect(error.kind).toBe("configuration");
    expect(error.name).toBe("ConfigurationError");
  });

  it.each(["sample_invalid", "SampleInvalid", "SAMPLE-INVALID", "_SAMPLE", "SAMPLE_", ""])(
    "rejects the code %j that is not SCREAMING_SNAKE_CASE",
    (code) => {
      expect(() => new SampleValidationError({ code, message: "Sample is invalid" })).toThrow(
        /SCREAMING_SNAKE_CASE/,
      );
    },
  );
});
