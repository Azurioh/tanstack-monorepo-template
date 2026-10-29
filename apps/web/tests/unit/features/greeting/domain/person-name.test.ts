import { describe, expect, it } from "vitest";
import { GreetingError } from "@/features/greeting/server/domain/greeting-error";
import { PERSON_NAME_MAX_LENGTH, PersonName } from "@/features/greeting/server/domain/person-name";

function rejectionCode(raw: string): string {
  try {
    PersonName.create(raw);
  } catch (error) {
    if (error instanceof GreetingError) {
      return error.code;
    }
    throw error;
  }
  throw new Error(`Expected "${raw}" to be rejected`);
}

describe("PersonName", () => {
  it("keeps a valid name", () => {
    expect(PersonName.create("Ada").value).toBe("Ada");
  });

  it("trims surrounding whitespace before validating", () => {
    expect(PersonName.create("  Ada Lovelace \n").value).toBe("Ada Lovelace");
  });

  it("rejects an empty or whitespace-only name with NAME_EMPTY", () => {
    expect(rejectionCode("")).toBe("NAME_EMPTY");
    expect(rejectionCode(" \t\n ")).toBe("NAME_EMPTY");
  });

  it("accepts exactly the maximum length after trim", () => {
    const longest = "a".repeat(PERSON_NAME_MAX_LENGTH);

    expect(PersonName.create(`  ${longest}  `).value).toBe(longest);
  });

  it("rejects a name longer than the maximum with NAME_TOO_LONG", () => {
    expect(PERSON_NAME_MAX_LENGTH).toBe(50);
    expect(rejectionCode("a".repeat(PERSON_NAME_MAX_LENGTH + 1))).toBe("NAME_TOO_LONG");
  });

  it("rejects control characters with NAME_INVALID", () => {
    expect(rejectionCode("Ada\u0000")).toBe("NAME_INVALID");
    expect(rejectionCode("A\nda")).toBe("NAME_INVALID");
    expect(rejectionCode("Ada\u007f")).toBe("NAME_INVALID");
  });

  it("keeps markup characters as plain text", () => {
    expect(PersonName.create("<b>Ada</b>").value).toBe("<b>Ada</b>");
  });

  it("raises a validation error with an English log message", () => {
    try {
      PersonName.create("");
    } catch (error) {
      expect(error).toBeInstanceOf(GreetingError);
      expect(error).toMatchObject({ kind: "validation", code: "NAME_EMPTY" });
      expect((error as Error).message).toMatch(/empty/i);
      return;
    }
    throw new Error("Expected a GreetingError");
  });

  it("is immutable", () => {
    const name = PersonName.create("Ada");

    expect(Object.isFrozen(name)).toBe(true);
  });
});
