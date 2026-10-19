import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  http,
  parseAbi,
  formatUnits,
  parseUnits,
  zeroAddress,
  type Address,
  type Abi,
  type EIP1193Provider,
} from "viem";
import { foundry } from "viem/chains";
import deployment from "../config/deployment.json";
import pool from "../config/abi/ShieldPool.json";
import factory from "../config/abi/ShieldFactory.json";
import token from "../config/abi/IERC20Metadata.json";
import chronicleOracle from "../config/abi/ShieldChronicleOracle.json";
export const localMode =
  import.meta.env.DEV && import.meta.env.VITE_LOCAL_DEMO === "true";
export const config: Record<string, any> = localMode
  ? JSON.parse(import.meta.env.VITE_LOCAL_MANIFEST)
  : deployment;
/**
 * Arc testnet, as verified on 19 October 2026. viem's built-in `arcTestnet` still lists the retired
 * rpc.testnet.arc.network hosts, so the chain is defined here from Arc's current documentation.
 */
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        "https://rpc.testnet.arc.io",
        "https://rpc.blockdaemon.testnet.arc.io",
        "https://rpc.drpc.testnet.arc.io",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Testnet Explorer",
      url: "https://explorer.testnet.arc.io",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 0,
    },
  },
  testnet: true,
});
export const chain = localMode ? foundry : arcTestnet;
export const networkName = localMode
  ? "Local Anvil test chain"
  : "Arc Testnet (Circle)";
// Arc has Multicall3, so concurrent reads are aggregated into a few eth_calls.
// The local chain has none, so its reads share JSON-RPC batches instead.
const multicall = Boolean(
  (chain as { contracts?: { multicall3?: unknown } }).contracts?.multicall3,
);
export const client = createPublicClient({
  chain,
  batch: multicall ? { multicall: true } : undefined,
  transport: http(config.rpcUrl, {
    timeout: 12000,
    retryCount: 1,
    batch: !multicall,
  }),
});
// Nested token calls revert with OpenZeppelin errors; include them so failures decode.
const tokenErrors = parseAbi([
  "error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)",
  "error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)",
  "error ERC20InvalidSender(address sender)",
  "error ERC20InvalidReceiver(address receiver)",
  "error SafeERC20FailedOperation(address token)",
  "error NotTolled(address caller)",
]);
const withErrors = (abi: unknown) => {
  const own = abi as Abi;
  const names = new Set(own.map((item) => "name" in item && item.name));
  return [...own, ...tokenErrors.filter((e) => !names.has(e.name))] as Abi;
};
export const poolAbi = withErrors(pool),
  factoryAbi = withErrors(factory),
  tokenAbi = withErrors(token),
  chronicleAbi = withErrors(chronicleOracle);
export const oracleAbi = parseAbi([
  "function price() view returns(uint256)",
  "function age() view returns(uint256)",
  "function maxAge() view returns(uint256)",
]);
export const read = async (
  address: Address,
  abi: Abi,
  name: string,
  args: readonly unknown[] = [],
): Promise<any> =>
  client.readContract({ address, abi, functionName: name, args });
export const short = (s: string) => `${s.slice(0, 6)}…${s.slice(-4)}`;
export const explorer = (type: "address" | "tx", id: string) =>
  `${config.explorer}/${type}/${id}`;
export const fmt = (value: bigint, decimals = 6, digits = 4) =>
  Number(formatUnits(value, decimals)).toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
