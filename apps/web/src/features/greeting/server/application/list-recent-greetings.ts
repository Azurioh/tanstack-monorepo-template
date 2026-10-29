import {
  type GreetingDto,
  toGreetingDto,
} from "@/features/greeting/server/application/greeting-dto";
import type { GreetingRepository } from "@/features/greeting/server/application/ports/greeting-repository";

/** Lists the latest greetings, newest first, up to the configured history limit. */
export class ListRecentGreetingsUseCase {
  constructor(private readonly deps: { greetings: GreetingRepository; historyLimit: number }) {}

  /** @returns at most `historyLimit` greetings, newest first */
  async execute(): Promise<GreetingDto[]> {
    const greetings = await this.deps.greetings.listRecent(this.deps.historyLimit);
    return greetings.map(toGreetingDto);
  }
}
