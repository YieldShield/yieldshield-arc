/**
 * Scripted public-testnet journey from a SECOND fresh test wallet (not the deployer), against the verified Arc
 * testnet deployment: provide USDC, protect EURC, wait the exit delay, take a partial asset exit and a backing
 * exit, claim any provider fees, then redeem the provider shares. With Pyth, a fresh `updatePriceFeeds` is pushed
 * right before every step that reads the price (provide, protect, asset exit). Every transaction gets a 30% gas
 * margin over its estimate. Records every receipt and the balance changes in docs/evidence/arc-testnet-journey.json.
 *
 * Needs .secrets/arc-journey-wallet.json funded from https://faucet.circle.com (Arc Testnet) with at least
 * 3 USDC and 2 EURC, and (for Hermes) PYTH_API_KEY or .secrets/pyth-api-key. A read-only check runs first;
 * pass --broadcast to send.
 * Rehearsal only: ARC_MANIFEST, ARC_RPC_URL, ARC_JOURNEY_WALLET, ARC_JOURNEY_EVIDENCE and ARC_PRICE_SOURCE=mock
 * may point at a disposable Anvil (loopback only).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createPublicClient, createWalletClient, decodeEventLog, encodeFunctionData, formatUnits, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ARC_TESTNET_ID, MIN_BASE_FEE, arcTestnet, erc20Abi, isLoopback } from "./arc-config.mjs";
import { planArtifacts, referenceArtifact } from "./setup-markets.mjs";
import { feedIds, hermesUpdate, mockUpdate, pythAbi, pythApiKey, quotient } from "./price-updates.mjs";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const broadcast = process.argv.includes("--broadcast");
const overrides = {
  manifest: process.env.ARC_MANIFEST,
  rpcUrl: process.env.ARC_RPC_URL,
  wallet: process.env.ARC_JOURNEY_WALLET,
  evidence: process.env.ARC_JOURNEY_EVIDENCE,
  priceSource: process.env.ARC_PRICE_SOURCE,
};
const rehearsal = Object.values(overrides).some(Boolean);
if (rehearsal && !isLoopback(overrides.rpcUrl ?? ""))
  throw new Error("The ARC_* rehearsal overrides require a loopback ARC_RPC_URL.");
const m = JSON.parse(readFileSync(overrides.manifest ?? "config/deployment.json"));
if (m.chainId !== ARC_TESTNET_ID) throw new Error("Expected an Arc testnet manifest");
if (m.status !== "deployed-and-verified") throw new Error(`The deployment is ${m.status}; run the deployment and verification first.`);
const rpcUrl = overrides.rpcUrl ?? m.rpcUrl;
const chain = arcTestnet(rpcUrl);
const c = createPublicClient({ chain, transport: http(rpcUrl) });
if ((await c.getChainId()) !== ARC_TESTNET_ID) throw new Error("Wrong chain");
const { privateKey } = JSON.parse(readFileSync(overrides.wallet ?? ".secrets/arc-journey-wallet.json"));
const account = privateKeyToAccount(privateKey);
if (m.deployer && account.address.toLowerCase() === m.deployer.toLowerCase())
  throw new Error("The journey wallet must not be the deployer.");
const w = createWalletClient({ account, chain, transport: http(rpcUrl) });
const pool = planArtifacts().pool.abi;
const oracleAbi = referenceArtifact(m).abi;
const usePyth = m.oracle === "pyth";
const market = m.eurcPool;
const read = (address, abi, functionName, args = []) => c.readContract({ address, abi, functionName, args });
const balances = async () => {
  const [native, usdc, eurc] = await Promise.all([
    c.getBalance({ address: account.address }),
    read(m.usdc, erc20Abi, "balanceOf", [account.address]),
    read(m.eurc, erc20Abi, "balanceOf", [account.address]),
  ]);
  return { nativeWei: String(native), usdc: String(usdc), eurc: String(eurc) };
};
/** Fresh Pyth data for the three feeds: Hermes on Arc testnet, MockPyth only in a loopback rehearsal. */
async function priceUpdate() {
  const ids = feedIds(m);
  if (overrides.priceSource === "mock") return mockUpdate(read, m.pyth.contract, ids, (await c.getBlock()).timestamp);
  return hermesUpdate(m.pyth.hermes, ids, pythApiKey());
}
const PROVIDE = 2_000000n,
  PROTECT = 2_000000n,
  GAS_RESERVE = 500000n;
