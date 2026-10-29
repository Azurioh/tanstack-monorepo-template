import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  GreetingForm,
  type GreetingFormProps,
} from "@/features/greeting/client/components/greeting-form";
import { greetingCopy } from "@/features/greeting/client/copy";

function renderForm(overrides: Partial<GreetingFormProps> = {}) {
  const props: GreetingFormProps = {
    name: "",
    onNameChange: vi.fn(),
    onSubmit: vi.fn(),
    canSubmit: true,
    isSubmitting: false,
    fieldError: null,
    formError: null,
    greetingMessage: null,
    ...overrides,
  };
  render(<GreetingForm {...props} />);
  return props;
}

describe("GreetingForm", () => {
  it("renders a labelled name field with the given value", () => {
    renderForm({ name: "Ada" });

    expect(screen.getByLabelText(greetingCopy.form.nameLabel)).toHaveProperty("value", "Ada");
  });

  it("reports typing through onNameChange", async () => {
    const props = renderForm();

    await userEvent.type(screen.getByLabelText(greetingCopy.form.nameLabel), "A");

    expect(props.onNameChange).toHaveBeenCalledWith("A");
  });

  it("calls onSubmit when the form is submitted, without a page navigation", async () => {
    const props = renderForm({ name: "Ada" });

    await userEvent.click(screen.getByRole("button", { name: greetingCopy.form.submit }));

    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it("disables the submit button when submitting is not allowed", () => {
    renderForm({ canSubmit: false });

    expect(screen.getByRole("button", { name: greetingCopy.form.submit })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("shows the submitting label while a request is in flight", () => {
    renderForm({ isSubmitting: true });

    expect(screen.getByRole("button", { name: greetingCopy.form.submitting })).toBeDefined();
  });

  it("links the field error to the input", () => {
    renderForm({ fieldError: greetingCopy.errors.NAME_EMPTY });

    const input = screen.getByLabelText(greetingCopy.form.nameLabel);
    const error = screen.getByText(greetingCopy.errors.NAME_EMPTY);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(error.id);
  });

  it("announces a form error as an alert", () => {
    renderForm({ formError: greetingCopy.unexpected });

    expect(screen.getByRole("alert").textContent).toContain(greetingCopy.unexpected);
  });

  it("renders the greeting with markup characters as text", () => {
    const { container } = render(
      <GreetingForm
        name=""
        onNameChange={vi.fn()}
        onSubmit={vi.fn()}
        canSubmit
        isSubmitting={false}
        fieldError={null}
        formError={null}
        greetingMessage="Hello, <b>Ada</b><script>alert(1)</script>!"
      />,
    );

    expect(screen.getByText("Hello, <b>Ada</b><script>alert(1)</script>!")).toBeDefined();
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
  });
});
