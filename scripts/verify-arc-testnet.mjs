/**
 * Reads back an Arc testnet deployment: runtime code, wiring, asset identities, oracle configuration, terms,
 * open epochs, creation seeds and every recorded receipt. Marks the manifest `deployed-and-verified` only if
 * every check passes. Read-only on chain.
 *
 * Rehearsal only: ARC_MANIFEST and ARC_RPC_URL may point at a disposable chain-5042002 Anvil (loopback only).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPublicClient, decodeEventLog, http, keccak256 } from "viem";
import {
  artifactProvenance,
  featuredMarkets,
  planArtifacts,
  terms,
  creationSeed,
} from "./setup-markets.mjs";
import {
  ARC_TESTNET_ID,
  arcTestnet,
  assetIdentities,
  chronicleAbi,
  erc20Abi,
  isLoopback,
} from "./arc-config.mjs";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const overrides = { manifest: process.env.ARC_MANIFEST, rpcUrl: process.env.ARC_RPC_URL };
if ((overrides.manifest || overrides.rpcUrl) && !isLoopback(overrides.rpcUrl ?? ""))
  throw new Error("ARC_MANIFEST and ARC_RPC_URL are rehearsal overrides and require a loopback ARC_RPC_URL.");
const manifestPath = overrides.manifest ?? "config/deployment.json";
const m = JSON.parse(readFileSync(manifestPath));
if (m.chainId !== ARC_TESTNET_ID || m.version !== 3) throw new Error("Expected an Arc testnet v3 manifest");
const rpcUrl = overrides.rpcUrl ?? m.rpcUrl;
const c = createPublicClient({ chain: arcTestnet(rpcUrl), transport: http(rpcUrl) });
if ((await c.getChainId()) !== ARC_TESTNET_ID) throw new Error("Wrong chain");
const read = (address, abi, functionName, args = []) =>
  c.readContract({ address, abi, functionName, args });
const same = (x, y) => Boolean(x && y) && x.toLowerCase() === y.toLowerCase();
const checks = [];
const pass = (text) => {
  checks.push(text);
};
const artifacts = planArtifacts();
if (!m.source) console.log("Note: the manifest records no source commit.");
else {
  const { hashes } = artifactProvenance(artifacts);
  const changed = Object.keys(hashes).filter(
    (id) => hashes[id].deployedBytecode !== m.source.artifacts?.[id]?.deployedBytecode,
  );
  if (changed.length)
    console.log(
      `Note: contracts/out differs from the build recorded at ${m.source.commit} for ${changed.join(", ")}; runtime code is compared with contracts/out.`,
    );
}
const pool = artifacts.pool.abi,
  factory = artifacts.factory.abi,
  adapter = artifacts.chronicle.abi;
/** Runtime code with every immutable slot zeroed, as listed in the artifact. */
function masked(code, a) {
  let out = code.toLowerCase();
  for (const ranges of Object.values(a.deployedBytecode.immutableReferences ?? {}))
    for (const { start, length } of ranges)
      out = out.slice(0, 2 + start * 2) + "0".repeat(length * 2) + out.slice(2 + (start + length) * 2);
  return out;
}
async function checkRuntime(label, address, a) {
  const code = await c.getCode({ address });
  if (!code || code === "0x") throw new Error(`Missing contract ${label}`);
  if (masked(code, a) === masked(a.deployedBytecode.object, a)) return;
  const recorded = m.source?.artifacts?.[a.id]?.deployedBytecode;
  throw new Error(
    `${label} runtime code does not match ${a.id}.` +
      (recorded && recorded !== keccak256(a.deployedBytecode.object)
        ? ` contracts/out differs from the build recorded at deployment; check out ${m.source.commit} and rebuild.`
        : ""),
  );
}
/** Successful receipt of a recorded deployment step: evidence that does not change with later use. */
async function recordedReceipt(label) {
  const tx = m.transactions.find((t) => t.label === label);
  if (!tx) throw new Error(`No recorded ${label} transaction`);
  const receipt = await c.getTransactionReceipt({ hash: tx.hash });
  if (receipt.status !== "success") throw new Error(`${label} did not succeed`);
  return receipt;
}
/** Decoded events emitted by `address` only. Arc also emits a system-level 18-decimal Transfer for USDC moves. */
const eventsFrom = (receipt, address, abi, eventName) =>
  receipt.logs
    .filter((log) => same(log.address, address))
    .flatMap((log) => {
      try {
        return [decodeEventLog({ abi, data: log.data, topics: log.topics })];
      } catch {
        return [];
      }
    })
    .filter((event) => event.eventName === eventName);