const start = await balances();
const [reserved, maturity, maxAge] = await Promise.all([
  read(market, pool, "reservedBacking"),
  read(market, pool, "maturity"),
  read(m.eurcOracle, oracleAbi, "maxAge"),
]);
const now = (await c.getBlock()).timestamp;
const problems = [];
let quoted = null;
if (usePyth) {
  try {
    const update = await priceUpdate();
    const byId = Object.fromEntries(update.parsed.map((p) => [p.id.toLowerCase(), p]));
    quoted = quotient(byId[m.pyth.feeds.eurcUsd.toLowerCase()], byId[m.pyth.feeds.usdcUsd.toLowerCase()]);
    const fee = await read(m.pyth.contract, pythAbi, "getUpdateFee", [update.data]);
    await c.call({
      account: account.address,
      to: m.pyth.contract,
      data: encodeFunctionData({ abi: pythAbi, functionName: "updatePriceFeeds", args: [update.data] }),
      value: fee,
    });
  } catch (error) {
    problems.push(`a Pyth price update cannot be prepared or was rejected in simulation (${error.shortMessage ?? error.message})`);
  }
} else {
  quoted = await read(m.eurcOracle, oracleAbi, "price").catch(() => null);
  if (quoted === null) problems.push("the EURC reference price is unavailable; wait for the next Chronicle update");
}
if (BigInt(start.usdc) < PROVIDE + GAS_RESERVE) problems.push(`the wallet holds ${formatUnits(BigInt(start.usdc), 6)} USDC; it needs at least 2.5 (2 to provide, the rest for gas)`);
if (BigInt(start.eurc) < PROTECT) problems.push(`the wallet holds ${formatUnits(BigInt(start.eurc), 6)} EURC; it needs 2`);
if (now + 600n >= maturity) problems.push("the EURC market closes within 10 minutes; replace the featured markets first");
console.log(
  JSON.stringify({ wallet: account.address, market, oracle: m.oracle, start, quotedUsdcPerEurc: quoted === null ? null : String(quoted), maxAge: String(maxAge), providerEntryOpen: reserved === 0n, broadcast }),
);
if (problems.length || !broadcast) {
  console.log(problems.length ? `Not ready:\n${problems.map((p) => `  - ${p}`).join("\n")}` : "Ready. Pass --broadcast to send the journey.");
  process.exit(problems.length ? 1 : 0);
}
const fees = async () => {
  const e = await c.estimateFeesPerGas();
  return { maxFeePerGas: e.maxFeePerGas > 2n * MIN_BASE_FEE ? e.maxFeePerGas : 2n * MIN_BASE_FEE, maxPriorityFeePerGas: e.maxPriorityFeePerGas };
};
const steps = [];
/** Simulates, then sends with a 30% gas margin over the estimate, then waits for a successful receipt. */
async function send(label, address, abi, functionName, args = [], value = 0n) {
  const { request } = await c.simulateContract({ account, address, abi, functionName, args, value });
  const estimate = await c.estimateGas({ account, to: address, data: encodeFunctionData({ abi, functionName, args }), value });
  const hash = await w.writeContract({ ...request, gas: (estimate * 130n) / 100n, ...(await fees()) });
  const r = await c.waitForTransactionReceipt({ hash, timeout: 120000 });
  if (r.status !== "success") throw new Error(`${label} reverted (${hash})`);
  steps.push({ label, hash, blockNumber: String(r.blockNumber), gasUsed: String(r.gasUsed), gasLimit: String((estimate * 130n) / 100n) });
  console.log(`${label}: ${hash}`);
  return r;
}
let updates = 0;
/** Pyth is a pull oracle: push fresh prices right before a step that reads them. */
async function refreshPrice(context) {
  if (!usePyth) return;
  const update = await priceUpdate();
  const fee = await read(m.pyth.contract, pythAbi, "getUpdateFee", [update.data]);
  await send(`journey-pyth-update-${++updates}-${context}`, m.pyth.contract, pythAbi, "updatePriceFeeds", [update.data], fee);
}
const wait = async (seconds) => {
  if (isLoopback(rpcUrl)) {
    await c.request({ method: "evm_increaseTime", params: [seconds] });
    await c.request({ method: "evm_mine", params: [] });
  } else await new Promise((r) => setTimeout(r, seconds * 1000));
};
const deadline = async () => (await c.getBlock()).timestamp + 600n;
const min995 = (x) => (x * 995n + 999n) / 1000n;
const providerOpen = reserved === 0n;
if (providerOpen) {
  await send("journey-usdc-approve", m.usdc, erc20Abi, "approve", [market, PROVIDE]);
  await refreshPrice("before-provide");
  const [nav, total] = await Promise.all([read(market, pool, "juniorValue"), read(market, pool, "totalShares")]);
  await send("journey-provide-usdc", market, pool, "depositJuniorBounded", [PROVIDE, min995((PROVIDE * total) / nav), await deadline()]);
} else console.log("Provider entry is frozen by open positions; skipping the provider leg.");
await send("journey-eurc-approve", m.eurc, erc20Abi, "approve", [market, PROTECT]);
await refreshPrice("before-protect");
const quotedFloor = (PROTECT * (await read(m.eurcOracle, oracleAbi, "price"))) / 10n ** 6n;
const protectedReceipt = await send("journey-protect-eurc", market, pool, "protect", [PROTECT, min995(quotedFloor), await deadline()]);
const id = protectedReceipt.logs
  .filter((l) => l.address.toLowerCase() === market.toLowerCase())
  .map((l) => {
    try {
      return decodeEventLog({ abi: pool, data: l.data, topics: l.topics });
    } catch {
      return null;
    }
  })
  .find((e) => e?.eventName === "Protected")?.args.id;
