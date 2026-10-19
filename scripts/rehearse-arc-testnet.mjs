/**
 * Full deploy + verify rehearsal against a disposable Anvil that uses Arc testnet's chain ID (5042002) and
 * minimum base fee (20 gwei), with local stand-ins installed at the CANONICAL Arc addresses (USDC, EURC, cirBTC,
 * Pyth, the three Chronicle feeds and the SelfKisser). Pyth updates are MockPyth data (ARC_PRICE_SOURCE=mock). Runs the real deploy-arc-testnet.mjs and verify-arc-testnet.mjs
 * through their loopback-only rehearsal overrides, with a disposable signer under .local/rehearsal/.
 * Writes docs/evidence/arc-rehearsal.json. Nothing is sent to Arc testnet.
 */
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http, keccak256, parseTransaction, toHex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { localArtifacts } from "./setup-markets.mjs";
import { ARC_TESTNET_ID, LOCAL_RPC, MIN_BASE_FEE, arcTestnet, chronicleAbi, erc20Abi } from "./arc-config.mjs";
import { pythAbi } from "./price-updates.mjs";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const dir = ".local/rehearsal";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const anvil = spawn(
  "anvil",
  ["--host", "127.0.0.1", "--port", "8567", "--chain-id", String(ARC_TESTNET_ID), "--base-fee", String(MIN_BASE_FEE), "--silent"],
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
  if (i > 40) throw new Error("Anvil did not start on 8567 (is another Anvil running there?)");
  await new Promise((r) => setTimeout(r, 250));
}
const template = JSON.parse(readFileSync("config/deployment.json"));
const [funder] = await c.request({ method: "eth_accounts", params: [] });
const w = createWalletClient({ account: funder, chain, transport: http(LOCAL_RPC) });
// 1. Stand-ins at the canonical addresses. They keep no constructor state, so runtime code is enough.
const l = localArtifacts();
const installs = [
  ["USDC", template.usdc, l.usdc],
  ["EURC", template.eurc, l.eurc],
  ["cirBTC", template.cirbtc, l.cirbtc],
  ["Pyth", template.pyth.contract, l.pyth],
  ["Chronicle EURC/USD", template.chronicle.eurcUsd, l.feed],
  ["Chronicle USDC/USD", template.chronicle.usdcUsd, l.feed],
  ["Chronicle CIRBTC/USDC", template.chronicle.cirbtcUsdc, l.feed],
  ["Chronicle SelfKisser", template.chronicle.selfKisser, l.selfKisser],
];
for (const [, address, a] of installs)
  await c.request({ method: "anvil_setCode", params: [address, a.deployedBytecode.object] });
