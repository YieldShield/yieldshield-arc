import { encodeAbiParameters, parseAbi, type Address } from "viem";
import {
  client,
  config,
  localMode,
  chainTimestamp,
  type Market,
} from "./chain";
import { parseHermes, pythProblem, quotient } from "./pyth-math.mjs";
/** Pyth is a pull oracle: the app pushes a fresh update in its own transaction right before a price-reading action. */
export const pythAbi = parseAbi([
  "function getUpdateFee(bytes[] updateData) view returns (uint256)",
  "function updatePriceFeeds(bytes[] updateData) payable",
  "function getPriceUnsafe(bytes32 id) view returns ((int64 price, uint64 conf, int32 expo, uint256 publishTime))",
  "error StalePrice()",
  "error PriceFeedNotFound()",
  "error InsufficientFee()",
]);
export const usesPyth =
  config.oracle === "pyth" && Boolean(config.pyth?.contract);
export type Parsed = {
  id: string;
  price: bigint;
  conf: bigint;
  expo: number;
  publishTime: bigint;
};
export type PriceUpdate = {
  data: `0x${string}`[];
  parsed: Parsed[];
  fee: bigint;
};
const ids = (): string[] =>
  usesPyth
    ? [
        config.pyth.feeds.eurcUsd,
        config.pyth.feeds.usdcUsd,
        config.pyth.feeds.btcUsd,
      ]
    : [];
/** Feed and quote ids a market's reference price uses, or null for synthetic or non-Pyth sources. */
export function marketFeeds(market: Market) {
  if (!usesPyth || market.synthetic || !market.oracle) return null;
  const oracle = market.oracle.toLowerCase();
  if (oracle === config.eurcOracle?.toLowerCase())
    return {
      feed: config.pyth.feeds.eurcUsd,
      quote: config.pyth.feeds.usdcUsd,
    };
  if (oracle === config.cirbtcOracle?.toLowerCase())
    return { feed: config.pyth.feeds.btcUsd, quote: config.pyth.feeds.usdcUsd };
  return null;
}
async function localUpdate(): Promise<Omit<PriceUpdate, "fee">> {
  // Development-only: the local MockPyth accepts abi-encoded values; re-stamp the stored ones with chain time.
  const now = await chainTimestamp();
  const parsed: Parsed[] = [];
  for (const id of ids()) {
    const stored = (await client.readContract({
      address: config.pyth.contract,
      abi: pythAbi,
      functionName: "getPriceUnsafe",
      args: [id as `0x${string}`],
    })) as { price: bigint; conf: bigint; expo: number };
    parsed.push({
      id: id.toLowerCase(),
      price: stored.price,
      conf: stored.conf,
      expo: Number(stored.expo),
      publishTime: now,
    });
  }
  return {
    parsed,
    data: parsed.map((p) =>
      encodeAbiParameters(
        [
          { type: "bytes32" },
          { type: "int64" },
          { type: "uint64" },
          { type: "int32" },
          { type: "uint64" },
        ],
        [p.id as `0x${string}`, p.price, p.conf, p.expo, p.publishTime],
      ),
    ),
  };
}
/** Fresh signed price data and its fee. Production uses the site's /api/pyth-update proxy, which holds the Hermes API key. */
export async function fetchPriceUpdate(): Promise<PriceUpdate> {
  let update: Omit<PriceUpdate, "fee">;
  if (localMode && config.pyth?.mock) update = await localUpdate();
  else {
    const response = await fetch(`/api/pyth-update?ids=${ids().join(",")}`, {
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(
        response.status === 503
          ? "Price updates are not configured on this site yet (Pyth API key missing)."
          : `The price service answered HTTP ${response.status}. Try again.`,
      );
    update = parseHermes(await response.json()) as Omit<PriceUpdate, "fee">;
  }
  const now = await chainTimestamp();
  for (const p of update.parsed) {
    const problem = pythProblem(
      p,
      now,
      config.pyth.maxAge,
      config.pyth.maxConfidenceBps,
    );
    if (problem)
      throw new Error(
        `The fresh Pyth price is ${problem}. Try again in a moment.`,
      );
  }
  const fee = (await client.readContract({
    address: config.pyth.contract as Address,
    abi: pythAbi,
    functionName: "getUpdateFee",
    args: [update.data],
  })) as bigint;
  return { ...update, fee };
}
/** USDC base units per whole asset for `market` from an update, as its adapter will compute it on chain. */
export function priceFrom(update: { parsed: Parsed[] }, market: Market) {
  const feeds = marketFeeds(market);
  if (!feeds) throw new Error("This market does not use Pyth.");
  const find = (id: string) =>
    update.parsed.find((p) => p.id.toLowerCase() === id.toLowerCase());
  const base = find(feeds.feed),
    quote = find(feeds.quote);
  if (!base || !quote) throw new Error("The price update is missing a feed.");
  return quotient(base, quote) as bigint;
}
/** Last price pushed on chain and when it was published (no freshness check), for display only. */
export async function storedPrice(market: Market) {
  const feeds = marketFeeds(market);
  if (!feeds) return null;
  const [base, quote] = (await Promise.all(
    [feeds.feed, feeds.quote].map((id) =>
      client.readContract({
        address: config.pyth.contract,
        abi: pythAbi,
        functionName: "getPriceUnsafe",
        args: [id as `0x${string}`],
      }),
    ),
  )) as { price: bigint; conf: bigint; expo: number; publishTime: bigint }[];
  return {
    price: quotient(base, quote) as bigint,
    publishTime:
      base.publishTime < quote.publishTime
        ? base.publishTime
        : quote.publishTime,
  };
}
