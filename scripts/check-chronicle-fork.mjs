/**
 * Read-only check of the Chronicle adapter against the REAL Arc testnet feeds and SelfKisser, on a local Anvil
 * fork (port 8567). Deploys ShieldChronicleOracle on the fork only; nothing is sent to Arc testnet.
 * Writes docs/evidence/chronicle-fork-check.json.
 */
import { spawn, execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http, keccak256, toHex, zeroAddress } from "viem";
import { artifact } from "./setup-markets.mjs";
import { ARC_TESTNET_ID, LOCAL_RPC, arcTestnet, chronicleAbi } from "./arc-config.mjs";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const m = JSON.parse(readFileSync("config/deployment.json"));
const anvil = spawn(
  "anvil",
  ["--host", "127.0.0.1", "--port", "8567", "--fork-url", m.rpcUrl, "--chain-id", String(ARC_TESTNET_ID), "--silent"],
  { stdio: "ignore" },
);
const stop = () => anvil.kill("SIGTERM");
process.on("exit", stop);
const chain = arcTestnet(LOCAL_RPC);
const c = createPublicClient({ chain, transport: http(LOCAL_RPC) });
for (let i = 0; ; i++) {
  try {
    if ((await c.getChainId()) === ARC_TESTNET_ID) break;
  } catch {}
  if (i > 60) throw new Error("Anvil fork did not start");
  await new Promise((r) => setTimeout(r, 500));
}
const [account] = await c.request({ method: "eth_accounts", params: [] });
const w = createWalletClient({ account, chain, transport: http(LOCAL_RPC) });
const adapter = artifact("ShieldOracles", "ShieldChronicleOracle");
const block = await c.getBlock();
async function deployAdapter(feed, quote, maxAge) {
  const hash = await w.deployContract({
    abi: adapter.abi,
    bytecode: adapter.bytecode.object,
    args: [feed, quote, maxAge, m.chronicle.selfKisser],
  });
  const r = await c.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error("adapter deployment reverted on the fork");
  return r.contractAddress;
}
const read = (address, abi, functionName, args = []) => c.readContract({ address, abi, functionName, args });
const result = async (address) => {
  try {
    const [price, age] = await Promise.all([read(address, adapter.abi, "price"), read(address, adapter.abi, "age")]);
    return { price: String(price), ageSeconds: String(age) };
  } catch (error) {
    return { revert: (error.shortMessage ?? error.message).split("\n").slice(-1)[0].trim() };
  }
};
const raw = {};
for (const [name, feed] of [
  ["EURC/USD", m.chronicle.eurcUsd],
  ["USDC/USD", m.chronicle.usdcUsd],
  ["CIRBTC/USDC", m.chronicle.cirbtcUsdc],
]) {
  const [ok, value, updatedAt] = await read(feed, chronicleAbi, "tryReadWithAge");
  raw[name] = { feed, ok, value: String(value), updatedAt: new Date(Number(updatedAt) * 1000).toISOString(), ageSeconds: String(block.timestamp - updatedAt) };
}
const checks = [];
for (const [label, feed, quote] of [
  ["EURC (EURC/USD ÷ USDC/USD)", m.chronicle.eurcUsd, m.chronicle.usdcUsd],
  ["cirBTC (CIRBTC/USDC)", m.chronicle.cirbtcUsdc, zeroAddress],
]) {
  const strict = await deployAdapter(feed, quote, BigInt(m.maxPriceAge));
  const daily = await deployAdapter(feed, quote, 86400n);
  const tolled = await Promise.all(
    [feed, quote].filter((x) => x !== zeroAddress).map((f) => read(f, chronicleAbi, "tolled", [strict])),
  );
  checks.push({
    market: label,
    adapterWhitelistedBySelfKisser: tolled.every(Boolean),
    withMaxAge10800: await result(strict),
    withMaxAge86400: await result(daily),
  });
}
const evidence = {
  network: "Local Anvil fork of Arc testnet (chain 5042002) at the block below; adapters were deployed on the fork only. Nothing was sent to Arc testnet.",
  forkBlock: String(block.number),
  forkBlockTime: new Date(Number(block.timestamp) * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  parentCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  sourceHash: Object.fromEntries(
    ["contracts/src/ShieldOracles.sol", "scripts/check-chronicle-fork.mjs"].map((f) => [f, keccak256(toHex(readFileSync(f)))]),
  ),
  selfKisser: m.chronicle.selfKisser,
  feeds: raw,
  checks,
};
mkdirSync("docs/evidence", { recursive: true });
writeFileSync("docs/evidence/chronicle-fork-check.json", JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify(evidence, null, 2));
stop();
process.exit(0);
