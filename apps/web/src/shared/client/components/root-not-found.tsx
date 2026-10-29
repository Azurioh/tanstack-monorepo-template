import { Button } from "@repo/ui/components/button";
import { Link } from "@tanstack/react-router";
import { StatusPage } from "@/shared/client/components/status-page";
import { appCopy } from "@/shared/client/copy";

/** Page shown for any URL no route matches. */
export function RootNotFound() {
  return (
    <StatusPage
      title={appCopy.notFound.title}
      actions={
        <Button asChild className="w-full sm:w-auto">
          <Link to="/">{appCopy.home}</Link>
        </Button>
      }
    >
      <p className="text-muted-foreground">{appCopy.notFound.description}</p>
    </StatusPage>
  );
}
