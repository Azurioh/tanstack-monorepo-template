import {
  type GreetingDto,
  toGreetingDto,
} from "@/features/greeting/server/application/greeting-dto";
import type { GreetingRepository } from "@/features/greeting/server/application/ports/greeting-repository";
import { Greeting } from "@/features/greeting/server/domain/greeting";
import { PersonName } from "@/features/greeting/server/domain/person-name";
import type { Clock } from "@/shared/server/ports/clock";
import type { IdGenerator } from "@/shared/server/ports/id-generator";

/** Greets a person by name and records the greeting. */
export class GreetUseCase {
  constructor(
    private readonly deps: { greetings: GreetingRepository; clock: Clock; ids: IdGenerator },
  ) {}

  /**
   * @param input.name - the name as submitted
   * @returns the recorded greeting
   * @throws GreetingError when the name breaks a rule; nothing is recorded then
   */
  async execute(input: { name: string }): Promise<GreetingDto> {
    const greeting = Greeting.create({
      id: this.deps.ids.next(),
      name: PersonName.create(input.name),
      now: this.deps.clock.now(),
    });
    await this.deps.greetings.save(greeting);
    return toGreetingDto(greeting);
  }
}
