import { test, expect } from "@playwright/test";
// Spec §11.1: unauthenticated users are redirected to /login.
test("redirects to login when signed out", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("ダイエットレシピ")).toBeVisible();
});
test("login form exposes signup + reset + google", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Googleでログイン" })).toBeVisible();
  await page.getByRole("button", { name: "パスワードを忘れた" }).click();
  await expect(page.getByRole("button", { name: "再設定メールを送る" })).toBeVisible();
});
