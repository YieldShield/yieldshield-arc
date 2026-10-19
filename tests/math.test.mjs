import test from "node:test";
import assert from "node:assert/strict";
import {
  entryClaim,
  exitPreview,
  maxNewFloor,
  minimumOutput,
  safeError,
  spendableUsdc,
  unitOf,
} from "../src/math.mjs";
const EURC = unitOf(6),
  CIRBTC = unitOf(8);
test("exits use only realized positive gains and the asset's own unit", () => {
  // 100 EURC entered at 1.10 USDC; the price doubles, so half the EURC is gain and 12% of it is fee.
  assert.deepEqual(exitPreview(100_000000n, 110_000000n, 2_200000n, EURC), {
    assetOut: 94_000000n,
    fee: 6_000000n,
    backingOut: 110_000000n,
  });
  assert.equal(exitPreview(100_000000n, 110_000000n, 1_000000n, EURC).fee, 0n);
  // 0.001 cirBTC with the same doubling: 12% of 50,000 sats.
  assert.equal(
    exitPreview(100000n, 81_827183n, 163654_367416n, CIRBTC).fee,
    6000n,
  );
  // A community market with 15% provider and 3% creator fees: 19% of the gain, each part rounded down.
  assert.equal(
    exitPreview(100_000000n, 110_000000n, 2_200000n, EURC, 1500n, 300n).fee,
    9_500000n,
  );
});
test("entry claims are priced per whole asset unit", () => {
  assert.equal(entryClaim(100_000000n, 1_100000n, EURC), 110_000000n);
  assert.equal(entryClaim(100000n, 81827_183708n, CIRBTC), 81_827183n);
  // 12 sats fall below the 0.01 USDC minimum claim; 13 sats do not.
  assert.ok(entryClaim(12n, 81827_183708n, CIRBTC) < 10_000n);
  assert.ok(entryClaim(13n, 81827_183708n, CIRBTC) >= 10_000n);
  assert.throws(() => entryClaim(1n, 0n, EURC));
});
test("entry capacity is conservative under rounding", () => {
  assert.equal(maxNewFloor(1000_000000n, 100_000000n), 566666666n);
  assert.equal(maxNewFloor(100_000000n, 100_000000n), 0n);
  assert.equal(maxNewFloor(5_000000n, 0n), 3333333n);
});
test("USDC deposits leave the gas reserve unspent", () => {
  assert.equal(spendableUsdc(20_000000n, 100000n), 19_900000n);
  assert.equal(spendableUsdc(50000n, 100000n), 0n);
});
test("invalid price cannot silently become a live quote", () => {
  assert.throws(() => exitPreview(1_000000n, 1_100000n, 0n, EURC));
});
test("tiny quotes cannot lose more than the stated half percent", () => {
  assert.equal(minimumOutput(2n), 2n);
  assert.equal(minimumOutput(199n), 199n);
  assert.equal(minimumOutput(200n), 199n);
  assert.equal(minimumOutput(201n), 200n);
  for (let quote = 1n; quote <= 1000n; quote++) {
    const min = minimumOutput(quote);
    assert.ok(
      (quote - min) * 1000n <= quote * 5n,
      "accepted minimum exceeds tolerance",
    );
    assert.ok(
      (quote - (min - 1n)) * 1000n > quote * 5n,
      "minimum must be the least safe unit",
    );
    assert.ok(min <= quote, "quote remains executable");
  }
});
test("zero-valued basket legs remain redeemable without allowing negative quotes", () => {
  assert.equal(minimumOutput(0n), 0n);
  assert.throws(() => minimumOutput(-1n));
});
test("decoded contract errors become plain sentences", () => {
  const reverted = {
    shortMessage: 'The contract function "protect" reverted.',
    cause: { data: { errorName: "PositionLimit" } },
  };
  assert.equal(
    safeError(reverted),
    "This market already has 100 open positions.",
  );
  assert.equal(
    safeError({
      cause: { cause: { data: { errorName: "ERC20InsufficientBalance" } } },
    }),
    "Your token balance is too low for this transaction.",
  );
  assert.match(
    safeError({ cause: { reason: "INVALID_OR_STALE_PRICE" } }),
    /stale or unavailable.*Backing exits still work/,
  );
  assert.equal(
    safeError({ shortMessage: "User rejected the request." }),
    "User rejected the request.",
  );
});
