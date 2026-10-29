import type { Greeting } from "@/features/greeting/server/domain/greeting";

/** The only greeting shape that crosses the transport boundary. */
export interface GreetingDto {
  id: string;
  name: string;
  message: string;
  /** ISO 8601 */
  createdAt: string;
}

/**
 * @param greeting - the entity to expose
 * @returns its transport representation
 */
export function toGreetingDto(greeting: Greeting): GreetingDto {
  return {
    id: greeting.id,
    name: greeting.name.value,
    message: greeting.message,
    createdAt: greeting.createdAt.toISOString(),
  };
}
