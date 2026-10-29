import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import type { ReactNode } from "react";

/**
 * Full-page message shown instead of a route: a title, a body and the actions that get the user
 * out of it.
 *
 * @param props.title - page heading (the page's only `h1`)
 * @param props.children - message body
 * @param props.actions - buttons or links, stacked on phones and in a row from `sm`
 */
export function StatusPage(
  props: Readonly<{ title: string; children: ReactNode; actions: ReactNode }>,
) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col px-4 py-10 sm:py-16">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{props.title}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {props.children}
          <div className="flex flex-col gap-3 sm:flex-row">{props.actions}</div>
        </CardContent>
      </Card>
    </main>
  );
}
