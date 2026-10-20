import test from "node:test";
import assert from "node:assert/strict";
import { rpcRead } from "../api/arc-rpc.js";
import { ARC_RPC_URLS } from "../src/rpc.mjs";

const request = { jsonrpc: "2.0", id: 7, method: "eth_blockNumber", params: [] };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status });

test("same-origin reads fail over only between fixed Arc upstreams", async () => {
  const urls = [];
  const result = await rpcRead({ ...request, url: "https://attacker.invalid" }, async (url, options) => {
    urls.push(url);
    assert.equal(options.redirect, "error");
    assert.deepEqual(JSON.parse(options.body), request);
    return urls.length === 1
      ? reply({}, 503)
      : reply({ jsonrpc: "2.0", id: 7, result: "0x123" });
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.result, "0x123");
  assert.deepEqual(urls, ARC_RPC_URLS.slice(0, 2));
});

test("signing, broadcasting, batching and malformed requests never reach an upstream", async () => {
  const never = () => { throw new Error("Must not be called"); };
  for (const method of ["eth_sendRawTransaction", "eth_sendTransaction", "personal_sign", "wallet_switchEthereumChain", "debug_traceCall"]) {
    assert.equal((await rpcRead({ ...request, method }, never)).status, 400);
  }
  assert.equal((await rpcRead([request], never)).status, 400);
  assert.equal((await rpcRead("{", never)).status, 400);
  assert.equal((await rpcRead({ ...request, params: "bad" }, never)).status, 400);
  assert.equal((await rpcRead(" ".repeat(65537), never)).status, 413);
});

test("the proxy preserves contract reverts and does not retry them", async () => {
  let calls = 0;
  const body = { jsonrpc: "2.0", id: 7, error: { code: 3, message: "execution reverted: StalePrice", data: "0x1234" } };
  const result = await rpcRead({ ...request, method: "eth_call" }, async () => {
    calls++;
    return reply(body);
  });
  assert.deepEqual(result, { status: 200, body });
  assert.equal(calls, 1);
});

test("network errors and invalid upstream responses produce a bounded unavailable response", async () => {
  let calls = 0;
  const result = await rpcRead(request, async () => {
    calls++;
    return reply({ jsonrpc: "2.0", id: 99, result: "wrong request" });
  });
  assert.equal(result.status, 502);
  assert.equal(calls, ARC_RPC_URLS.length);
});
