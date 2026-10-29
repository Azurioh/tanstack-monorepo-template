import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { type FormEvent, useId } from "react";
import { greetingCopy } from "@/features/greeting/client/copy";

/** Props of the greeting form View. */
export interface GreetingFormProps {
  name: string;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  /** Message about the name field, linked to the input. */
  fieldError: string | null;
  /** Message about the request as a whole, announced as an alert. */
  formError: string | null;
  greetingMessage: string | null;
}

/**
 * Name field, submit button, errors and the latest greeting. Renders props only; all strings are
 * rendered as text.
 */
export function GreetingForm(props: GreetingFormProps) {
  const inputId = useId();
  const fieldErrorId = useId();
  const hasFieldError = props.fieldError !== null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    props.onSubmit();
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={inputId}>{greetingCopy.form.nameLabel}</Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id={inputId}
            name="name"
            autoComplete="given-name"
            value={props.name}
            onChange={(event) => props.onNameChange(event.target.value)}
            aria-invalid={hasFieldError}
            aria-describedby={hasFieldError ? fieldErrorId : undefined}
          />
          <Button
            type="submit"
            disabled={!props.canSubmit}
            aria-busy={props.isSubmitting}
            className="w-full sm:w-auto"
          >
            {props.isSubmitting ? greetingCopy.form.submitting : greetingCopy.form.submit}
          </Button>
        </div>
        {hasFieldError && (
          <p id={fieldErrorId} role="alert" className="text-sm text-destructive">
            {props.fieldError}
          </p>
        )}
      </div>
      {props.formError !== null && (
        <Alert variant="destructive">
          <AlertDescription>{props.formError}</AlertDescription>
        </Alert>
      )}
      <p role="status" className="text-lg font-semibold break-words empty:-mt-4">
        {props.greetingMessage}
      </p>
    </form>
  );
}
