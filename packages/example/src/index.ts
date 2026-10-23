/**
 * Placeholder that keeps every workspace task non-empty until the first app lands.
 */
export function greet(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") {
    return "Hello, world!";
  }
  return `Hello, ${trimmed}!`;
}
