import type { Clock } from "@/shared/server/ports/clock";

/** Test twin of `Clock`: always returns the same instant. */
export class FixedClock implements Clock {
  private readonly instant: number;

  constructor(instant: Date) {
    this.instant = instant.getTime();
  }

  now(): Date {
    return new Date(this.instant);
  }
}