export function units(value: string, decimals = 6) {
  if (
    !/^\d+(\.\d*)?$/.test(value) ||
    (value.split(".")[1] || "").length > decimals
  )
    throw new Error(
      `Enter a positive amount with at most ${decimals} decimal places.`,
    );
  const n = parseUnits(value, decimals);
  if (n <= 0n) throw new Error("Amount must be greater than zero.");
  return n;
}
export const chainTimestamp = async () => (await client.getBlock()).timestamp;
export const chainDeadline = async () => (await chainTimestamp()) + 600n;
export const ZERO = zeroAddress;
/** USDC is also Arc's gas token: keep this much (0.1 USDC) out of deposits so the next transaction can pay. */
export const GAS_RESERVE = 100_000n;
export const BACKING = {
  symbol: "USDC",
  name: localMode ? "Local USDC stand-in" : "USDC (Arc testnet)",
  address: config.usdc as Address,
  decimals: 6,
};
export const DEFAULT_TERMS = {
  collateralBps: 15000,
  juniorFeeBps: 1000,
  creatorFeeBps: 100,
  epochSeconds: 604800,
  exitDelay: 60,
  juniorNotice: 120,
};
export type AssetKey = "eurc" | "cirbtc";
export type Asset = {
  key: AssetKey;
  symbol: string;
  name: string;
  address: Address;
  decimals: number;
  description: string;
};
export const assets: Asset[] = [
  {
    key: "eurc",
    symbol: "EURC",
    name: localMode ? "Local EURC stand-in" : "EURC (Arc testnet)",
    address: config.eurc as Address,
    decimals: 6,
    description:
      "Circle's euro stablecoin on Arc testnet. Protecting it against USDC backing is an EUR/USD exposure. Testnet EURC has no monetary value.",
  },
  {
    key: "cirbtc",
    symbol: "cirBTC",
    name: localMode ? "Local cirBTC stand-in" : "cirBTC (Arc testnet)",
    address: config.cirbtc as Address,
    decimals: 8,
    description:
      "Circle Wrapped Bitcoin on Arc testnet, 8 decimals. A volatile asset against USDC backing. Testnet cirBTC has no monetary value.",
  },
];
export const assetOf = (key: AssetKey) => assets.find((a) => a.key === key)!;
export type Market = {
  key: string;
  name: string;
  asset: AssetKey;
  address: Address | null;
  oracle: Address | null;
  source: string;
  /** Scenario markets use a synthetic price and are never a reference. */
  synthetic: boolean;
};
export const featured: Market[] = [
  {
    key: "eurc",
    name: "EURC reference",
    asset: "eurc",
    address: config.eurcPool,
    oracle: config.eurcOracle,
    source: "Chronicle EURC/USD ÷ USDC/USD",
    synthetic: false,
  },
  {
    key: "cirbtc",
    name: "cirBTC reference",
    asset: "cirbtc",
    address: config.cirbtcPool,
    oracle: config.cirbtcOracle,
    source: "Chronicle CIRBTC/USDC",
    synthetic: false,
  },
  {
    key: "scenario",
    name: "EURC scenario lab",
    asset: "eurc",
    address: config.scenarioPool,
    oracle: config.scenarioOracle,
    source: "Synthetic 1.10 → 1.20 → 1.00 cycle",
    synthetic: true,
  },
];
declare global {
  interface Window {
    ethereum?: EIP1193Provider & {
      on?: (event: string, callback: (...args: any[]) => void) => void;
      removeListener?: (
        event: string,
        callback: (...args: any[]) => void,
      ) => void;
    };
  }
}
let localWallet: Window["ethereum"];
export function setLocalWallet(provider: Window["ethereum"]) {
  if (
    !import.meta.env.DEV ||
    !localMode ||
    import.meta.env.VITE_LOCAL_WALLET !== "true"
  )
    throw new Error("Local wallet disabled");
  localWallet = provider;
}
export function walletProvider() {
  return import.meta.env.DEV &&
    localMode &&
    import.meta.env.VITE_LOCAL_WALLET === "true"
    ? localWallet
    : window.ethereum;
}
export async function wallet() {
  const provider = walletProvider();
  if (!provider)
    throw new Error(
      "Install MetaMask or another Ethereum-compatible wallet to connect.",
    );
  const w = createWalletClient({ chain, transport: custom(provider) });
  const [account] = await w.requestAddresses();
  try {
    await w.switchChain({ id: chain.id });
  } catch (e: any) {
    // MetaMask Mobile wraps "unknown chain" (4902) inside an internal -32603 error.
    const unknownChain = [
      e?.code,
      e?.cause?.code,
      e?.data?.originalError?.code,
      e?.cause?.data?.originalError?.code,
    ].includes(4902);
    if (unknownChain) {
      await w.addChain({ chain });
      await w.switchChain({ id: chain.id });
    } else throw e;
  }
  if ((await w.getChainId()) !== chain.id)
    throw new Error(`Switch to ${chain.name}.`);
  return { w, account };
}
