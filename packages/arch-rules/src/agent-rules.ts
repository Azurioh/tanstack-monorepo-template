/**
 * Agent-rule copies written by `arch-rules sync` into `.claude/rules/arch-rules/`.
 *
 * Every function takes rule names (the file basename without `.md`) mapped to text:
 * - `shipped`: the raw content of each `rules/<name>.md` in the installed package;
 * - `local`: the full text of each local copy, managed header line included.
 *
 * A local copy is in sync when it equals `renderManagedCopy` of the shipped content for the
 * installed version, byte for byte: a version bump alone makes it `differs` (data-model.md,
 * "bytes differ"). A local file whose first line is not a managed header is project-owned and
 * has no state (FR-008): it is never planned for a write or a removal, and never reported.
 */

const HEADER_PREFIX = "<!-- managed by @azurioh/arch-rules@";
const HEADER_SUFFIX = ": edit upstream, run arch-rules sync -->";
const HEADER_PATTERN =
  /^<!-- managed by @azurioh\/arch-rules@[^\s:]+: edit upstream, run arch-rules sync -->$/;
const LINE_BREAK = "\n";

/** Rule texts of the installed package and of the local folder, keyed by rule name. */
interface AgentRuleSources {
  readonly shipped: ReadonlyMap<string, string>;
  readonly local: ReadonlyMap<string, string>;
  /** Installed package version, written into the managed header. */
  readonly version: string;
}

/** Rule names `sync` writes (missing or differing copies) and removes (stale copies). */
interface SyncPlan {
  readonly write: readonly string[];
  readonly remove: readonly string[];
}

/** One out-of-sync rule, printed by `check` as `<state> .claude/rules/arch-rules/<name>.md`. */
interface AgentRuleProblem {
  readonly name: string;
  readonly state: "differs" | "missing" | "stale";
}

/**
 * @param version - installed package version
 * @returns the line 1 every managed copy starts with
 */
export function managedHeader(version: string): string {
  return `${HEADER_PREFIX}${version}${HEADER_SUFFIX}`;
}

/**
 * @param firstLine - line 1 of a local file, without its line break
 * @returns true when the line is a managed header, whatever the version it names
 */
export function isManaged(firstLine: string): boolean {
  return HEADER_PATTERN.test(firstLine);
}

/**
 * @param params.content - raw content of the shipped `rules/<name>.md`
 * @param params.version - installed package version
 * @returns the text `sync` writes: the managed header on line 1, then the content unchanged
 */
export function renderManagedCopy(params: { content: string; version: string }): string {
  return `${managedHeader(params.version)}${LINE_BREAK}${params.content}`;
}

function hasManagedHeader(text: string): boolean {
  const [firstLine = ""] = text.split(LINE_BREAK, 1);
  return isManaged(firstLine);
}

/** Local copies carrying a managed header; project-owned files are left out (FR-008). */
function managedCopies(local: ReadonlyMap<string, string>): Map<string, string> {
  return new Map([...local].filter(([, text]) => hasManagedHeader(text)));
}

/** Names of local files without a managed header: never touched, even on a name collision. */
function projectOwnedNames(local: ReadonlyMap<string, string>): Set<string> {
  return new Set([...local].filter(([, text]) => !hasManagedHeader(text)).map(([name]) => name));
}

/**
 * @param sources - shipped rules, local copies and the installed version
 * @returns every rule that is not in sync, sorted by name; empty when the folder is in sync
 */
export function diffStates(sources: AgentRuleSources): AgentRuleProblem[] {
  const { shipped, version } = sources;
  const managed = managedCopies(sources.local);
  const problems: AgentRuleProblem[] = [];
  for (const [name, content] of shipped) {
    const copy = managed.get(name);
    if (copy === undefined) {
      problems.push({ name, state: "missing" });
    } else if (copy !== renderManagedCopy({ content, version })) {
      problems.push({ name, state: "differs" });
    }
  }
  for (const name of managed.keys()) {
    if (!shipped.has(name)) {
      problems.push({ name, state: "stale" });
    }
  }
  return problems.toSorted((left, right) => left.name.localeCompare(right.name));
}

/**
 * A shipped rule whose name is taken by a project-owned file stays `missing` and is not
 * written: FR-008 wins, and `check` keeps reporting the collision until the file is renamed.
 *
 * @param sources - shipped rules, local copies and the installed version
 * @returns the names to write and to remove, each sorted; both empty when the folder is in sync
 */
export function planSync(sources: AgentRuleSources): SyncPlan {
  const projectOwned = projectOwnedNames(sources.local);
  const problems = diffStates(sources);
  const write = problems
    .filter((problem) => problem.state !== "stale" && !projectOwned.has(problem.name))
    .map((problem) => problem.name);
  const remove = problems
    .filter((problem) => problem.state === "stale")
    .map((problem) => problem.name);
  return { write, remove };
}
