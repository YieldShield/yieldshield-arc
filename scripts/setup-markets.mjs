import { existsSync, readFileSync } from "node:fs";
import { decodeEventLog, keccak256, zeroAddress } from "viem";
import { erc20Abi } from "./arc-config.mjs";
export const artifact = (source, name = source) => ({
  ...JSON.parse(readFileSync(`contracts/out/${source}.sol/${name}.json`)),
  id: `${source}.sol:${name}`,
});
/** Artifacts the plan deploys; the factory itself creates the pools. */
export const planArtifacts = () => ({
  scenario: artifact("ShieldOracles", "ShieldScenarioOracle"),
  chronicle: artifact("ShieldOracles", "ShieldChronicleOracle"),
  pythOracle: artifact("ShieldPyth", "ShieldPythOracle"),
  factory: artifact("ShieldFactory"),
  pool: artifact("ShieldPool"),
});
/** The reference adapter artifact the manifest's oracle provider uses ("pyth"; "chronicle" is kept as an option). */
export const referenceArtifact = (m, a = planArtifacts()) =>
  (m.oracle ?? "chronicle") === "pyth" ? a.pythOracle : a.chronicle;
/** Constructor arguments of the two reference adapters. */
export function referenceArgs(m) {
  if ((m.oracle ?? "chronicle") === "pyth")
    return {
      eurcOracle: [
        m.pyth.contract,
        m.pyth.feeds.eurcUsd,
        m.pyth.feeds.usdcUsd,
        BigInt(m.pyth.maxAge),
        BigInt(m.pyth.maxConfidenceBps),
      ],
      cirbtcOracle: [
        m.pyth.contract,
        m.pyth.feeds.btcUsd,
        m.pyth.feeds.usdcUsd,
        BigInt(m.pyth.maxAge),
        BigInt(m.pyth.maxConfidenceBps),
      ],
    };
  const maxAge = BigInt(m.maxPriceAge);
  return {
    eurcOracle: [m.chronicle.eurcUsd, m.chronicle.usdcUsd, maxAge, m.chronicle.selfKisser],
    cirbtcOracle: [m.chronicle.cirbtcUsdc, zeroAddress, maxAge, m.chronicle.selfKisser],
  };
}
/**
 * Local stand-ins for the canonical Arc assets, Pyth, the Chronicle feeds and the SelfKisser. They are only ever
 * deployed on chain 31337 or installed with anvil_setCode on a disposable Anvil; never on Arc.
 */
export const localArtifacts = () => ({
  usdc: artifact("ShieldMocks", "MockUSDC"),
  eurc: artifact("ShieldMocks", "MockEURC"),
  cirbtc: artifact("ShieldMocks", "MockCirBTC"),
  pyth: artifact("ShieldMocks", "MockPyth"),
  feed: artifact("ShieldMocks", "MockChronicle"),
  selfKisser: artifact("ShieldMocks", "MockSelfKisser"),
});
/** Bytecode hashes, plus source files that differ from what the artifacts were compiled from. */
export function artifactProvenance(artifacts) {
  const hashes = {},
    stale = new Set();
  for (const a of Object.values(artifacts)) {
    hashes[a.id] = {
      bytecode: keccak256(a.bytecode.object),
      deployedBytecode: keccak256(a.deployedBytecode.object),
    };
    for (const [path, source] of Object.entries(a.metadata?.sources ?? {})) {
      const file = `contracts/${path}`;
      if (!existsSync(file) || keccak256(readFileSync(file)) !== source.keccak256)
        stale.add(file);
    }
  }
  return { hashes, stale: [...stale].sort() };
}
/**
 * Featured market terms. Epochs are fixed and never renewed, so featured markets use the
 * 30-day contract maximum (ShieldPool EPOCH_LIMIT) to stay open as long as possible.
 */
export const terms = {
  collateralBps: 15000,
  juniorFeeBps: 1000,
  creatorFeeBps: 100,
  epochSeconds: 2592000,
  exitDelay: 60,
  juniorNotice: 120,
};
/** USDC the factory takes from the creator as each market's seed (ShieldFactory CREATION_SEED). */
export const creationSeed = 5_000000n;
/** Featured markets whose creation reads a reference price (and so, with Pyth, needs a fresh update first). */
export const REFERENCE_MARKETS = ["eurcPool", "cirbtcPool"];
/** Featured markets: manifest field, protected asset, oracle field. */
export const featuredMarkets = (m) => [
  ["eurcPool", m.eurc, m.eurcOracle],
  ["cirbtcPool", m.cirbtc, m.cirbtcOracle],
  ["scenarioPool", m.eurc, m.scenarioOracle],
];
/** USDC needed to seed every featured market. */
export const seedTotal = creationSeed * 3n;
/**
 * Shared deployment plan; the executor owns signing, receipts and durable progress. With Pyth, `updatePrices`
 * pushes a fresh price update immediately before every step that reads a reference price.
 */