if (id === undefined) throw new Error("No Protected event in the protection receipt");
const [, , floor] = await read(market, pool, "positions", [id]);
await wait(65);
await refreshPrice("before-asset-exit");
const [assetOut] = await read(market, pool, "previewPartialExit", [id, PROTECT / 2n]);
await send("journey-partial-asset-exit", market, pool, "partialExitAsset", [id, PROTECT / 2n, min995(assetOut), await deadline()]);
const [, remaining, remainingFloor] = await read(market, pool, "positions", [id]);
await send("journey-backing-exit", market, pool, "partialExitBacking", [id, remaining, remainingFloor, await deadline()]);
if (providerOpen) {
  if ((await read(market, pool, "earned", [account.address])) > 0n)
    await send("journey-claim-provider-fees", market, pool, "claimRewards", [account.address]);
  await send("journey-provider-notice", market, pool, "requestJuniorWithdrawal");
  await wait(125);
  if ((await read(market, pool, "reservedBacking")) === 0n) {
    const shares = await read(market, pool, "shares", [account.address]);
    const [backingOut, assetBack] = await read(market, pool, "previewJuniorWithdrawal", [account.address, shares]);
    await send("journey-provider-redeem", market, pool, "withdrawJuniorBounded", [shares, min995(backingOut), min995(assetBack), await deadline()]);
  } else console.log("Other holders' open positions freeze redemption; the notice stays active for a later run.");
}
const end = await balances();
let commit = null;
try {
  commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
} catch {}
const evidence = {
  network: rehearsal ? "REHEARSAL: local Anvil with chain ID 5042002 and stand-ins; NOT Arc testnet" : "Arc testnet (chain 5042002)",
  recordedAt: new Date().toISOString(),
  commit,
  deploymentId: m.deploymentId,
  oracle: m.oracle,
  wallet: account.address,
  market,
  positionId: String(id),
  entryClaimUsdcUnits: String(floor),
  start,
  end,
  steps,
  note: "Test tokens from Circle's faucet; no monetary value. A scripted wallet, not a user.",
};
const out = overrides.evidence ?? "docs/evidence/arc-testnet-journey.json";
mkdirSync("docs/evidence", { recursive: true });
writeFileSync(out, JSON.stringify(evidence, null, 2) + "\n");
console.log(`Journey complete: ${steps.length} confirmed transactions. Evidence: ${out}`);
