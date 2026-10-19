/** Read-only evidence capture after the local browser tests; never broadcasts. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { createPublicClient, http, decodeFunctionData } from "viem";
import { LOCAL_RPC, erc20Abi } from "./arc-config.mjs";
import { pythAbi } from "./price-updates.mjs";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const client = createPublicClient({ transport: http(LOCAL_RPC) });
if ((await client.getChainId()) !== 31337)
  throw new Error("Evidence capture is local-only");
const manifest = JSON.parse(readFileSync(".local/deployment.json"));
if (manifest.chainId !== 31337 || manifest.rpcUrl !== LOCAL_RPC)
  throw new Error("Unexpected local manifest");
const accounts = await client.request({ method: "eth_accounts" });
const browserSigners = accounts.slice(2, 4).map((a) => a.toLowerCase());
const poolAbi = JSON.parse(readFileSync("config/abi/ShieldPool.json"));
const abi = [
  ...poolAbi,
  ...JSON.parse(readFileSync("config/abi/IERC20Metadata.json")),
  ...pythAbi,
];
const last = await client.getBlockNumber();
const transactions = [];
for (let blockNumber = 1n; blockNumber <= last; blockNumber++) {
  const block = await client.getBlock({
    blockNumber,
    includeTransactions: true,
  });
  for (const tx of block.transactions) {
    if (!browserSigners.includes(tx.from.toLowerCase())) continue;
    const receipt = await client.getTransactionReceipt({ hash: tx.hash });
    let operation = "unknown";
    try {
      operation = decodeFunctionData({ abi, data: tx.input }).functionName;
    } catch {}
    transactions.push({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      operation,
      value: String(tx.value),
      status: receipt.status,
      blockNumber: String(blockNumber),
    });
  }
}
const read = (address, functionName, args = []) =>
  client.readContract({ address, abi: poolAbi, functionName, args });
const browser = accounts[2];
const [position, shares, earned, eurcHeld] = await Promise.all([
  read(manifest.eurcPool, "positions", [1n]),
  read(manifest.eurcPool, "shares", [browser]),
  read(manifest.eurcPool, "earned", [browser]),
  client.readContract({
    address: manifest.eurc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [browser],
  }),
]);
assert.equal(
  position[0].toLowerCase(),
  browser.toLowerCase(),
  "browser wallet owns protection #1",
);
assert.equal(
  position[1],
  5_000000n,
  "5 EURC remain protected after the 5 EURC asset exit",
);
assert.equal(position[2], 5_500000n, "the remaining entry claim is 5.5 USDC");
assert.ok(shares > 0n, "browser wallet holds provider shares");
assert.equal(earned, 0n, "earned fees were claimed");
const operations = transactions.map((t) => t.operation);
for (const op of [
  "approve",
  "depositJuniorBounded",
  "updatePriceFeeds",
  "protect",
  "partialExitAsset",
  "claimRewards",
])
  assert.ok(operations.includes(op), `browser journey includes ${op}`);
assert.equal(
  operations.filter((op) => op === "protect").length,
  1,
  "the rejected-update and in-flight checks sent no protection",
);
assert.equal(
  operations.filter((op) => op === "updatePriceFeeds").length,
  2,
  "one Pyth update before the protection and one before the asset exit",
);
const updateIndex = operations.indexOf("updatePriceFeeds");
assert.equal(
  operations[updateIndex + 1],
  "protect",
  "the update is sent immediately before the protection",
);
const sourceHashes = {};
for (const file of [
  "src/Workflows.tsx",
  "src/state.tsx",
  "src/chain.ts",
  "src/ui.tsx",
  "contracts/src/ShieldPool.sol",
  "contracts/src/ShieldOracles.sol",
  "contracts/src/ShieldPyth.sol",
  "src/pyth.ts",
  "tests/browser/local-lifecycle.spec.ts",
])
  sourceHashes[file] = createHash("sha256")
    .update(readFileSync(file))
    .digest("hex");
const evidence = {
  network:
    "Disposable local Anvil only (chain 31337); no Arc testnet transaction",
  chainId: 31337,
  recordedAt: new Date().toISOString(),
  browserDriver:
    "Playwright with an injected test provider that forwards to unlocked local Anvil accounts; no wallet extension approval screens. Prices: local MockPyth, pushed by the app before each price-reading action",
  browserTransactionCount: transactions.length,
  allBrowserReceiptsSuccessful: transactions.every(
    (t) => t.status === "success",
  ),
  parentCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  finalContractAssertions: {
    protectionOwner: position[0],
    remainingProtectedEurcUnits: String(position[1]),
    remainingEntryClaimUsdcUnits: String(position[2]),
    providerShares: String(shares),
    unclaimedProviderFees: String(earned),
    browserWalletEurcUnits: String(eurcHeld),
    allPassed: true,
  },
  sourceHashes,
  transactions,
};
mkdirSync("docs/evidence/e2e", { recursive: true });
writeFileSync(
  "docs/evidence/e2e/browser-receipts.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(
  `${transactions.length} browser-signed local transactions captured; all successful: ${evidence.allBrowserReceiptsSuccessful}.`,
);