const send = async (address, abi, functionName, args) => {
  const hash = await w.writeContract({ address, abi, functionName, args, chain });
  const r = await c.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${functionName} on ${address} reverted`);
};
const now = (await c.getBlock()).timestamp;
// Pyth: 1 wei per price like Arc testnet's contract; values of the shape Pyth publishes (expo -8), stamped fresh.
await send(template.pyth.contract, pythAbi, "setFee", [1n]);
await send(template.pyth.contract, pythAbi, "setPrice", [template.pyth.feeds.eurcUsd, 116524999n, 121170n, -8, now]);
await send(template.pyth.contract, pythAbi, "setPrice", [template.pyth.feeds.usdcUsd, 99994808n, 36282n, -8, now]);
await send(template.pyth.contract, pythAbi, "setPrice", [template.pyth.feeds.btcUsd, 8539753395754n, 2780604245n, -8, now]);
// Chronicle values read from the real feeds on 19 October 2026 (18 decimals), stamped fresh (Chronicle option).
await send(template.chronicle.eurcUsd, chronicleAbi, "set", [1_123300126579703113n, now]);
await send(template.chronicle.usdcUsd, chronicleAbi, "set", [999837840390000000n, now]);
await send(template.chronicle.cirbtcUsdc, chronicleAbi, "set", [81827183708578801548325n, now]);
// 2. A disposable signer funded like one Circle faucet claim: 20 USDC. On Arc the native (18-decimal) and
//    ERC-20 (6-decimal) views are one balance; Anvil keeps them separate, so both are set to the same 20 USDC.
const signerKey = generatePrivateKey();
const signer = privateKeyToAccount(signerKey);
writeFileSync(`${dir}/signer.json`, JSON.stringify({ address: signer.address, privateKey: signerKey }, null, 2) + "\n", {
  mode: 0o600,
});
const faucetClaim = 20_000000n;
await send(template.usdc, erc20Abi, "mint", [signer.address, faucetClaim]);
await c.request({ method: "anvil_setBalance", params: [signer.address, toHex(faucetClaim * 10n ** 12n)] });
// 3. A pre-deployment manifest naming the rehearsal signer.
const manifestPath = `${dir}/deployment.json`;
writeFileSync(manifestPath, JSON.stringify({ ...template, deployer: signer.address }, null, 2) + "\n");
const env = {
  ...process.env,
  ARC_MANIFEST: manifestPath,
  ARC_RPC_URL: LOCAL_RPC,
  ARC_SIGNER_FILE: `${dir}/signer.json`,
  ARC_INTENTS_DIR: `${dir}/transactions`,
  ARC_PRICE_SOURCE: "mock",
};
const runScript = (script, args = []) => {
  const r = spawnSync("node", [script, ...args], { env, encoding: "utf8" });
  const output = (r.stdout + r.stderr).trim();
  console.log(`$ node ${script} ${args.join(" ")}\n${output}\n`);
  return { exitCode: r.status, output };
};
const preflight = runScript("scripts/deploy-arc-testnet.mjs");
if (preflight.exitCode !== 0) throw new Error("Rehearsal preflight failed");
const broadcastRun = runScript("scripts/deploy-arc-testnet.mjs", ["--broadcast"]);
if (broadcastRun.exitCode !== 0) throw new Error("Rehearsal broadcast failed");
const verifyRun = runScript("scripts/verify-arc-testnet.mjs");
if (verifyRun.exitCode !== 0) throw new Error("Rehearsal verification failed");
const resumeRun = runScript("scripts/deploy-arc-testnet.mjs", ["--broadcast"]);
if (resumeRun.exitCode !== 0 || !/Nothing to send/.test(resumeRun.output)) throw new Error("A rerun should send nothing");
// A second disposable wallet runs the public-testnet journey script, funded like one USDC and one EURC claim.
const journeyKey = generatePrivateKey();
const journeyWallet = privateKeyToAccount(journeyKey);
writeFileSync(`${dir}/journey-wallet.json`, JSON.stringify({ address: journeyWallet.address, privateKey: journeyKey }, null, 2) + "\n", {
  mode: 0o600,
});
await send(template.usdc, erc20Abi, "mint", [journeyWallet.address, faucetClaim]);
await send(template.eurc, erc20Abi, "mint", [journeyWallet.address, faucetClaim]);
await c.request({ method: "anvil_setBalance", params: [journeyWallet.address, toHex(faucetClaim * 10n ** 12n)] });
env.ARC_JOURNEY_WALLET = `${dir}/journey-wallet.json`;
env.ARC_JOURNEY_EVIDENCE = `${dir}/journey.json`;
const journeyCheck = runScript("scripts/testnet-journey.mjs");
if (journeyCheck.exitCode !== 0) throw new Error("Journey readiness check failed");
const journeyRun = runScript("scripts/testnet-journey.mjs", ["--broadcast"]);
if (journeyRun.exitCode !== 0) throw new Error("Journey failed");
const journey = JSON.parse(readFileSync(`${dir}/journey.json`));
// 4. Measurements and evidence.
const deployed = JSON.parse(readFileSync(manifestPath));
const intentDir = `${dir}/transactions/${deployed.deploymentId}`;
const gasLimits = Object.fromEntries(
  readdirSync(intentDir).map((f) => {
    const intent = JSON.parse(readFileSync(`${intentDir}/${f}`));
    return [intent.label, String(parseTransaction(intent.serialized).gas)];
  }),
);
const gasUsed = deployed.transactions.reduce((n, t) => n + BigInt(t.gasUsed), 0n);
const gasLimit = Object.values(gasLimits).reduce((n, g) => n + BigInt(g), 0n);
const [usdcLeft, nativeLeft] = await Promise.all([
  c.readContract({ address: template.usdc, abi: erc20Abi, functionName: "balanceOf", args: [signer.address] }),
  c.getBalance({ address: signer.address }),
]);
const sourceHash = {};
for (const file of [
  "contracts/src/ShieldPool.sol",
  "contracts/src/ShieldFactory.sol",
  "contracts/src/ShieldOracles.sol",
  "contracts/test/ShieldMocks.sol",
  "scripts/arc-config.mjs",
  "scripts/setup-markets.mjs",
  "scripts/deploy-arc-testnet.mjs",
  "scripts/verify-arc-testnet.mjs",
  "scripts/rehearse-arc-testnet.mjs",
  "scripts/testnet-journey.mjs",
  "scripts/price-updates.mjs",
  "contracts/src/ShieldPyth.sol",
])
  sourceHash[file] = keccak256(toHex(readFileSync(file)));
const evidence = {
  network:
    "Local Anvil with Arc testnet's chain ID 5042002 and 20 gwei base fee; local stand-ins installed at the canonical Arc USDC, EURC, cirBTC, Pyth (MockPyth data), Chronicle feed and SelfKisser addresses. NOT Arc testnet.",
  oracle: template.oracle,
  chainId: ARC_TESTNET_ID,
  createdAt: new Date().toISOString(),
  parentCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  sourceHash,
  rehearsalSigner: `${signer.address} (disposable, generated for this run and discarded)`,
  standIns: installs.map(([name, address]) => ({ name, address })),
  funding: {
    emulatedFaucetClaimUsdc: "20",
    note: "Anvil keeps native and ERC-20 balances separate; both were set to 20 USDC to emulate Arc's single balance.",
    usdcLeftAfterSeeds: String(usdcLeft),
    nativeWeiLeftAfterGas: String(nativeLeft),
  },
  deploymentId: deployed.deploymentId,
  status: deployed.status,
  transactions: deployed.transactions.map((t) => ({ ...t, gasLimit: gasLimits[t.label] })),
  totals: { transactions: deployed.transactions.length, gasUsed: String(gasUsed), gasLimit: String(gasLimit) },
  contracts: Object.fromEntries(
    ["scenarioOracle", "eurcOracle", "cirbtcOracle", "factory", "eurcPool", "cirbtcPool", "scenarioPool"].map((k) => [k, deployed[k]]),
  ),
  verification: deployed.verification,
  rerunSentNothing: true,
  journeyFromSecondWallet: {
    wallet: `${journey.wallet} (disposable)`,
    steps: journey.steps,
    start: journey.start,
    end: journey.end,
    entryClaimUsdcUnits: journey.entryClaimUsdcUnits,
  },
  preflightOutput: preflight.output.split("\n"),
};
mkdirSync("docs/evidence", { recursive: true });
writeFileSync("docs/evidence/arc-rehearsal.json", JSON.stringify(evidence, null, 2) + "\n");
console.log(
  `Rehearsal journey: ${journey.steps.length} transactions from a second wallet.`,
);
console.log(
  `Rehearsal: ${deployed.transactions.length} transactions, ${gasUsed} gas used, ${gasLimit} gas limit; status ${deployed.status}. Evidence: docs/evidence/arc-rehearsal.json`,
);
stop();
process.exit(0);
