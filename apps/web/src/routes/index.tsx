import { createFileRoute } from "@tanstack/react-router";
import { GreetingPage, recentGreetingsQueryOptions } from "@/features/greeting";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(recentGreetingsQueryOptions());
  },
  component: GreetingPage,
});
