import { expect, type Page, test } from "@playwright/test";

const GREET_PATH = "/api/rpc/greeting/greet";
const MIN_TAP_TARGET_PX = 44;
const PHONE_VIEWPORT = { width: 375, height: 812 };

async function openPage(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

function nameField(page: Page) {
  return page.getByLabel("Name");
}

function greetButton(page: Page) {
  return page.getByRole("button", { name: "Greet" });
}

test("greets Ada and lists the greeting under recent greetings", async ({ page }) => {
  await openPage(page);

  await nameField(page).fill("Ada");
  await greetButton(page).click();

  await expect(page.getByRole("status")).toHaveText("Hello, Ada!");
  const recent = page.getByRole("region", { name: "Recent greetings" });
  await expect(recent.getByRole("listitem").first()).toHaveText("Hello, Ada!");
});

test("shows a validation message for a whitespace-only name without calling the server", async ({
  page,
}) => {
  const greetRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === GREET_PATH) {
      greetRequests.push(request.url());
    }
  });
  await openPage(page);

  await nameField(page).fill("   ");
  await greetButton(page).click();

  await expect(page.getByText("Enter a name.")).toBeVisible();
  await expect(nameField(page)).toHaveAttribute("aria-invalid", "true");
  expect(greetRequests).toEqual([]);
});

test.describe("on a 375 px phone viewport", () => {
  test.use({ viewport: PHONE_VIEWPORT });

  test("keeps the layout within the screen and tap targets at least 44 px", async ({ page }) => {
    await openPage(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    for (const target of [nameField(page), greetButton(page)]) {
      const box = await target.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(MIN_TAP_TARGET_PX);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(MIN_TAP_TARGET_PX);
    }

    await nameField(page).fill("Ada");
    await greetButton(page).click();
    await expect(page.getByRole("status")).toHaveText("Hello, Ada!");
  });
});
