import { expect, test } from "@playwright/test";

test("unknown learning scenario never silently substitutes another mission", async ({ page }) => {
  await page.goto("/learn/not-a-real-scenario");

  await expect(page.getByRole("heading", { level: 1, name: /That learning mission is not available/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open Scenario Hub/i })).toBeVisible();
  await expect(page.getByText(/No other scenario was substituted in its place/i)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: /Share a battery product carbon footprint/i })).toHaveCount(0);
});
