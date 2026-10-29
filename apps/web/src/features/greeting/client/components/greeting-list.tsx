import { greetingCopy } from "@/features/greeting/client/copy";

/** One greeting as the list shows it. */
export interface GreetingListItem {
  id: string;
  message: string;
}

/** Recent greetings, in the given order, or an empty state. Messages are rendered as text. */
export function GreetingList(props: { items: readonly GreetingListItem[] }) {
  if (props.items.length === 0) {
    return <p className="text-sm text-muted-foreground">{greetingCopy.recent.empty}</p>;
  }
  return (
    <ol className="flex flex-col divide-y divide-border">
      {props.items.map((item) => (
        <li key={item.id} className="py-3 break-words first:pt-0 last:pb-0">
          {item.message}
        </li>
      ))}
    </ol>
  );
}
