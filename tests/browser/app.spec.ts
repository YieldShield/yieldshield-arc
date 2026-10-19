import { test, expect } from "@playwright/test";
test("undeployed UI, no-wallet feedback and scenario disclosures", async ({
  page,
}) => {
  await page.goto("/protect");
  await expect(
    page.getByRole("button", { name: "Awaiting Arc testnet deployment" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Ethereum-compatible wallet",
  );
  await page.goto("/how-it-works");
  await page.getByRole("slider").fill("20");
  await expect(page.getByText("+20%", { exact: true })).toBeVisible();
  await expect(page.getByText("110.00 USDC")).toBeVisible();
  await expect(
    page.getByText(/At maturity, remaining assets are surrendered/),
  ).toBeVisible();
});
test("denied browser storage does not prevent rendering", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("storage unavailable");
    };
  });
  await page.goto("/portfolio");
  await expect(
    page.getByRole("heading", { name: "Wallet balances." }),
  ).toBeVisible();
});
test("wallet account and network changes clear the connected session", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let account = "0x1111111111111111111111111111111111111111";
    let chain = "0x4cef52";
    const listeners: Record<string, Set<(...args: unknown[]) => void>> = {};
    const provider = {
      async request({ method }: { method: string }) {
        if (method === "eth_requestAccounts" || method === "eth_accounts")
          return [account];
        if (method === "eth_chainId") return chain;
        if (method === "wallet_switchEthereumChain") {
          chain = "0x4cef52";
          return null;
        }
        throw new Error(`Unexpected wallet method ${method}`);
      },
      on(event: string, callback: (...args: unknown[]) => void) {
        (listeners[event] ??= new Set()).add(callback);
      },
      removeListener(event: string, callback: (...args: unknown[]) => void) {
        listeners[event]?.delete(callback);
      },
    };
    Object.assign(window, {
      ethereum: provider,
      testWalletChange(event: string) {
        if (event === "accountsChanged")
          account = "0x2222222222222222222222222222222222222222";
        else chain = "0x1";
        listeners[event]?.forEach((callback) =>
          callback(event === "accountsChanged" ? [account] : chain),
        );
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Connect wallet", exact: false })
    .first()
    .click();
  await expect(page.getByRole("button", { name: /0x1111…1111/ })).toBeVisible();
  await page.evaluate(() =>
    (window as any).testWalletChange("accountsChanged"),
  );
  await expect(
    page.getByRole("button", { name: "Connect wallet", exact: false }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Connect wallet", exact: false })
    .first()
    .click();
  await expect(page.getByRole("button", { name: /0x2222…2222/ })).toBeVisible();
  await page.evaluate(() => (window as any).testWalletChange("chainChanged"));
  await expect(
    page.getByRole("button", { name: "Connect wallet", exact: false }).first(),
  ).toBeVisible();
});

test("agent manifest, llms.txt and ABIs are served and match the deployment", async ({
  page,
  request,
}) => {
  const manifest = await (await request.get("/agent.json")).json();
  expect(manifest.schema).toBe("yieldshield-arc/agent-manifest/v1");
  expect(manifest.network.chainId).toBe(5042002);
  expect(manifest.agentPolicy.signing).toBe("never");
  expect(manifest.assets.map((a: any) => a.symbol)).toEqual([
    "USDC",
    "EURC",
    "cirBTC",
  ]);
  const llms = await (await request.get("/llms.txt")).text();
  expect(llms).toContain("Agents never sign");
  expect(llms).toContain("Pyth price updates (push first)");
  // Without a configured API key the same-origin price proxy answers 503, never a key or upstream error page.
  const proxy = await request.get(
    `/api/pyth-update?ids=${Object.values(manifest.pyth.feeds).join(",")}`,
  );
  expect([200, 503]).toContain(proxy.status());
  const abi = await (await request.get("/abi/ShieldPool.json")).json();
  expect(abi.some((item: any) => item.name === "protect")).toBe(true);
  await page.goto("/agents");
  await expect(
    page.getByRole("heading", { name: "Read the markets. Never sign." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "/agent.json" })).toBeVisible();
});
test("status and assets name Arc testnet, USDC decimals and no monetary value", async ({
  page,
}) => {
  await page.goto("/status");
  await expect(page.getByText("Arc Testnet (Circle)")).toBeVisible();
  await expect(page.getByText("5042002", { exact: true })).toBeVisible();
  await expect(page.getByText("https://rpc.testnet.arc.io")).toBeVisible();
  await page.goto("/assets");
  await expect(
    page.getByText("0x3600000000000000000000000000000000000000"),
  ).toBeVisible();
  await expect(page.getByText(/18 decimals natively/)).toBeVisible();
  await expect(page.getByText(/no monetary value/).first()).toBeVisible();
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/Avalanche|Fuji|AVAX/);
});
