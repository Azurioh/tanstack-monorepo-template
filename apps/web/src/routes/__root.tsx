import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { RootError } from "@/shared/client/components/root-error";
import { RootNotFound } from "@/shared/client/components/root-not-found";
import stylesUrl from "@/styles.css?url";

/** Context available to every route loader. */
export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Starter App" },
    ],
    links: [{ rel: "stylesheet", href: stylesUrl }],
  }),
  component: Outlet,
  errorComponent: RootError,
  notFoundComponent: RootNotFound,
  shellComponent: RootDocument,
});

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
