import type { Greeting } from "@/features/greeting/server/domain/greeting";

/** Storage of the greetings computed so far. */
export interface GreetingRepository {
  /** Stores a new greeting. */
  save(greeting: Greeting): Promise<void>;
  /**
   * @param limit - maximum number of greetings to return
   * @returns the most recent greetings first, at most `limit`
   */
  listRecent(limit: number): Promise<Greeting[]>;
}