// 1. Runtime code of everything the plan deployed and the factory created.
for (const [field, key] of [
  ["scenarioOracle", "scenario"],
  ["eurcOracle", "chronicle"],
  ["cirbtcOracle", "chronicle"],
  ["factory", "factory"],
  ["eurcPool", "pool"],
  ["cirbtcPool", "pool"],
  ["scenarioPool", "pool"],
])
  await checkRuntime(field, m[field], artifacts[key]);
pass("runtime code of 3 oracles, the factory and 3 pools matches contracts/out (immutables masked)");
// 2. Canonical assets.
for (const [key, address, symbol, decimals] of assetIdentities(m)) {
  const [s, d] = await Promise.all([read(address, erc20Abi, "symbol"), read(address, erc20Abi, "decimals")]);
  if (s !== symbol || Number(d) !== decimals)
    throw new Error(`${key} at ${address} reports ${s}/${d}, expected ${symbol}/${decimals}`);
}
pass("USDC (6), EURC (6) and cirBTC (8) identities");
// 3. Factory wiring.
for (const [field, name] of [
  ["usdc", "backing"],
  ["deployer", "protocol"],
  ["eurc", "eurc"],
  ["cirbtc", "cirbtc"],
  ["eurcOracle", "eurcOracle"],
  ["cirbtcOracle", "cirbtcOracle"],
  ["scenarioOracle", "scenarioOracle"],
])
  if (!same(await read(m.factory, factory, name), m[field])) throw new Error(`Factory mismatch: ${name}`);
if ((await read(m.factory, factory, "CREATION_SEED")) !== creationSeed)
  throw new Error("Factory creation seed differs from the plan");
pass("factory backing, protocol, assets, oracles and creation seed");
// 4. Reference adapters: feeds, freshness limit, decimals and Chronicle whitelisting.
const zero = "0x0000000000000000000000000000000000000000";
for (const [field, feed, quote] of [
  ["eurcOracle", m.chronicle.eurcUsd, m.chronicle.usdcUsd],
  ["cirbtcOracle", m.chronicle.cirbtcUsdc, zero],
]) {
  const address = m[field];
  const [f, q, maxAge] = await Promise.all([
    read(address, adapter, "feed"),
    read(address, adapter, "quote"),
    read(address, adapter, "maxAge"),
  ]);
  if (!same(f, feed) || !same(q, quote)) throw new Error(`${field} reads unexpected feeds`);
  if (maxAge !== BigInt(m.maxPriceAge)) throw new Error(`${field} maximum price age differs from the manifest`);
  for (const source of [feed, quote].filter((x) => x !== zero))
    if (!(await read(source, chronicleAbi, "tolled", [address])))
      throw new Error(`${field} is not whitelisted on Chronicle feed ${source}`);
  try {
    const [price, age] = await Promise.all([read(address, adapter, "price"), read(address, adapter, "age")]);
    console.log(`${field}: ${Number(price) / 1e6} USDC per unit, oldest feed value ${age}s old (limit ${maxAge}s).`);
  } catch (error) {
    console.log(
      `Warning: ${field} has no usable price right now (${error.shortMessage ?? error.message}); new protection and asset exits revert until Chronicle updates.`,
    );
  }
}
pass("reference adapters read the manifest's Chronicle feeds with the manifest's maxPriceAge and are whitelisted");
// 5. Featured markets: identity, terms, open epoch and creation receipts.
const termKeys = Object.keys(terms);
if (!m.defaultTerms || termKeys.some((k) => m.defaultTerms[k] === undefined))
  throw new Error("Manifest does not record the featured market terms");
if (termKeys.some((k) => m.defaultTerms[k] !== terms[k]))
  console.log("Note: the current plan's featured terms differ from the deployed ones; only a new deployment would apply them.");
