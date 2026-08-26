import { expect, test } from "@playwright/test";

test.describe("learner journey", () => {
  test("home, curriculum and scenario discovery stay connected", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /Don’t read the dataspace/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Start guided path/i })).toBeVisible();

    await page.getByRole("link", { name: /Start guided path/i }).click();
    await expect(page).toHaveURL(/\/path$/);
    await expect(page.getByRole("heading", { level: 1, name: /Learn the mental model in the right order/i })).toBeVisible();
    await expect(page.getByText(/Seven milestones\. One coherent story\./i)).toBeVisible();

    await page.getByRole("link", { name: /Browse freely/i }).click();
    await expect(page).toHaveURL(/\/scenarios$/);
    await expect(page.getByRole("heading", { level: 1, name: /Pick a business problem/i })).toBeVisible();
    await expect(page.locator("a.scenario-card")).toHaveCount(6);
  });

  test("a learner can open the Battery PCF simulator and change learning depth", async ({ page }) => {
    await page.goto("/learn/battery-pcf");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/Step 1 of/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /New to dataspaces/i })).toBeVisible();

    await page.getByRole("button", { name: /New to dataspaces/i }).click();
    await expect(page.getByText(/Beginner-friendly language on/i)).toBeVisible();
    await expect(page.getByText(/What this means/i)).toBeVisible();
  });

  test("unknown routes have a useful recovery path", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: /part of the lab does not exist/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Scenario hub/i })).toBeVisible();
  });
});
