import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildAgentManifest,
  buildLlmsTxt,
  MANIFEST_SCHEMA,
} from "../src/agent-manifest.mjs";
import { formatAge, isFresh } from "../src/freshness.mjs";
import { parseHermes, pythProblem, quotient } from "../src/pyth-math.mjs";
const deployment = JSON.parse(readFileSync("config/deployment.json", "utf8"));
// The deployed oracle is Chronicle. Keep Pyth coverage explicit so switching the
// public deployment cannot silently remove tests for the alternative adapter.
const pythDeployment = { ...deployment, oracle: "pyth" };
const forbidden =
  /risk-free|100% protection|guaranteed (return|yield)|insured/i;
test("the agent manifest describes the committed deployment", () => {
  const m = buildAgentManifest(deployment);
  assert.equal(m.schema, MANIFEST_SCHEMA);
  assert.equal(m.network.chainId, 5042002);
  assert.equal(m.status.deployment, deployment.status);
  assert.equal(
    m.status.writesEnabled,
    deployment.status === "deployed-and-verified",
  );
  assert.equal(m.status.testnetOnly, true);
  assert.equal(m.status.audited, false);
  assert.equal(m.agentPolicy.signing, "never");
  assert.deepEqual(
    m.assets.map((a) => [a.symbol, a.address, a.decimals]),
    [
      ["USDC", "0x3600000000000000000000000000000000000000", 6],
      ["EURC", "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", 6],
      ["cirBTC", "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF", 8],
    ],
  );
  assert.deepEqual(
    m.markets.map((k) => [k.key, k.address, k.synthetic]),
    [
      ["eurc", deployment.eurcPool, false],
      ["cirbtc", deployment.cirbtcPool, false],
      ["scenario", deployment.scenarioPool, true],
    ],
  );
  assert.equal(m.oracles.eurc.kind, deployment.oracle);
  assert.equal(
    m.oracles.eurc.maxAgeSeconds,
    deployment.oracle === "pyth"
      ? deployment.pyth.maxAge
      : deployment.maxPriceAge,
  );
  assert.equal(m.oracles.scenario.synthetic, true);
});
test("Chronicle recipes use on-chain freshness and never substitute a scenario price", () => {
  const m = buildAgentManifest({ ...deployment, oracle: "chronicle" });
  assert.equal(m.pyth, undefined);
  assert.equal(m.oracles.eurc.kind, "chronicle");
  assert.deepEqual(m.oracles.eurc.feeds, {
    "EURC/USD": deployment.chronicle.eurcUsd,
    "USDC/USD": deployment.chronicle.usdcUsd,
  });
  assert.deepEqual(m.oracles.cirbtc.feeds, {
    "CIRBTC/USDC": deployment.chronicle.cirbtcUsdc,
  });
  assert.equal(m.oracles.eurc.maxAgeSeconds, deployment.maxPriceAge);
  assert.match(m.unsignedTransactions.conventions.value, /^always 0:/);
  assert.equal(
    m.unsignedTransactions.conventions.order,
    "one transaction per action",
  );
  const protect = m.unsignedTransactions.recipes.find(
    (r) => r.intent === "protect",
  );
  assert.equal(protect.steps.length, 2);
  assert.match(protect.steps[0], /^asset\.approve/);
  assert.match(protect.steps[1], /^market\.protect/);
  assert.doesNotMatch(
    JSON.stringify(m.unsignedTransactions),
    /updatePriceFeeds|Hermes/,
  );
  assert.ok(
    m.safetyChecks.some((c) => c.includes("price() succeeds and age() ≤ maxAge()")),
  );
  assert.ok(
    m.oracleFreshnessRules.some(
      (r) =>
        r.includes("exitBacking") &&
        r.includes("claimBacking need no price and keep working"),
    ),
  );
  assert.ok(
    m.oracleFreshnessRules.includes(
      "No reference market ever falls back to the scenario price.",
    ),
  );
});
test("unsigned-transaction recipes push the Pyth price first and send value only to Pyth", () => {
  const m = buildAgentManifest(pythDeployment);
  assert.match(
    m.unsignedTransactions.conventions.value,
    /0 for every YieldShield contract call/,
  );
  assert.match(
    m.unsignedTransactions.conventions.value,
    /only pyth.updatePriceFeeds carries value/,
  );
  assert.match(m.unsignedTransactions.conventions.gas, /30%/);
  const protect = m.unsignedTransactions.recipes.find(
    (r) => r.intent === "protect",
  );
  assert.match(protect.steps[1], /^pyth\.updatePriceFeeds/);
  assert.match(protect.steps[2], /^market\.protect/);
  const backing = m.unsignedTransactions.recipes.find((r) =>
    r.intent.startsWith("backing exit"),
  );
  assert.ok(
    !backing.steps.some((s) => s.includes("updatePriceFeeds")),
    "backing exits need no price",
  );
  assert.equal(m.pyth.contract, "0x2880aB155794e7179c9eE2e38200202908C17B43");
  assert.equal(m.oracles.eurc.kind, "pyth");
  assert.equal(m.oracles.eurc.maxAgeSeconds, 120);
  assert.match(m.oracles.cirbtc.price, /assumes cirBTC trades 1:1 with BTC/);
  const intents = m.unsignedTransactions.recipes.map((r) => r.intent);
  for (const needed of ["protect", "provide USDC", "settle after maturity"])
    assert.ok(
      intents.some((i) => i.startsWith(needed)),
      `missing recipe ${needed}`,
    );
  assert.ok(intents.some((i) => i.includes("asset exit")));
  assert.ok(intents.some((i) => i.includes("backing exit")));
  assert.ok(m.safetyChecks.some((c) => c.includes("5042002")));
  assert.ok(m.safetyChecks.some((c) => c.includes("updatePriceFeeds")));
});
test("llms.txt lists markets, freshness rules and the no-signing rule", () => {
  const text = buildLlmsTxt(buildAgentManifest(deployment));
  assert.match(text, /^# YieldShield Arc/);
  assert.match(text, /Agents never sign/);
  assert.match(text, /SYNTHETIC scenario price/);
  assert.match(text, /INVALID_OR_STALE_PRICE/);
  assert.match(text, /Chronicle's Arc testnet feeds/);
  assert.match(text, new RegExp(`maxAgeSeconds \\(${deployment.maxPriceAge} s\\)`));
  assert.match(text, /No reference market ever falls back to the scenario price/);
  assert.doesNotMatch(text, /Pyth price updates \(push first\)/);
  assert.doesNotMatch(text, /pyth\.updatePriceFeeds/);
  assert.match(text, /chain ID 5042002/);
});
test("Pyth llms.txt preserves the mandatory update and fee instructions", () => {
  const text = buildLlmsTxt(buildAgentManifest(pythDeployment));
  assert.match(text, /Pyth price updates \(push first\)/);
  assert.match(text, /pyth\.updatePriceFeeds/);
  assert.match(text, /only pyth\.updatePriceFeeds carries value/);
});
test("agent text avoids insurance-style claims", () => {
  const m = buildAgentManifest(deployment);
  const { mustNotDo, ...rest } = m.agentPolicy;
  const text = JSON.stringify({ ...m, agentPolicy: rest });
  assert.doesNotMatch(text, forbidden);
});
test("a verified deployment enables writes and carries its addresses", () => {
  const verified = {
    ...deployment,
    status: "deployed-and-verified",
    factory: "0x1111111111111111111111111111111111111111",
    eurcPool: "0x2222222222222222222222222222222222222222",
  };
  const m = buildAgentManifest(verified);
  assert.equal(m.status.writesEnabled, true);
  assert.equal(m.contracts.factory, verified.factory);
  assert.equal(m.markets[0].address, verified.eurcPool);
});
test("a configured but unverified deployment never enables agent writes", () => {
  const m = buildAgentManifest({ ...deployment, status: "deployed" });
  assert.equal(m.status.writesEnabled, false);
  assert.ok(
    m.safetyChecks.includes(
      "status.writesEnabled is true; otherwise prepare nothing.",
    ),
  );
});
test("Pyth quotient, Hermes parsing and value checks mirror ShieldPythOracle", () => {
  const eurc = {
    price: 116524999n,
    conf: 121170n,
    expo: -8,
    publishTime: 100n,
  };
  const usdc = { price: 99994808n, conf: 36282n, expo: -8, publishTime: 100n };
  const btc = {
    price: 8539753395754n,
    conf: 2780604245n,
    expo: -8,
    publishTime: 100n,
  };
  assert.equal(quotient(eurc, usdc), 1165310n);
  assert.equal(quotient(btc, usdc), 85401968027n);
  const parsed = parseHermes({
    binary: { data: ["abcd"] },
    parsed: [
      {
        id: "76fa",
        price: {
          price: "116524999",
          conf: "121170",
          expo: -8,
          publish_time: 100,
        },
      },
    ],
  });
  assert.deepEqual(parsed.data, ["0xabcd"]);
  assert.deepEqual(parsed.parsed[0], {
    id: "0x76fa",
    price: 116524999n,
    conf: 121170n,
    expo: -8,
    publishTime: 100n,
  });
  assert.equal(pythProblem(eurc, 220n, 120, 100), null);
  assert.equal(pythProblem(eurc, 221n, 120, 100), "stale");
  assert.equal(
    pythProblem({ ...eurc, conf: 0n }, 100n, 120, 100),
    "confidence too wide",
  );
  assert.equal(
    pythProblem({ ...eurc, conf: 1165250n }, 100n, 120, 100),
    "confidence too wide",
  );
  assert.equal(pythProblem({ ...eurc, price: 0n }, 100n, 120, 100), "invalid");
  assert.equal(pythProblem({ ...eurc, expo: 1 }, 100n, 120, 100), "invalid");
  assert.equal(pythProblem(undefined, 100n, 120, 100), "missing");
});
test("price freshness mirrors the adapter's inclusive limit", () => {
  assert.equal(isFresh(10800n, 10800n), true);
  assert.equal(isFresh(10801n, 10800n), false);
  assert.equal(isFresh(null, 10800n), false);
  assert.equal(formatAge(59n), "59 s");
  assert.equal(formatAge(3725n), "1 h 2 min");
  assert.equal(formatAge(3n * 86400n), "3 days");
});
