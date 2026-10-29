import { expect, test } from "@playwright/test";

const MIN_TAP_TARGET_PX = 44;
const PHONE_VIEWPORT = { width: 375, height: 812 };

test.describe("on a 375 px phone viewport", () => {
  test.use({ viewport: PHONE_VIEWPORT });

  test("shows the not-found page for an unknown URL and leads back home", async ({ page }) => {
    await page.goto("/no-such-page");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
    const home = page.getByRole("link", { name: "Go to the home page" });
    const box = await home.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(MIN_TAP_TARGET_PX);

    await home.click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Say hello");
  });
});
