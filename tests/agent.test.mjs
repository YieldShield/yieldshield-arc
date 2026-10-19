import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildAgentManifest,
  buildLlmsTxt,
  MANIFEST_SCHEMA,
} from "../src/agent-manifest.mjs";
import { formatAge, isFresh } from "../src/freshness.mjs";
const deployment = JSON.parse(readFileSync("config/deployment.json", "utf8"));
const forbidden = /risk-free|100% protection|guaranteed (return|yield)|insured/i;
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
  assert.equal(m.oracles.eurc.maxAgeSeconds, deployment.maxPriceAge);
  assert.equal(m.oracles.scenario.synthetic, true);
});
test("unsigned-transaction recipes never send native value and cover both exits", () => {
  const m = buildAgentManifest(deployment);
  assert.match(m.unsignedTransactions.conventions.value, /always 0/);
  const intents = m.unsignedTransactions.recipes.map((r) => r.intent);
  for (const needed of ["protect", "provide USDC", "settle after maturity"])
    assert.ok(
      intents.some((i) => i.startsWith(needed)),
      `missing recipe ${needed}`,
    );
  assert.ok(intents.some((i) => i.includes("asset exit")));
  assert.ok(intents.some((i) => i.includes("backing exit")));
  assert.ok(m.safetyChecks.some((c) => c.includes("5042002")));
  assert.ok(m.safetyChecks.some((c) => c.includes("age()")));
});
test("llms.txt lists markets, freshness rules and the no-signing rule", () => {
  const text = buildLlmsTxt(buildAgentManifest(deployment));
  assert.match(text, /^# YieldShield Arc/);
  assert.match(text, /Agents never sign/);
  assert.match(text, /SYNTHETIC scenario price/);
  assert.match(text, /INVALID_OR_STALE_PRICE/);
  assert.match(text, /chain ID 5042002/);
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
test("price freshness mirrors the adapter's inclusive limit", () => {
  assert.equal(isFresh(10800n, 10800n), true);
  assert.equal(isFresh(10801n, 10800n), false);
  assert.equal(isFresh(null, 10800n), false);
  assert.equal(formatAge(59n), "59 s");
  assert.equal(formatAge(3725n), "1 h 2 min");
  assert.equal(formatAge(3n * 86400n), "3 days");
});
