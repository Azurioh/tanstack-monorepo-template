import { describe, expect, it } from "vitest";
import {
  diffStates,
  isManaged,
  managedHeader,
  planSync,
  renderManagedCopy,
} from "../src/agent-rules.js";

const VERSION = "1.2.0";
const NEXT_VERSION = "1.3.0";
const ERRORS_RULE = "# Errors\n\n- No silent error.\n";
const UI_RULE = "# UI\n\n- shadcn first.\n";
const PROJECT_NOTE = "# Project note\n\nOwned by this repository.\n";

function managed(content: string): string {
  return renderManagedCopy({ content, version: VERSION });
}

/** Applies a plan the way `sync` does, so the resulting state can be asserted with diffStates. */
function applyPlan(params: {
  shipped: ReadonlyMap<string, string>;
  local: ReadonlyMap<string, string>;
  version: string;
}): Map<string, string> {
  const { shipped, local, version } = params;
  const plan = planSync({ shipped, local, version });
  const result = new Map(local);
  for (const [name, content] of shipped) {
    if (plan.write.includes(name)) {
      result.set(name, renderManagedCopy({ content, version }));
    }
  }
  for (const name of plan.remove) {
    result.delete(name);
  }
  return result;
}

describe("managedHeader", () => {
  it("names the package version and the command to run", () => {
    expect(managedHeader(VERSION)).toBe(
      "<!-- managed by @azurioh/arch-rules@1.2.0: edit upstream, run arch-rules sync -->",
    );
  });
});

describe("isManaged", () => {
  it("accepts a managed header of any version", () => {
    expect(isManaged(managedHeader(VERSION))).toBe(true);
    expect(isManaged(managedHeader("2.0.0-rc.1"))).toBe(true);
  });

  it.each([
    ["an ordinary heading", "# Project note"],
    ["an empty line", ""],
    ["a header with trailing text", `${managedHeader(VERSION)} edited`],
    [
      "a header with no version",
      "<!-- managed by @azurioh/arch-rules@: edit upstream, run arch-rules sync -->",
    ],
    [
      "another package's header",
      "<!-- managed by @acme/rules@1.0.0: edit upstream, run arch-rules sync -->",
    ],
  ])("rejects %s", (_name, line) => {
    expect(isManaged(line)).toBe(false);
  });
});

describe("renderManagedCopy", () => {
  it("puts the managed header on line 1, then the shipped content unchanged", () => {
    expect(managed(ERRORS_RULE)).toBe(`${managedHeader(VERSION)}\n${ERRORS_RULE}`);
  });
});

describe("planSync", () => {
  const shipped = new Map([
    ["errors", ERRORS_RULE],
    ["ui", UI_RULE],
  ]);

  it("writes every shipped file into an empty folder", () => {
    expect(planSync({ shipped, local: new Map(), version: VERSION })).toEqual({
      write: ["errors", "ui"],
      remove: [],
    });
  });

  it("plans nothing when every copy is in sync", () => {
    const local = new Map([
      ["errors", managed(ERRORS_RULE)],
      ["ui", managed(UI_RULE)],
    ]);
    expect(planSync({ shipped, local, version: VERSION })).toEqual({ write: [], remove: [] });
  });

  it("rewrites a hand-edited copy", () => {
    const local = new Map([
      ["errors", `${managed(ERRORS_RULE)}- A local addition.\n`],
      ["ui", managed(UI_RULE)],
    ]);
    expect(planSync({ shipped, local, version: VERSION })).toEqual({
      write: ["errors"],
      remove: [],
    });
  });

  it("rewrites every copy after a version bump that only changes the header", () => {
    const local = new Map([
      ["errors", managed(ERRORS_RULE)],
      ["ui", managed(UI_RULE)],
    ]);
    expect(planSync({ shipped, local, version: NEXT_VERSION })).toEqual({
      write: ["errors", "ui"],
      remove: [],
    });
  });

  it("removes a managed copy the package no longer ships", () => {
    const local = new Map([
      ["errors", managed(ERRORS_RULE)],
      ["ui", managed(UI_RULE)],
      ["legacy", managed("# Legacy\n")],
    ]);
    expect(planSync({ shipped, local, version: VERSION })).toEqual({
      write: [],
      remove: ["legacy"],
    });
  });

  it("never touches a file without the managed header", () => {
    const local = new Map([
      ["errors", managed(ERRORS_RULE)],
      ["ui", managed(UI_RULE)],
      ["project-note", PROJECT_NOTE],
    ]);
    expect(planSync({ shipped, local, version: VERSION })).toEqual({ write: [], remove: [] });
  });

  it("never overwrites a project-owned file that has the name of a shipped rule", () => {
    const local = new Map([
      ["errors", PROJECT_NOTE],
      ["ui", managed(UI_RULE)],
    ]);
    expect(planSync({ shipped, local, version: VERSION })).toEqual({ write: [], remove: [] });
  });
});