export async function setupMarkets({ manifest: m, account, deploy, call, save, updatePrices, local = false }) {
  // Executors append to m.transactions only for newly mined steps.
  const recordedBefore = m.transactions.length;
  const a = planArtifacts();
  const reference = referenceArtifact(m, a);
  const args = referenceArgs(m);
  await deploy("scenarioOracle", a.scenario);
  await deploy("eurcOracle", reference, args.eurcOracle);
  await deploy("cirbtcOracle", reference, args.cirbtcOracle);
  await deploy("factory", a.factory, [
    m.usdc,
    account,
    m.eurc,
    m.cirbtc,
    m.eurcOracle,
    m.cirbtcOracle,
    m.scenarioOracle,
  ]);
  const run = async (label, address, abi, functionName, args = []) =>
    call(label, { address, abi, functionName, args });
  const deadline = () => BigInt(Math.floor(Date.now() / 1000) + 86400);
  const pairs = featuredMarkets(m);
  const missing = pairs.filter(([field]) => !m[field]);
  if (missing.length) {
    // The manifest describes the featured markets that exist, not the current plan.
    if (
      pairs.some(([field]) => m[field]) &&
      JSON.stringify(m.defaultTerms) !== JSON.stringify(terms)
    )
      throw new Error(
        "Some featured markets were created with different terms; start a new deployment instead of mixing terms.",
      );
    m.defaultTerms = terms;
    await save();
    // One exact approval covers every seed; it is a recorded step, so a resumed run does not repeat it.
    await run("factory-usdc-approve", m.usdc, erc20Abi, "approve", [m.factory, seedTotal]);
  }
  for (const [field, asset, oracle] of pairs) {
    if (m[field]) continue;
    if (m.oracle === "pyth" && REFERENCE_MARKETS.includes(field)) await updatePrices(`before-${field}`);
    const receipt = await run(`${field}-factory-create`, m.factory, a.factory.abi, "createPool", [
      asset,
      oracle,
      terms,
      deadline(),
    ]);
    m[field] = createdPool(receipt, a.factory.abi, m.factory);
    if (!m[field]) throw new Error(`Missing factory event for ${field}`);
    await save();
  }
  // No holder positions are seeded: every featured market accepts provider capital first.
  m.version = 3;
  // A rerun that mined nothing new keeps the existing (possibly verified) status.
  const deployed = local ? "local-only-verified" : "deployed-awaiting-verification";
  if (
    m.transactions.length > recordedBefore ||
    ![deployed, "deployed-and-verified"].includes(m.status)
  )
    m.status = deployed;
  await save();
  return a;
}
/** The pool address from a factory creation receipt's PoolCreated event, emitted by `factory`. */
export function createdPool(receipt, factoryAbi, factory) {
  for (const log of receipt.logs) {
    if (factory && log.address.toLowerCase() !== factory.toLowerCase()) continue;
    try {
      const event = decodeEventLog({ abi: factoryAbi, data: log.data, topics: log.topics });
      if (event.eventName === "PoolCreated") return event.args.pool;
    } catch {}
  }
  return null;
}
/** Label prefix for a replacement round's steps, so every round signs its own intents. */
export const roundPrefix = (round) => `r${round}-`;
/** The open replacement round, if a previous run stopped before switching the manifest. */
export const openRound = (m) => (m.replacements ?? []).find((r) => !r.completedAt);
/**
 * Replaces the three featured markets with new ones on the recorded terms. Epochs are fixed and cannot be
 * extended, so matured featured markets are superseded rather than renewed. The manifest keeps naming the
 * current markets until all replacements exist, then records the superseded ones in `replacements[n].retired`.
 */
export async function replaceFeaturedMarkets({ manifest: m, account, call, read, save, updatePrices }) {
  if (JSON.stringify(m.defaultTerms) !== JSON.stringify(terms))
    throw new Error(
      "The featured terms in this checkout differ from the deployed ones; replacements must use the recorded terms.",
    );
  const a = planArtifacts();
  const markets = featuredMarkets(m);
  m.replacements ??= [];
  let round = openRound(m);
  if (!round) {
    const held = await read(m.usdc, erc20Abi, "balanceOf", [account]);
    if (held < seedTotal)
      throw new Error(
        `The deployer holds ${held} USDC base units; this round needs ${seedTotal} for seeds. Fund it from https://faucet.circle.com (Arc Testnet) first.`,
      );
    round = {
      round: m.replacements.length + 1,
      openedAt: new Date().toISOString(),
      created: {},
    };
    m.replacements.push(round);
    await save();
  }
  const prefix = roundPrefix(round.round);
  const run = async (label, address, abi, functionName, args = []) =>
    call(prefix + label, { address, abi, functionName, args });
  const deadline = () => BigInt(Math.floor(Date.now() / 1000) + 86400);
  await run("factory-usdc-approve", m.usdc, erc20Abi, "approve", [m.factory, seedTotal]);
  for (const [field, asset, oracle] of markets) {
    if (round.created[field]) continue;
    if (m.oracle === "pyth" && REFERENCE_MARKETS.includes(field)) await updatePrices(`${prefix}before-${field}`);
    const receipt = await run(`${field}-factory-create`, m.factory, a.factory.abi, "createPool", [
      asset,
      oracle,
      terms,
      deadline(),
    ]);
    round.created[field] = createdPool(receipt, a.factory.abi, m.factory);
    if (!round.created[field]) throw new Error(`Missing factory event for ${field}`);
    await save();
  }
  round.retired = Object.fromEntries(markets.map(([field]) => [field, m[field]]));
  for (const [field] of markets) m[field] = round.created[field];
  round.completedAt = new Date().toISOString();
  m.status = "deployed-awaiting-verification";
  await save();
  return round;
}
