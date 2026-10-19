import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createPublicClient, http, encodeFunctionData, parseAbi } from "viem";
/** Local-only: needs Anvil on 8567, `node scripts/local-journey.mjs --browser-ready` and `node scripts/local-web.mjs`. */
const enabled = process.env.SHIELD_LOCAL_E2E === "1";
const RPC = "http://127.0.0.1:8567";
const WEB = "http://127.0.0.1:5204";
const chronicle = parseAbi(["function set(uint256 value, uint256 updatedAt)"]);
async function setup(page: Page, accountIndex: number) {
  const m = JSON.parse(readFileSync(".local/deployment.json", "utf8"));
  const rpc = createPublicClient({ transport: http(RPC) });
  expect(await rpc.getChainId()).toBe(31337);
  const accounts = (await rpc.request({
    method: "eth_accounts",
  } as any)) as string[];
  const account = accounts[accountIndex];
  const send = async (to: string, data: `0x${string}`) =>
    rpc.request({
      method: "eth_sendTransaction",
      params: [{ from: accounts[0], to, data }],
    } as any);
  /** Moves a local Chronicle stand-in, stamped with the latest chain time so it stays fresh. */
  const setFeed = async (feed: string, value: bigint) => {
    const { timestamp } = await rpc.getBlock();
    await send(
      feed,
      encodeFunctionData({
        abi: chronicle,
        functionName: "set",
        args: [value, timestamp],
      }),
    );
  };
  await setFeed(m.chronicle.eurcUsd, 1_100000000000000000n);
  await setFeed(m.chronicle.usdcUsd, 1_000000000000000000n);
  await setFeed(m.chronicle.cirbtcUsdc, 81827_183708000000000000n);
  await page.exposeFunction("__walletRpc", async (request: any) => {
    if (
      request.method === "eth_requestAccounts" ||
      request.method === "eth_accounts"
    )
      return [account];
    if (request.method === "wallet_switchEthereumChain") return null;
    if (request.method === "wallet_addEthereumChain") return null;
    return rpc.request(request);
  });
  await page.addInitScript(() => {
    (window as any).ethereum = {
      request: (r: any) => (window as any).__walletRpc(r),
      on: () => {},
      removeListener: () => {},
    };
  });
  return { m, rpc, setFeed };
}
test("local signed browser journey: provide USDC → protect EURC → gain exit → claim fees", async ({
  page,
}) => {
  test.skip(!enabled, "Explicit local-only chain setup required.");
  test.setTimeout(180000);
  const { m, rpc, setFeed } = await setup(page, 2);
  await page.goto(`${WEB}/provide?pool=eurc`);
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .first()
    .click();
  await page.getByLabel("Amount", { exact: true }).fill("50");
  await page.getByRole("button", { name: "Review provision" }).click();
  await page.getByRole("button", { name: "Confirm capital provision" }).click();
  await expect(
    page.getByRole("heading", { name: "Capital provided." }),
  ).toBeVisible({ timeout: 30000 });
  await page.goto(`${WEB}/protect?pool=eurc`);
  // The authorized wallet is restored after a full page load without another prompt.
  await expect(
    page.getByRole("button", { name: "Connect wallet", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Amount", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Review protection" }).click();
  await expect(page.getByText("11 USDC").first()).toBeVisible();
  await page.getByRole("button", { name: "Confirm protection" }).click();
  await expect(
    page.getByRole("heading", { name: "Protection opened." }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("link", { name: "View position" }).click();
  await rpc.request({ method: "evm_increaseTime", params: [61] } as any);
  await rpc.request({ method: "evm_mine", params: [] } as any);
  await setFeed(m.chronicle.eurcUsd, 2_200000000000000000n);
  await page.getByLabel("Amount to exit", { exact: true }).fill("5");
  await page.getByRole("button", { name: "Review exit", exact: true }).click();
  await page.getByRole("button", { name: "Confirm exit", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Partial asset exit confirmed.",
    { timeout: 30000 },
  );
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Portfolio", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Claim earned fees", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Claim provider rewards confirmed.",
    { timeout: 30000 },
  );
  await page
    .getByRole("navigation", { name: "Portfolio navigation" })
    .getByRole("link", { name: "Activity", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Claim provider rewards", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Portfolio navigation" })
    .getByRole("link", { name: "Balances", exact: true })
    .click();
  await page.getByRole("button", { name: /Disconnect/ }).click();
  await expect(
    page.getByRole("heading", { name: "Connect your wallet" }),
  ).toBeVisible();
});
test("a stale reference price blocks protection and explains why", async ({
  page,
}) => {
  test.skip(!enabled, "Explicit local-only chain setup required.");
  const { m, rpc } = await setup(page, 3);
  // Age the cirBTC feed past the 3-hour limit without moving the clock backwards.
  const { timestamp } = await rpc.getBlock();
  await rpc.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: ((await rpc.request({ method: "eth_accounts" } as any)) as string[])[0],
        to: m.chronicle.cirbtcUsdc,
        data: encodeFunctionData({
          abi: chronicle,
          functionName: "set",
          args: [81827_183708000000000000n, timestamp - 10801n],
        }),
      },
    ],
  } as any);
  await page.goto(`${WEB}/protect?pool=cirbtc`);
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .first()
    .click();
  await page.getByLabel("Amount", { exact: true }).fill("0.0001");
  await page.getByRole("button", { name: "Review protection" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "reference price is stale or unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Confirm protection" }),
  ).toHaveCount(0);
});
test("an in-flight quote cannot revive a previous market review", async ({
  page,
}) => {
  test.skip(!enabled, "Explicit local-only chain setup required.");
  const { m } = await setup(page, 3);
  await page.goto(`${WEB}/protect?pool=eurc`);
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .first()
    .click();
  await page.getByLabel("Amount", { exact: true }).fill("1");
  let release!: () => void, intercepted!: () => void;
  const held = new Promise<void>((r) => (release = r)),
    arrived = new Promise<void>((r) => (intercepted = r));
  let holding = true;
  await page.route(`${RPC}/`, async (route) => {
    const body = route.request().postDataJSON();
    // Local reads may arrive as JSON-RPC batches.
    if (
      holding &&
      (Array.isArray(body) ? body : [body]).some(
        (call: any) =>
          call.method === "eth_call" &&
          call.params?.[0]?.to?.toLowerCase() === m.eurcPool.toLowerCase(),
      )
    ) {
      holding = false;
      intercepted();
      await held;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Review protection" }).click();
  await arrived;
  await page.getByLabel("Choose a market").selectOption("scenario");
  release();
  await expect(page.getByRole("button", { name: "Confirm protection" })).toHaveCount(0);
});
