import type { GreetingRepository } from "@/features/greeting/server/application/ports/greeting-repository";
import type { Greeting } from "@/features/greeting/server/domain/greeting";

/** `GreetingRepository` kept in process memory; contents are lost on restart. */
export class InMemoryGreetingRepository implements GreetingRepository {
  /** Newest first. */
  private greetings: readonly Greeting[] = [];

  async save(greeting: Greeting): Promise<void> {
    this.greetings = [greeting, ...this.greetings];
  }

  async listRecent(limit: number): Promise<Greeting[]> {
    return this.greetings.slice(0, limit);
  }
}
