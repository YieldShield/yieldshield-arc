/**
 * Pyth price updates for the scripts. On Arc testnet the data comes from Hermes, which has required an API key
 * since Pyth's 26 August 2026 Core upgrade: set PYTH_API_KEY or put the key in the ignored .secrets/pyth-api-key.
 * Local and rehearsal chains use MockPyth, whose update format is abi.encode(id, price, conf, expo, publishTime).
 */
import { existsSync, readFileSync } from "node:fs";
import { encodeAbiParameters, parseAbi } from "viem";
export const pythAbi = parseAbi([
  "function getUpdateFee(bytes[] updateData) view returns (uint256)",
  "function updatePriceFeeds(bytes[] updateData) payable",
  "function getPriceUnsafe(bytes32 id) view returns ((int64 price, uint64 conf, int32 expo, uint256 publishTime))",
  "function setPrice(bytes32 id, int64 price, uint64 conf, int32 expo, uint256 publishTime)",
  "function setFee(uint256 fee)",
  "error StalePrice()",
  "error PriceFeedNotFound()",
  "error InsufficientFee()",
]);
/** All three feeds the reference adapters read; one update covers both markets. */
export const feedIds = (m) => [m.pyth.feeds.eurcUsd, m.pyth.feeds.usdcUsd, m.pyth.feeds.btcUsd];
export function pythApiKey() {
  if (process.env.PYTH_API_KEY) return process.env.PYTH_API_KEY.trim();
  if (existsSync(".secrets/pyth-api-key")) return readFileSync(".secrets/pyth-api-key", "utf8").trim();
  return null;
}
/** Latest Hermes update for `ids`: { data: hex[], parsed: [{ id, price, conf, expo, publishTime }] }. */
export async function hermesUpdate(base, ids, apiKey) {
  if (!apiKey)
    throw new Error(
      "No Pyth API key: Hermes has required one since 26 August 2026. Put it in .secrets/pyth-api-key (from https://pythdata.app/signup) or set PYTH_API_KEY.",
    );
  const query = ids.map((id) => `ids[]=${id}`).join("&");
  const response = await fetch(`${base}/v2/updates/price/latest?${query}&encoding=hex`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error(`Hermes answered HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const body = await response.json();
  return {
    data: body.binary.data.map((hex) => (hex.startsWith("0x") ? hex : `0x${hex}`)),
    parsed: body.parsed.map((p) => ({
      id: p.id.startsWith("0x") ? p.id : `0x${p.id}`,
      price: BigInt(p.price.price),
      conf: BigInt(p.price.conf),
      expo: Number(p.price.expo),
      publishTime: BigInt(p.price.publish_time),
    })),
  };
}
/** MockPyth update: re-stamps the stored values (or `overrides`) with `publishTime`. */
export async function mockUpdate(read, pyth, ids, publishTime, overrides = {}) {
  const parsed = [];
  for (const id of ids) {
    const stored = overrides[id] ?? (await read(pyth, pythAbi, "getPriceUnsafe", [id]));
    parsed.push({ id, price: BigInt(stored.price), conf: BigInt(stored.conf), expo: Number(stored.expo), publishTime });
  }
  return {
    data: parsed.map((p) =>
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "int64" }, { type: "uint64" }, { type: "int32" }, { type: "uint64" }],
        [p.id, p.price, p.conf, p.expo, p.publishTime],
      ),
    ),
    parsed,
  };
}
/** USDC base units per whole asset, as ShieldPythOracle computes it from two parsed feeds. */
export function quotient(base, quote) {
  const wad = (p) => p.price * 10n ** BigInt(18 + p.expo);
  return (wad(base) * 1_000000n) / wad(quote);
}
