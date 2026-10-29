import { ORPCError } from "@orpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { greetingCopy } from "@/features/greeting/client/copy";
import { useGreetingForm } from "@/features/greeting/client/hooks/use-greeting-form";
import type { GreetingDto } from "@/features/greeting/server";

const RECENT_KEY = ["greeting", "listRecent"];

const api = vi.hoisted(() => ({
  greet: vi.fn<(input: { name: string }) => Promise<GreetingDto>>(),
}));

vi.mock("@/features/greeting/client/api/greeting-queries", () => ({
  greetMutationOptions: () => ({ mutationFn: (input: { name: string }) => api.greet(input) }),
  recentGreetingsKey: () => RECENT_KEY,
}));

afterEach(() => {
  api.greet.mockReset();
});

function aDto(name: string): GreetingDto {
  return {
    id: `id-${name}`,
    name,
    message: `Hello, ${name}!`,
    createdAt: "2026-01-15T10:00:00.000Z",
  };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(RECENT_KEY, []);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  const hook = renderHook(() => useGreetingForm(), { wrapper });
  return { queryClient, hook };
}

function submitName(hook: ReturnType<typeof setup>["hook"], name: string) {
  act(() => {
    hook.result.current.onNameChange(name);
  });
  act(() => {
    hook.result.current.onSubmit();
  });
}

describe("useGreetingForm", () => {
  it("starts idle with an empty name", () => {
    const { hook } = setup();

    expect(hook.result.current).toMatchObject({
      status: "idle",
      name: "",
      canSubmit: true,
      isSubmitting: false,
      fieldError: null,
      formError: null,
      greetingMessage: null,
    });
  });

  it("goes invalid on a whitespace-only name without calling the server", () => {
    const { hook } = setup();

    submitName(hook, "   ");

    expect(hook.result.current.status).toBe("invalid");
    expect(hook.result.current.fieldError).toBe(greetingCopy.errors.NAME_EMPTY);
    expect(hook.result.current.canSubmit).toBe(false);
    expect(api.greet).not.toHaveBeenCalled();
  });

  it("blocks submit while invalid and returns to idle once the name changes", () => {
    const { hook } = setup();
    submitName(hook, "a".repeat(51));
    expect(hook.result.current.fieldError).toBe(greetingCopy.errors.NAME_TOO_LONG);

    act(() => {
      hook.result.current.onSubmit();
    });
    expect(api.greet).not.toHaveBeenCalled();

    act(() => {
      hook.result.current.onNameChange("Ada");
    });
    expect(hook.result.current.status).toBe("idle");
    expect(hook.result.current.fieldError).toBeNull();
  });

  it("goes submitting then succeeded, and invalidates the recent list", async () => {
    const { hook, queryClient } = setup();
    const call = deferred<GreetingDto>();
    api.greet.mockReturnValueOnce(call.promise);

    submitName(hook, "  Ada ");

    expect(hook.result.current.status).toBe("submitting");
    expect(hook.result.current.isSubmitting).toBe(true);
    await waitFor(() => {
      expect(api.greet).toHaveBeenCalledWith({ name: "Ada" });
    });

    await act(async () => {
      call.resolve(aDto("Ada"));
    });

    await waitFor(() => {
      expect(hook.result.current.status).toBe("succeeded");
    });
    expect(hook.result.current.greetingMessage).toBe("Hello, Ada!");
    expect(hook.result.current.isSubmitting).toBe(false);
    expect(queryClient.getQueryState(RECENT_KEY)?.isInvalidated).toBe(true);
  });

  it("shows the copy for a business error code returned by the server", async () => {
    const { hook } = setup();
    api.greet.mockRejectedValueOnce(
      new ORPCError("BAD_REQUEST", { data: { code: "NAME_INVALID" } }),
    );

    submitName(hook, "Ada");

    await waitFor(() => {
      expect(hook.result.current.status).toBe("failed");
    });
    expect(hook.result.current.fieldError).toBe(greetingCopy.errors.NAME_INVALID);
    expect(hook.result.current.formError).toBeNull();
  });

  it("shows a generic message with the reference id for an unexpected server error", async () => {
    const { hook } = setup();
    api.greet.mockRejectedValueOnce(
      new ORPCError("INTERNAL_SERVER_ERROR", { data: { referenceId: "ref-9" } }),
    );

    submitName(hook, "Ada");

    await waitFor(() => {
      expect(hook.result.current.status).toBe("failed");
    });
    expect(hook.result.current.formError).toBe(greetingCopy.unexpectedWithReference("ref-9"));
    expect(hook.result.current.fieldError).toBeNull();
  });

  it("shows the generic message when the server is unreachable and stays usable", async () => {
    const { hook } = setup();
    api.greet.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    submitName(hook, "Ada");

    await waitFor(() => {
      expect(hook.result.current.status).toBe("failed");
    });
    expect(hook.result.current.formError).toBe(greetingCopy.unexpected);
    expect(hook.result.current.canSubmit).toBe(true);

    api.greet.mockResolvedValueOnce(aDto("Ada"));
    act(() => {
      hook.result.current.onSubmit();
    });
    await waitFor(() => {
      expect(hook.result.current.status).toBe("succeeded");
    });
    expect(hook.result.current.formError).toBeNull();
  });

  it("applies only the latest submission's result", async () => {
    const { hook } = setup();
    const first = deferred<GreetingDto>();
    const second = deferred<GreetingDto>();
    api.greet.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    submitName(hook, "Ada");
    submitName(hook, "Grace");

    await act(async () => {
      second.resolve(aDto("Grace"));
    });
    await waitFor(() => {
      expect(hook.result.current.status).toBe("succeeded");
    });
    await act(async () => {
      first.reject(new ORPCError("INTERNAL_SERVER_ERROR", { data: { referenceId: "ref-1" } }));
    });

    expect(hook.result.current.status).toBe("succeeded");
    expect(hook.result.current.greetingMessage).toBe("Hello, Grace!");
    expect(hook.result.current.formError).toBeNull();
  });

  it("ignores an earlier success that arrives after a later submission", async () => {
    const { hook } = setup();
    const first = deferred<GreetingDto>();
    const second = deferred<GreetingDto>();
    api.greet.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    submitName(hook, "Ada");
    submitName(hook, "Grace");
    await act(async () => {
      first.resolve(aDto("Ada"));
    });

    expect(hook.result.current.status).toBe("submitting");
    expect(hook.result.current.greetingMessage).toBeNull();

    await act(async () => {
      second.resolve(aDto("Grace"));
    });
    await waitFor(() => {
      expect(hook.result.current.greetingMessage).toBe("Hello, Grace!");
    });
  });
});
