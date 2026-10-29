import type { PersonName } from "@/features/greeting/server/domain/person-name";

/** A greeting computed for a person at a point in time. Immutable. */
export class Greeting {
  readonly id: string;
  readonly name: PersonName;
  readonly message: string;
  private readonly createdAtMs: number;

  private constructor(params: { id: string; name: PersonName; createdAt: Date }) {
    this.id = params.id;
    this.name = params.name;
    this.message = `Hello, ${params.name.value}!`;
    this.createdAtMs = params.createdAt.getTime();
    Object.freeze(this);
  }

  /**
   * Creates a greeting for `name`.
   *
   * @param params.id - identifier from the `IdGenerator` port
   * @param params.name - validated name
   * @param params.now - current time from the `Clock` port
   * @returns the new greeting
   */
  static create(params: { id: string; name: PersonName; now: Date }): Greeting {
    return new Greeting({ id: params.id, name: params.name, createdAt: params.now });
  }

  /** @returns a copy of the creation date, so callers cannot change the greeting */
  get createdAt(): Date {
    return new Date(this.createdAtMs);
  }
}
