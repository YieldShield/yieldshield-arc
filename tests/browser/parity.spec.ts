import { test, expect } from "@playwright/test";
const routes: [string, string][] = [
  ["/", "Keep the upside."],
  ["/markets", "Find your market."],
  ["/protect", "Choose your protection."],
  ["/provide", "Put your capital to work."],
  ["/positions", "My positions."],
  ["/portfolio", "Wallet balances."],
  ["/activity", "Activity."],
  ["/create-pool", "Set the terms. Supply the seed."],
  ["/faucet", "Get Arc testnet tokens."],
  ["/status", "Verify before you sign."],
  ["/assets", "Know what you hold."],
  ["/agents", "Read the markets. Never sign."],
  ["/how-it-works", "Two roles. One explicit tradeoff."],
  ["/legal", "An experiment with clear limits."],
];
test("direct routes render and remain readable at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, title] of routes) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: title, exact: false }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/positions/eurc:1?pool=eurc");
  await expect(
    page.getByRole("heading", { name: "Position details." }),
  ).toBeVisible();
});
test("funding detour retains market, amount and role", async ({ page }) => {
  await page.goto("/protect?pool=cirbtc");
  await page.getByLabel("Amount", { exact: true }).fill("0.0005");
  await page
    .getByRole("link", { name: "Get test cirBTC", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Get Arc testnet tokens." }),
  ).toBeVisible();
  expect(page.url()).toContain("asset=cirbtc");
  await expect(
    page.getByRole("link", { name: "Open faucet.circle.com ↗" }),
  ).toHaveAttribute("href", "https://faucet.circle.com");
  await page
    .getByRole("link", { name: "Return to protection with your amount" })
    .click();
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue(
    "0.0005",
  );
  await expect(page.getByLabel("Choose a market")).toHaveValue("cirbtc");
  await page.goto("/provide?pool=eurc&amount=12");
  await page.getByRole("link", { name: "Get test USDC", exact: true }).click();
  await page
    .getByRole("link", { name: "Return to providing with your amount" })
    .click();
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("12");
});
test("unknown pool and mismatched detail reject silently redirected financial intent", async ({
  page,
}) => {
  await page.goto("/protect?pool=unknown");
  await expect(
    page.getByRole("heading", { name: "Invalid market selection" }),
  ).toBeVisible();
  await expect(page.getByLabel("Amount", { exact: true })).toHaveCount(0);
  await page.goto("/pools/scenario?pool=eurc");
  await expect(
    page.getByRole("heading", { name: "Invalid market selection" }),
  ).toBeVisible();
});
test("scenario market is labelled synthetic wherever it appears", async ({
  page,
}) => {
  await page.goto("/pools/scenario?pool=scenario");
  await expect(
    page.getByText("Synthetic 1.10 → 1.20 → 1.00 cycle").first(),
  ).toBeVisible();
  await expect(
    page.getByText(/scenario market: its price is a public synthetic cycle/),
  ).toBeVisible();
});
