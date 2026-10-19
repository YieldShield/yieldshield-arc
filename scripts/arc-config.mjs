/** Shared Arc testnet constants for the deployment scripts (verified 19 October 2026; see docs/RESEARCH_AND_SCOPE.md). */
import { defineChain, parseAbi } from "viem";
export const ARC_TESTNET_ID = 5042002;
export const LOCAL_CHAIN_ID = 31337;
/** The one Anvil port this repository uses (the sibling deployment repos use others). */
export const LOCAL_RPC = "http://127.0.0.1:8567";
export const arcTestnet = (rpcUrl = "https://rpc.testnet.arc.io") =>
  defineChain({
    id: ARC_TESTNET_ID,
    name: "Arc Testnet",
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    blockExplorers: {
      default: { name: "Arc Testnet Explorer", url: "https://explorer.testnet.arc.io" },
    },
    contracts: {
      multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11", blockCreated: 0 },
    },
    testnet: true,
  });
/** Arc's mempool silently drops transactions whose maxFeePerGas is below the 20 gwei minimum base fee. */
export const MIN_BASE_FEE = 20_000_000_000n;
/** Native USDC has 18 decimals, its ERC-20 interface 6: one ERC-20 unit is 10^12 native wei. */
export const NATIVE_PER_USDC_UNIT = 10n ** 12n;
export const erc20Abi = parseAbi([
  "function approve(address spender, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function mint(address to, uint256 amount)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);
export const chronicleAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function tryReadWithAge() view returns (bool, uint256, uint256)",
  "function tolled(address) view returns (bool)",
  "function set(uint256 value, uint256 updatedAt)",
]);
/** Expected on-chain identities of the canonical assets. */
export const assetIdentities = (m) => [
  ["usdc", m.usdc, "USDC", 6],
  ["eurc", m.eurc, "EURC", 6],
  ["cirbtc", m.cirbtc, "cirBTC", 8],
];
/** The Chronicle feeds the reference adapters read. */
export const feeds = (m) => [
  ["EURC/USD", m.chronicle.eurcUsd],
  ["USDC/USD", m.chronicle.usdcUsd],
  ["CIRBTC/USDC", m.chronicle.cirbtcUsdc],
];
/** True for a loopback RPC; rehearsal overrides are refused for anything else. */
export const isLoopback = (url) => {
  try {
    return ["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
};
