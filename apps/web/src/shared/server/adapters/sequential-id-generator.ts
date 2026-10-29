import type { IdGenerator } from "@/shared/server/ports/id-generator";

/** Test twin of `IdGenerator`: returns `<prefix>-1`, `<prefix>-2`, … in order. */
export class SequentialIdGenerator implements IdGenerator {
  private count = 0;

  constructor(private readonly prefix = "id") {}

  next(): string {
    this.count += 1;
    return `${this.prefix}-${this.count}`;
  }
}