const now = (await c.getBlock()).timestamp;
const date = (seconds) => new Date(Number(seconds) * 1000).toISOString();
const decimalsOf = { [m.eurc.toLowerCase()]: 6, [m.cirbtc.toLowerCase()]: 8 };
for (const [field, asset, oracle] of featuredMarkets(m)) {
  const address = m[field];
  if (!(await read(m.factory, factory, "isPool", [address]))) throw new Error(`${field} is not registered`);
  const [backing, protectedToken, poolOracle, creator, protocol, unit, maturity, actual] = await Promise.all(
    ["backing", "protectedToken", "oracle", "creator", "protocol", "assetUnit", "maturity", "terms"].map((n) =>
      read(address, pool, n),
    ),
  );
  if (!same(backing, m.usdc) || !same(protectedToken, asset) || !same(poolOracle, oracle))
    throw new Error(`${field} identity mismatch`);
  if (!same(creator, m.deployer) || !same(protocol, m.deployer)) throw new Error(`${field} fee recipients mismatch`);
  if (unit !== 10n ** BigInt(decimalsOf[asset.toLowerCase()])) throw new Error(`${field} asset unit mismatch`);
  if (actual.some((n, i) => Number(n) !== m.defaultTerms[termKeys[i]])) throw new Error(`${field} terms mismatch`);
  // New protection requires chain time + exitDelay < maturity.
  if (now + BigInt(m.defaultTerms.exitDelay) >= maturity)
    throw new Error(
      `${field} matured at ${date(maturity)} (chain time ${date(now)}) and no longer accepts protection. Deploy replacement featured markets.`,
    );
  console.log(
    `${field} accepts protection until ${date(maturity)} (${(Number(maturity - now) / 86400).toFixed(1)} days left).`,
  );
  if (maturity - now < 3n * 86400n) console.log(`Warning: ${field} closes within three days.`);
  const replaced = (m.replacements ?? []).findLast((r) => r.completedAt && same(r.created?.[field], address));
  const receipt = await recordedReceipt(`${replaced ? `r${replaced.round}-` : ""}${field}-factory-create`);
  const created = eventsFrom(receipt, m.factory, factory, "PoolCreated");
  if (
    created.length !== 1 ||
    !same(created[0].args.pool, address) ||
    !same(created[0].args.creator, m.deployer) ||
    !same(created[0].args.asset, asset) ||
    !same(created[0].args.oracle, oracle) ||
    created[0].args.seed !== creationSeed
  )
    throw new Error(`${field} creation receipt lacks the expected PoolCreated`);
  const seeded = eventsFrom(receipt, address, pool, "JuniorDeposited");
  if (
    seeded.length !== 1 ||
    !same(seeded[0].args.owner, m.deployer) ||
    seeded[0].args.backingAmount !== creationSeed ||
    seeded[0].args.sharesMinted !== creationSeed * 10n ** 12n
  )
    throw new Error(`${field} creation receipt does not seed the deployer`);
  // The seed moved through the USDC ERC-20 interface: match on the USDC contract as emitter only.
  const seedTransfers = eventsFrom(receipt, m.usdc, erc20Abi, "Transfer").filter((t) => same(t.args.to, address));
  if (seedTransfers.length !== 1 || seedTransfers[0].args.value !== creationSeed)
    throw new Error(`${field} creation receipt lacks the 6-decimal USDC seed transfer`);
  if (eventsFrom(receipt, address, pool, "Protected").length) throw new Error(`${field} expected no seeded holder exposure`);
}
pass("3 featured markets: registered, USDC-backed, correct asset/oracle/unit/terms, open epochs, seeded by their creation receipts");
// 6. Every recorded receipt.
for (const tx of m.transactions)
  if ((await c.getTransactionReceipt({ hash: tx.hash })).status !== "success")
    throw new Error(`Unconfirmed transaction ${tx.label}`);
pass(`${m.transactions.length} recorded deployment receipts succeeded`);
if (m.failedTransactions?.length)
  console.log(`Note: ${m.failedTransactions.length} reverted step(s) are recorded under failedTransactions; reverts have no state effect.`);
m.status = "deployed-and-verified";
m.verifiedAt = new Date().toISOString();
m.verification = { checkedAt: m.verifiedAt, checks };
writeFileSync(manifestPath, JSON.stringify(m, null, 2) + "\n");
console.log(
  `Verified Arc testnet deployment${m.source?.commit ? ` from source ${m.source.commit}` : ""}:\n${checks.map((x) => `  - ${x}`).join("\n")}`,
);