describe("diffStates", () => {
  const shipped = new Map([
    ["errors", ERRORS_RULE],
    ["ui", UI_RULE],
  ]);
  const inSync = new Map([
    ["errors", managed(ERRORS_RULE)],
    ["ui", managed(UI_RULE)],
  ]);

  it("reports nothing when every copy is in sync", () => {
    expect(diffStates({ shipped, local: inSync, version: VERSION })).toEqual([]);
  });

  it("reports a hand edit as differs", () => {
    const local = new Map(inSync).set("ui", `${managed(UI_RULE)}- A local addition.\n`);
    expect(diffStates({ shipped, local, version: VERSION })).toEqual([
      { name: "ui", state: "differs" },
    ]);
  });

  it("reports a deleted copy as missing", () => {
    const local = new Map(inSync);
    local.delete("errors");
    expect(diffStates({ shipped, local, version: VERSION })).toEqual([
      { name: "errors", state: "missing" },
    ]);
  });

  it("reports changed, new and removed rules after an upgrade without sync", () => {
    const upgraded = new Map([
      ["errors", `${ERRORS_RULE}- Log once.\n`],
      ["arch-enforcement", "# Enforcement\n"],
    ]);
    expect(diffStates({ shipped: upgraded, local: inSync, version: NEXT_VERSION })).toEqual([
      { name: "arch-enforcement", state: "missing" },
      { name: "errors", state: "differs" },
      { name: "ui", state: "stale" },
    ]);
  });

  it("reports an unchanged rule as differs when only the version moved", () => {
    expect(diffStates({ shipped, local: inSync, version: NEXT_VERSION })).toEqual([
      { name: "errors", state: "differs" },
      { name: "ui", state: "differs" },
    ]);
  });

  it("gives a file without the managed header no state", () => {
    const local = new Map(inSync).set("project-note", PROJECT_NOTE);
    expect(diffStates({ shipped, local, version: VERSION })).toEqual([]);
  });

  it("reports a shipped rule shadowed by a project-owned file as missing", () => {
    const local = new Map(inSync).set("errors", PROJECT_NOTE);
    expect(diffStates({ shipped, local, version: VERSION })).toEqual([
      { name: "errors", state: "missing" },
    ]);
  });

  it("is clean after a sync, from every starting state", () => {
    const local = new Map([
      ["errors", `${managed(ERRORS_RULE)}- A local addition.\n`],
      ["legacy", managed("# Legacy\n")],
      ["project-note", PROJECT_NOTE],
    ]);
    const synced = applyPlan({ shipped, local, version: NEXT_VERSION });
    expect(diffStates({ shipped, local: synced, version: NEXT_VERSION })).toEqual([]);
    expect(synced.get("project-note")).toBe(PROJECT_NOTE);
    expect(synced.has("legacy")).toBe(false);
  });
});
