import type { IdGenerator } from "@/shared/server/ports/id-generator";

/** Id generator returning random UUID v4 values. */
export class RandomIdGenerator implements IdGenerator {
  next(): string {
    return crypto.randomUUID();
  }
}
