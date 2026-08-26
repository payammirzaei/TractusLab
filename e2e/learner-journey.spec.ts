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

  test("a learner can open the Battery PCF simulator and switch to beginner language", async ({ page }) => {
    await page.goto("/learn/battery-pcf");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/Step 1 of/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /New to dataspaces/i })).toBeVisible();

    await page.getByRole("button", { name: /New to dataspaces/i }).click();
    await expect(page.getByText(/Beginner-friendly language on/i)).toBeVisible();
    await expect(page.getByText(/What this means/i)).toBeVisible();
  });

  test("learner progress survives a browser reload", async ({ page }) => {
    await page.goto("/learn/battery-pcf");
    await expect(page.getByText(/Step 1 of/i)).toBeVisible();

    await page.getByRole("button", { name: /Step 3/i }).click();
    await expect(page.getByText(/Step 3 of/i)).toBeVisible();

    await page.reload();
    await expect(page.getByText(/Step 3 of/i)).toBeVisible();
  });

  test("a learner can finish a scenario and solve its complete Boss Fight", async ({ page }) => {
    await page.goto("/learn/battery-pcf");
    await page.getByRole("button", { name: /Step 7/i }).click();
    await expect(page.getByText(/Step 7 of/i)).toBeVisible();
    await page.getByRole("button", { name: /Transfer the PCF data/i }).click();

    await expect(page.getByText(/Learning flow complete/i)).toBeVisible();
    await page.getByRole("button", { name: /Start Boss Fight/i }).click();
    await expect(page.getByRole("heading", { level: 2, name: /The negotiation is rejected/i })).toBeVisible();

    await page.getByRole("button", { name: /Compare the offer policy with consumer attributes/i }).click();
    await expect(page.getByText(/Root cause found/i)).toBeVisible();
    await page.getByRole("button", { name: /Next failure/i }).click();

    await page.getByRole("button", { name: /Compare semantic model\/schema versions/i }).click();
    await expect(page.getByText(/Root cause found/i)).toBeVisible();
    await page.getByRole("button", { name: /See result/i }).click();

    await expect(page.getByText(/Boss Fight complete/i)).toBeVisible();
    await expect(page.getByText(/Every root cause was found/i)).toBeVisible();
  });

  test("keyboard users can skip repeated navigation", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: /Skip to main content/i });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main-content$/);
  });

  test("account registration, logout and login work through the real API", async ({ page }) => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `browser-${suffix}@example.com`;
    const password = "Browser-e2e-Password-42!";
    const displayName = `Browser Learner ${suffix.slice(-6)}`;

    await page.goto("/account");
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
    await page.locator("#display-name").fill(displayName);
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("heading", { level: 1, name: displayName })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/account");
    await page.getByRole("tab", { name: "Sign in" }).click();
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole("heading", { level: 1, name: displayName })).toBeVisible();
  });

  test("authoring studio can create and restore a local draft", async ({ page }) => {
    const title = `E2E scenario ${Date.now()}`;

    await page.goto("/author");
    await expect(page.getByRole("heading", { level: 1, name: /Write like a teacher/i })).toBeVisible();
    await page.getByRole("button", { name: /New scenario/i }).click();
    const titleField = page.getByRole("textbox", { name: "Title", exact: true });
    await titleField.fill(title);
    await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();

    await page.getByRole("button", { name: /Save local draft/i }).click();
    await expect(page.getByText(/Draft saved locally/i)).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: /Restore saved draft/i }).click();
    await expect(page.getByRole("textbox", { name: "Title", exact: true })).toHaveValue(title);
    await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
  });

  test("web health endpoint carries the production security shell", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", service: "tractuslab-web" });
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
    expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(response.headers()["cache-control"]).toContain("no-store");
  });

  test("primary product routes stay contained inside the viewport", async ({ page }) => {
    for (const path of ["/", "/scenarios", "/learn/battery-pcf", "/account"]) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} should not create body-level horizontal scrolling`).toBeLessThanOrEqual(1);
    }
  });

  test("unknown routes have a useful recovery path", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: /part of the lab does not exist/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Scenario hub/i })).toBeVisible();
  });
});
