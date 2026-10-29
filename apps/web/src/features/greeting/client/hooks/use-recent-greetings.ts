import { useSuspenseQuery } from "@tanstack/react-query";
import { recentGreetingsQueryOptions } from "@/features/greeting/client/api/greeting-queries";
import type { GreetingListItem } from "@/features/greeting/client/components/greeting-list";
import type { GreetingDto } from "@/features/greeting/server";

function toListItem(greeting: GreetingDto): GreetingListItem {
  return { id: greeting.id, message: greeting.message };
}

/**
 * ViewModel of the recent greetings list; the route loader has already filled the cache.
 *
 * @returns the greetings to show, newest first
 */
export function useRecentGreetings(): { items: GreetingListItem[] } {
  const { data } = useSuspenseQuery(recentGreetingsQueryOptions());
  return { items: data.map(toListItem) };
}
