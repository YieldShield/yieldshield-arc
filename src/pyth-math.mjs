/** Pure Pyth helpers shared by the app, the agent manifest and the tests. */
/** USDC base units per whole asset from two parsed feeds, exactly as ShieldPythOracle computes it. */
export function quotient(base, quote) {
  const wad = (p) => BigInt(p.price) * 10n ** BigInt(18 + Number(p.expo));
  if (BigInt(quote.price) <= 0n) throw new Error("Invalid quote price");
  return (wad(base) * 1_000000n) / wad(quote);
}
/** Normalizes a Hermes `/v2/updates/price/latest` body (or our proxy's) to { data: hex[], parsed: [...] }. */
export function parseHermes(body) {
  const hex = (x) => (String(x).startsWith("0x") ? String(x) : `0x${x}`);
  return {
    data: (body.binary?.data ?? body.data ?? []).map(hex),
    parsed: (body.parsed ?? []).map((p) => {
      const price = p.price?.price !== undefined ? p.price : p;
      return {
        id: hex(p.id).toLowerCase(),
        price: BigInt(price.price),
        conf: BigInt(price.conf),
        expo: Number(price.expo),
        publishTime: BigInt(price.publish_time ?? price.publishTime),
      };
    }),
  };
}
/**
 * Why a parsed value must not be used (null if usable), mirroring ShieldPythOracle: positive price, exponent in
 * -18..0, nonzero confidence within `maxConfidenceBps`, publish time within `maxAge` of `now`.
 */
export function pythProblem(p, now, maxAge, maxConfidenceBps) {
  if (!p) return "missing";
  if (p.price <= 0n || p.expo > 0 || p.expo < -18) return "invalid";
  if (p.conf === 0n || p.conf * 10000n > p.price * BigInt(maxConfidenceBps))
    return "confidence too wide";
  const distance =
    now > p.publishTime ? now - p.publishTime : p.publishTime - now;
  if (distance > BigInt(maxAge)) return "stale";
  return null;
}
