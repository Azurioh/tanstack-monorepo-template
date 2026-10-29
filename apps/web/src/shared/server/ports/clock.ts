/** Source of the current time; injected so business code stays deterministic in tests. */
export interface Clock {
  now(): Date;
}
