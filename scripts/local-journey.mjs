/**
 * Local-only lifecycle on a disposable Anvil (chain 31337, port 8567) with stand-ins for Arc USDC, EURC, cirBTC
 * and Pyth (MockPyth). Like on Arc, every step that reads a reference price is preceded by a Pyth update. Writes source-hash-bound evidence to docs/evidence/local-journey.json.
 * Never touches Arc testnet. `--browser-ready` then resets the chain and prepares fresh markets for browser tests.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createPublicClient, createWalletClient, http, keccak256, toHex, zeroAddress } from "viem";
import { foundry } from "viem/chains";
import { setupMarkets, localArtifacts, terms } from "./setup-markets.mjs";
import { LOCAL_RPC, erc20Abi } from "./arc-config.mjs";
import { feedIds, mockUpdate, pythAbi } from "./price-updates.mjs";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const c = createPublicClient({ chain: foundry, transport: http(LOCAL_RPC) });
if ((await c.getChainId()) !== 31337) throw new Error("Local-only chain guard: expected Anvil chain 31337 on port 8567");
const CONTRACT_FIELDS = [
  "scenarioOracle",
  "eurcOracle",
  "cirbtcOracle",
  "factory",
  "eurcPool",
  "cirbtcPool",
  "scenarioPool",
];
/** Starting Pyth prices (expo -8): EURC/USD 1.10, USDC/USD 1.00, BTC/USD 81,827.183708. */
const PRICES = {
  eurcUsd: { price: 110000000n, conf: 10000n, expo: -8 },
  usdcUsd: { price: 100000000n, conf: 10000n, expo: -8 },
  btcUsd: { price: 8182718370800n, conf: 400000000n, expo: -8 },
};
await c.request({ method: "anvil_reset", params: [] });
const accounts = await c.request({ method: "eth_accounts", params: [] });
const [account, holder] = accounts;
const wallet = (from) => createWalletClient({ account: from, chain: foundry, transport: http(LOCAL_RPC) });
const w = wallet(account),
  h = wallet(holder);
