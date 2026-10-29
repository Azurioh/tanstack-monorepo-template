import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { useId } from "react";
import { GreetingForm } from "@/features/greeting/client/components/greeting-form";
import { GreetingList } from "@/features/greeting/client/components/greeting-list";
import { greetingCopy } from "@/features/greeting/client/copy";
import { useGreetingForm } from "@/features/greeting/client/hooks/use-greeting-form";
import { useRecentGreetings } from "@/features/greeting/client/hooks/use-recent-greetings";

/** Page of the greeting demo: the form and the recent greetings. */
export function GreetingPage() {
  const form = useGreetingForm();
  const recent = useRecentGreetings();
  const recentTitleId = useId();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10 sm:py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {greetingCopy.page.title}
        </h1>
        <p className="text-muted-foreground">{greetingCopy.page.description}</p>
      </header>
      <Card>
        <CardContent>
          <GreetingForm {...form} />
        </CardContent>
      </Card>
      <section aria-labelledby={recentTitleId}>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 id={recentTitleId}>{greetingCopy.recent.title}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GreetingList items={recent.items} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
