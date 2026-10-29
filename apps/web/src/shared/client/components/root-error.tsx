import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Link, useRouter } from "@tanstack/react-router";
import { StatusPage } from "@/shared/client/components/status-page";
import { appCopy } from "@/shared/client/copy";

/**
 * Root error boundary: replaces any route whose loader or render failed. The error itself is
 * never shown (it may carry internal details); retrying re-runs the loaders and resets the
 * boundary.
 */
export function RootError() {
  const router = useRouter();

  return (
    <StatusPage
      title={appCopy.error.title}
      actions={
        <>
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              void router.invalidate();
            }}
          >
            {appCopy.error.retry}
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/">{appCopy.home}</Link>
          </Button>
        </>
      }
    >
      <Alert variant="destructive">
        <AlertDescription>{appCopy.error.description}</AlertDescription>
      </Alert>
    </StatusPage>
  );
}
