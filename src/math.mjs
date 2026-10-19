/** Exact integer accounting, matching the immutable pool. Prices are USDC base units per whole asset unit. */
export const WAD = 10n ** 18n;
export const unitOf = (decimals) => 10n ** BigInt(decimals);
/** Mirrors ShieldPool.previewPartialExit with the default 10% / 1% / 1% gain fees. */
export function exitPreview(amount, floor, price, unit = WAD) {
  if (amount < 0n || floor < 0n || price <= 0n || unit <= 0n)
    throw new Error("Invalid quote");
  const value = (amount * price) / unit;
  const gain = value > floor ? ((value - floor) * unit) / price : 0n;
  const junior = (gain * 1000n) / 10000n;
  const recipient = (gain * 100n) / 10000n;
  return {
    assetOut: amount - junior - 2n * recipient,
    fee: junior + 2n * recipient,
    backingOut: floor,
  };
}
/** Entry claim in USDC base units for `amount` asset units at `price` (mirrors ShieldPool._protect). */
export function entryClaim(amount, price, unit = WAD) {
  if (amount <= 0n || price <= 0n || unit <= 0n)
    throw new Error("Invalid quote");
  return (amount * price) / unit;
}
export function maxNewFloor(backing, reserved, collateralBps = 15000n) {
  const maximum = (backing * 10000n) / collateralBps;
  return maximum > reserved ? maximum - reserved : 0n;
}
/** Ceil the minimum so sub-unit rounding never exceeds the advertised 0.5% loss. */
export function minimumOutput(quote) {
  if (quote < 0n) throw new Error("Invalid output quote");
  return (quote * 995n + 999n) / 1000n;
}
/**
 * Largest USDC deposit that still leaves `reserve` for gas: on Arc, USDC is also the gas token.
 * @param {bigint} balance
 * @param {bigint} reserve
 * @returns {bigint}
 */
export function spendableUsdc(balance, reserve) {
  return balance > reserve ? balance - reserve : 0n;
}
/** Plain-language explanations for decoded contract errors (viem only reports "reverted."). */
const knownErrors = {
  ERC20InsufficientBalance:
    "Your token balance is too low for this transaction.",
  ERC20InsufficientAllowance:
    "The token approval is lower than this transaction needs. Review again.",
  InvalidAmount: "This amount is outside the market's allowed range.",
  InsufficientBacking: "Not enough unreserved backing for this entry claim.",
  Slippage: "The result moved outside your reviewed limit. Review again.",
  NotReady:
    "Not ready yet: the exit delay or withdrawal notice is still running.",
  NotOwner: "Only the current position owner can do this.",
  ActiveExposure:
    "Provider entry and redemption are frozen while protected positions are open.",
  EpochClosed: "This market's epoch has ended.",
  PositionLimit: "This market already has 100 open positions.",
  NotTolled: "The price adapter is not whitelisted on its Chronicle feed.",
};
/** Plain-language explanations for `require` reason strings. */
const knownReasons = {
  INVALID_OR_STALE_PRICE:
    "The reference price is stale or unavailable, so new protection and asset exits are paused. Backing exits still work.",
  ZERO_PRICE: "The reference price is unavailable.",
  BLOCKLISTED: "A token transfer to or from a blocklisted address was refused.",
  DEADLINE:
    "The review expired before the transaction was mined. Review again.",
  UNAPPROVED_PAIR:
    "This asset and price source are not approved by the factory.",
  CREATOR_LIMIT: "This wallet already created its two community markets.",
  COMMUNITY_SLOTS_FULL: "All community market slots are taken.",
  REGISTRY_FULL: "The factory registry is full.",
};
function revertName(error) {
  for (let e = error, depth = 0; e && depth < 8; e = e.cause, depth++)
    if (e.data?.errorName) return e.data.errorName;
  return undefined;
}
function revertReason(error) {
  for (let e = error, depth = 0; e && depth < 8; e = e.cause, depth++) {
    if (typeof e.reason === "string") return e.reason;
    if (e.data?.errorName === "Error" && typeof e.data?.args?.[0] === "string")
      return e.data.args[0];
  }
  return undefined;
}
export function safeError(error) {
  const known =
    knownErrors[revertName(error)] ?? knownReasons[revertReason(error)];
  if (known) return known;
  const message =
    error?.shortMessage ||
    error?.message ||
    "The request could not be completed.";
  return message
    .replace(/0x[a-fA-F0-9]{128,}/g, "[transaction data]")
    .slice(0, 280);
}
