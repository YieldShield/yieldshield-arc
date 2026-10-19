import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pythUpdate } from "../api/pyth-update.js";
const { pyth } = JSON.parse(readFileSync("config/deployment.json", "utf8"));
const ids = Object.values(pyth.feeds).join(",");
test("the price proxy forwards only this deployment's feeds, with the key server-side", async () => {
  assert.equal((await pythUpdate("0xdeadbeef", "key")).status, 400);
  assert.equal((await pythUpdate("", "key")).status, 400);
  assert.equal((await pythUpdate(ids, undefined)).status, 503);
  const seen = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    seen.push({ url: String(url), auth: init.headers.Authorization });
    return new Response(
      JSON.stringify({
        binary: { encoding: "hex", data: ["abcd"] },
        parsed: [],
        extra: "dropped",
      }),
      { status: 200 },
    );
  };
  try {
    const result = await pythUpdate(
      ids,
      "secret-key",
      "https://hermes.example",
    );
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, {
      binary: { encoding: "hex", data: ["abcd"] },
      parsed: [],
    });
    assert.equal(seen.length, 1);
    assert.match(
      seen[0].url,
      /^https:\/\/hermes\.example\/v2\/updates\/price\/latest\?ids\[\]=0x76fa/,
    );
    assert.match(seen[0].url, /&encoding=hex$/);
    assert.equal(seen[0].auth, "Bearer secret-key");
  } finally {
    globalThis.fetch = original;
  }
});
