import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GreetingList } from "@/features/greeting/client/components/greeting-list";
import { greetingCopy } from "@/features/greeting/client/copy";

describe("GreetingList", () => {
  it("shows the empty state when there is no greeting", () => {
    render(<GreetingList items={[]} />);

    expect(screen.getByText(greetingCopy.recent.empty)).toBeDefined();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("lists the greetings in the given order", () => {
    render(
      <GreetingList
        items={[
          { id: "g-2", message: "Hello, Grace!" },
          { id: "g-1", message: "Hello, Ada!" },
        ]}
      />,
    );

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["Hello, Grace!", "Hello, Ada!"]);
  });

  it("renders markup characters as text", () => {
    const { container } = render(
      <GreetingList items={[{ id: "g-1", message: "Hello, <img src=x onerror=alert(1)>!" }]} />,
    );

    expect(screen.getByText("Hello, <img src=x onerror=alert(1)>!")).toBeDefined();
    expect(container.querySelector("img")).toBeNull();
  });
});