const template = JSON.parse(readFileSync("config/deployment.json"));
let manifest;
mkdirSync(".local", { recursive: true });
const save = () => writeFileSync(".local/deployment.json", JSON.stringify(manifest, null, 2) + "\n");
async function receipt(label, hash) {
  const r = await c.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${label} reverted`);
  manifest.transactions.push({
    label,
    hash,
    blockNumber: String(r.blockNumber),
    status: r.status,
    contractAddress: r.contractAddress,
    gasUsed: String(r.gasUsed),
  });
  save();
  return r;
}
async function deployTo(label, a, args = []) {
  const r = await receipt(label, await w.deployContract({ abi: a.abi, bytecode: a.bytecode.object, args }));
  return r.contractAddress;
}
async function deploy(field, a, args = []) {
  manifest[field] = await deployTo(field, a, args);
  save();
}
async function call(label, request, signer = w) {
  const hash = request.to
    ? await signer.sendTransaction(request)
    : await signer.writeContract({ ...request, chain: foundry });
  return receipt(label, hash);
}
const run = (label, address, abi, functionName, args = [], signer = w) =>
  call(label, { address, abi, functionName, args }, signer);
const read = (address, abi, functionName, args = []) => c.readContract({ address, abi, functionName, args });
const now = async () => (await c.getBlock()).timestamp;
const step = async (seconds) => {
  await c.request({ method: "evm_increaseTime", params: [seconds] });
  await c.request({ method: "evm_mine", params: [] });
};
/** Deploys the local stand-ins, funds the test accounts and runs the shared Arc deployment plan. */
async function prepare(funded) {
  manifest = {
    ...template,
    chainId: 31337,
    network: "Local Anvil (not Arc testnet)",
    rpcUrl: LOCAL_RPC,
    explorer: LOCAL_RPC,
    deployer: account,
    transactions: [],
    status: "local-only",
  };
  for (const field of CONTRACT_FIELDS) manifest[field] = null;
  delete manifest.deploymentId;
  delete manifest.source;
  const l = localArtifacts();
  manifest.usdc = await deployTo("local-usdc-stand-in", l.usdc);
  manifest.eurc = await deployTo("local-eurc-stand-in", l.eurc);
  manifest.cirbtc = await deployTo("local-cirbtc-stand-in", l.cirbtc);
  manifest.oracle = "pyth";
  manifest.pyth = { ...template.pyth, contract: await deployTo("local-pyth-stand-in", l.pyth), mock: true };
  await run("local-pyth-fee", manifest.pyth.contract, pythAbi, "setFee", [1n]);
  for (const [key, p] of Object.entries(PRICES))
    await run(`local-pyth-${key}`, manifest.pyth.contract, pythAbi, "setPrice", [
      manifest.pyth.feeds[key],
      p.price,
      p.conf,
      p.expo,
      await now(),
    ]);
  for (const who of funded) {
    await run(`local-mint-usdc-${who.slice(0, 8)}`, manifest.usdc, erc20Abi, "mint", [who, 1000_000000n]);
    await run(`local-mint-eurc-${who.slice(0, 8)}`, manifest.eurc, erc20Abi, "mint", [who, 1000_000000n]);
    await run(`local-mint-cirbtc-${who.slice(0, 8)}`, manifest.cirbtc, erc20Abi, "mint", [who, 1_00000000n]);
  }
  save();
  return setupMarkets({ manifest, account, deploy, call, save, updatePrices: () => refreshFeeds(), local: true });
}
/** Pushes a MockPyth update stamped with the latest block time, with optional new prices by manifest feed key. */
async function refreshFeeds(changes = {}) {
  const overrides = Object.fromEntries(
    Object.entries(changes).map(([key, p]) => [manifest.pyth.feeds[key], { ...PRICES[key], ...p }]),
  );
  const update = await mockUpdate(read, manifest.pyth.contract, feedIds(manifest), await now(), overrides);
  const fee = await read(manifest.pyth.contract, pythAbi, "getUpdateFee", [update.data]);
  return call("pyth-update", {
    address: manifest.pyth.contract,
    abi: pythAbi,
    functionName: "updatePriceFeeds",
    args: [update.data],
    value: fee,
  });
}
const a = await prepare([account, holder]);
const fixtureTransactions = manifest.transactions.length;
const observations = [];
let dead = () => now().then((t) => t + 600n);
// EURC reference market: provider capital, protection, a gain exit with fees, transfer and a backing exit.
await run("provider-usdc-approve-eurc", manifest.usdc, erc20Abi, "approve", [manifest.eurcPool, 100_000000n]);
await refreshFeeds();
await run("provider-deposit-eurc", manifest.eurcPool, a.pool.abi, "depositJuniorBounded", [100_000000n, 1n, await dead()]);
await run("holder-eurc-approve", manifest.eurc, erc20Abi, "approve", [manifest.eurcPool, 50_000000n], h);
await refreshFeeds();
await run("holder-protect-eurc", manifest.eurcPool, a.pool.abi, "protect", [50_000000n, 55_000000n, await dead()], h);
const [, , floor] = await read(manifest.eurcPool, a.pool.abi, "positions", [1n]);
if (floor !== 55_000000n) throw new Error(`Expected a 55 USDC entry claim for 50 EURC at 1.10, got ${floor}`);
observations.push("50 EURC at 1.10 USDC opened a 55.000000 USDC entry claim (6-decimal asset, 6-decimal backing)");
await step(61);
await refreshFeeds({ eurcUsd: { price: 132000000n } });
const [assetOut, fee] = await read(manifest.eurcPool, a.pool.abi, "previewPartialExit", [1n, 25_000000n]);
await run("holder-partial-asset-exit-eurc", manifest.eurcPool, a.pool.abi, "partialExitAsset", [1n, 25_000000n, assetOut, await dead()], h);
observations.push(`a +20% EUR move: exiting 25 EURC returned ${assetOut} units and charged ${fee} units of gain fees`);
const reward = await read(manifest.eurcPool, a.pool.abi, "earned", [account]);
if (reward <= 0n) throw new Error("Expected earned provider fee");
await run("provider-claim-earned-fees", manifest.eurcPool, a.pool.abi, "claimRewards", [account]);
await run("holder-transfer-remainder", manifest.eurcPool, a.pool.abi, "transferPosition", [1n, account], h);
await run("new-owner-backing-exit", manifest.eurcPool, a.pool.abi, "partialExitBacking", [1n, 25_000000n, 27_500000n, await dead()]);
await run("provider-notice", manifest.eurcPool, a.pool.abi, "requestJuniorWithdrawal");
await step(121);
await refreshFeeds();
await run("provider-partial-redemption", manifest.eurcPool, a.pool.abi, "withdrawJuniorBounded", [50n * 10n ** 18n, 1n, 0n, await dead()]);
await run("creator-protocol-pull-fees", manifest.eurcPool, a.pool.abi, "claimFees", [account]);
// cirBTC reference market (8 decimals), then a stale feed: asset exits stop, backing exits keep working.
await run("provider-usdc-approve-cirbtc", manifest.usdc, erc20Abi, "approve", [manifest.cirbtcPool, 100_000000n]);
await run("provider-deposit-cirbtc", manifest.cirbtcPool, a.pool.abi, "depositJuniorBounded", [100_000000n, 1n, await dead()]);
await run("holder-cirbtc-approve", manifest.cirbtc, erc20Abi, "approve", [manifest.cirbtcPool, 50000n], h);
await refreshFeeds();
await run("holder-protect-cirbtc", manifest.cirbtcPool, a.pool.abi, "protect", [50000n, 1n, await dead()], h);
// No update for longer than the adapter's maxAge: the price is stale.
await step(Number(manifest.pyth.maxAge) + 1);
const staleRevert = await c
  .simulateContract({ account: holder, address: manifest.cirbtcPool, abi: a.pool.abi, functionName: "exitAsset", args: [1n, 0n] })
  .then(() => null, (error) => error.shortMessage ?? error.message);
if (!staleRevert || !/INVALID_OR_STALE_PRICE/.test(staleRevert))
  throw new Error(`Expected a stale-price revert, got: ${staleRevert}`);
observations.push("with no Pyth update for longer than maxAge (120 s), exitAsset reverted with INVALID_OR_STALE_PRICE");
await run("holder-cirbtc-backing-exit-while-stale", manifest.cirbtcPool, a.pool.abi, "exitBacking", [1n], h);
observations.push("while stale, exitBacking still paid the fixed USDC claim for 0.0005 cirBTC");
await refreshFeeds();
// Scenario market: permissionless settlement at maturity and the owner's separate claim.
await run("provider-usdc-approve-scenario", manifest.usdc, erc20Abi, "approve", [manifest.scenarioPool, 50_000000n]);
await run("provider-deposit-scenario", manifest.scenarioPool, a.pool.abi, "depositJuniorBounded", [50_000000n, 1n, await dead()]);
await run("holder-scenario-approve", manifest.eurc, erc20Abi, "approve", [manifest.scenarioPool, 10_000000n], h);
await run("holder-scenario-protect", manifest.scenarioPool, a.pool.abi, "protect", [10_000000n, 1n, await dead()], h);
const maturity = await read(manifest.scenarioPool, a.pool.abi, "maturity");
await c.request({ method: "evm_setNextBlockTimestamp", params: [Number(maturity)] });
await c.request({ method: "evm_mine", params: [] });
await run("permissionless-expiry", manifest.scenarioPool, a.pool.abi, "settleExpired", [1n]);
await run("holder-matured-backing-claim", manifest.scenarioPool, a.pool.abi, "claimBacking", [], h);
const sourceHash = {};
for (const file of [
  "contracts/src/ShieldPool.sol",
  "contracts/src/ShieldFactory.sol",
  "contracts/src/ShieldOracles.sol",
  "contracts/src/ShieldPyth.sol",
  "contracts/test/ShieldMocks.sol",
  "scripts/price-updates.mjs",
  "scripts/setup-markets.mjs",
  "scripts/local-journey.mjs",
])
  sourceHash[file] = keccak256(toHex(readFileSync(file)));
let commit = null;
try {
  commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
} catch {}
mkdirSync("docs/evidence", { recursive: true });
writeFileSync(
  "docs/evidence/local-journey.json",
  JSON.stringify(
    {
      network: "Local Anvil only (chain 31337); not Arc testnet. Assets and Pyth are local stand-ins (MockPyth).",
      oracle: "pyth",
      chainId: 31337,
      createdAt: new Date().toISOString(),
      parentCommit: commit,
      sourceHash,
      featuredTerms: terms,
      fixtureTransactions,
      journeyTransactions: manifest.transactions.length - fixtureTransactions,
      tests: [
        "local stand-ins at fresh addresses, then the shared Arc deployment plan with a Pyth update before each reference market creation",
        "factory-seeded EURC, cirBTC and scenario markets",
        "provider USDC deposit, EURC protection, partial gain exit and independent reward claim",
        "ownership transfer preserves entry basis; new owner's backing exit",
        "provider notice and partial basket redemption; creator and protocol pull fees",
        "8-decimal cirBTC protection after a Pyth update; once the price is older than 120 s the asset exit reverts but the backing exit pays",
        "permissionless maturity settlement and the owner's segregated claim",
      ],
      observations,
      transactions: manifest.transactions,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Confirmed ${manifest.transactions.length} local transactions (${fixtureTransactions} setup); source-bound evidence saved. No Arc testnet transaction was sent.`,
);
if (process.argv.includes("--browser-ready")) {
  // Fresh markets for browser tests, because the evidence run intentionally matures the scenario epoch.
  await c.request({ method: "anvil_reset", params: [] });
  await prepare([account, holder, accounts[2], accounts[3]]);
  console.log("Fresh local deployment prepared in .local/deployment.json for browser checks (accounts 2 and 3 funded).");
}
