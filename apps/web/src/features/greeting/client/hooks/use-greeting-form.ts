import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ActionDispatch, useCallback, useReducer, useRef } from "react";
import { type GreetFailure, toGreetFailure } from "@/features/greeting/client/api/greet-failure";
import {
  greetMutationOptions,
  recentGreetingsKey,
} from "@/features/greeting/client/api/greeting-queries";
import type { GreetingFormProps } from "@/features/greeting/client/components/greeting-form";
import { greetingCopy } from "@/features/greeting/client/copy";
import { greetInputSchema } from "@/features/greeting/schemas";
import type { GreetingDto, GreetingErrorCode } from "@/features/greeting/server";

type Phase =
  | { status: "idle" }
  | { status: "invalid"; code: string }
  | { status: "submitting" }
  | { status: "succeeded"; message: string }
  | { status: "failed"; failure: GreetFailure };

/** Form lifecycle: `idle → invalid | submitting → succeeded | failed`. */
type GreetingFormStatus = Phase["status"];

interface FormState {
  name: string;
  /** Id of the latest submission; results of earlier ones are ignored. */
  latestSubmission: number;
  phase: Phase;
}

type FormAction =
  | { type: "nameChanged"; name: string }
  | { type: "rejected"; submission: number; code: string }
  | { type: "submitted"; submission: number }
  | { type: "succeeded"; submission: number; message: string }
  | { type: "failed"; submission: number; failure: GreetFailure };

const INITIAL_STATE: FormState = { name: "", latestSubmission: 0, phase: { status: "idle" } };

function reduce(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "nameChanged": {
      const phase: Phase = state.phase.status === "invalid" ? { status: "idle" } : state.phase;
      return { ...state, name: action.name, phase };
    }
    case "rejected":
      return {
        ...state,
        latestSubmission: action.submission,
        phase: { status: "invalid", code: action.code },
      };
    case "submitted":
      return { ...state, latestSubmission: action.submission, phase: { status: "submitting" } };
    case "succeeded":
      if (action.submission !== state.latestSubmission) {
        return state;
      }
      return { ...state, phase: { status: "succeeded", message: action.message } };
    case "failed":
      if (action.submission !== state.latestSubmission) {
        return state;
      }
      return { ...state, phase: { status: "failed", failure: action.failure } };
  }
}

function isGreetingErrorCode(code: string): code is GreetingErrorCode {
  return Object.hasOwn(greetingCopy.errors, code);
}

function copyForCode(code: string): string {
  if (isGreetingErrorCode(code)) {
    return greetingCopy.errors[code];
  }
  return greetingCopy.unexpected;
}

function fieldErrorOf(phase: Phase): string | null {
  if (phase.status === "invalid") {
    return copyForCode(phase.code);
  }
  if (phase.status === "failed" && phase.failure.kind === "rejected") {
    return copyForCode(phase.failure.code);
  }
  return null;
}

function formErrorOf(phase: Phase): string | null {
  if (phase.status !== "failed" || phase.failure.kind !== "unexpected") {
    return null;
  }
  if (phase.failure.referenceId === null) {
    return greetingCopy.unexpected;
  }
  return greetingCopy.unexpectedWithReference(phase.failure.referenceId);
}

async function submitGreeting(params: {
  name: string;
  submission: number;
  greet: (input: { name: string }) => Promise<GreetingDto>;
  dispatch: ActionDispatch<[FormAction]>;
}): Promise<void> {
  const parsed = greetInputSchema.safeParse({ name: params.name });
  if (!parsed.success) {
    const code = parsed.error.issues[0]?.message ?? "";
    params.dispatch({ type: "rejected", submission: params.submission, code });
    return;
  }
  params.dispatch({ type: "submitted", submission: params.submission });
  try {
    const greeting = await params.greet(parsed.data);
    params.dispatch({
      type: "succeeded",
      submission: params.submission,
      message: greeting.message,
    });
  } catch (error) {
    params.dispatch({
      type: "failed",
      submission: params.submission,
      failure: toGreetFailure(error),
    });
  }
}

/** What the greeting form View needs, plus the lifecycle status. */
export type GreetingFormViewModel = GreetingFormProps & { status: GreetingFormStatus };

/**
 * ViewModel of the greeting form. Validates with the shared schema before any call (no request
 * while the name is invalid), submits through a mutation, refreshes the recent list on success
 * and applies only the latest submission's result.
 *
 * @returns the form state and intent callbacks for `GreetingForm`
 */
export function useGreetingForm(): GreetingFormViewModel {
  const [state, dispatch] = useReducer(reduce, INITIAL_STATE);
  const queryClient = useQueryClient();
  const submissions = useRef(0);
  const { mutateAsync } = useMutation({
    ...greetMutationOptions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recentGreetingsKey() }),
  });

  const onNameChange = useCallback((name: string) => {
    dispatch({ type: "nameChanged", name });
  }, []);

  const canSubmit = state.phase.status !== "invalid";
  const onSubmit = useCallback(() => {
    if (!canSubmit) {
      return;
    }
    submissions.current += 1;
    void submitGreeting({
      name: state.name,
      submission: submissions.current,
      greet: mutateAsync,
      dispatch,
    });
  }, [canSubmit, state.name, mutateAsync]);

  const { phase } = state;
  return {
    status: phase.status,
    name: state.name,
    onNameChange,
    onSubmit,
    canSubmit,
    isSubmitting: phase.status === "submitting",
    fieldError: fieldErrorOf(phase),
    formError: formErrorOf(phase),
    greetingMessage: phase.status === "succeeded" ? phase.message : null,
  };
}
