import type { Clock } from "@/shared/server/ports/clock";

/** Clock backed by the system time. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
