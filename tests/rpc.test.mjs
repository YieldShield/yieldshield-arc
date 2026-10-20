import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createPublicClient } from "viem";
import { readTransport } from "../src/rpc.mjs";

async function endpoint(t, respond) {
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const part of req) body += part;
    respond(JSON.parse(body), res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(resolve));
  });
  return `http://127.0.0.1:${server.address().port}`;
}

test("public reads recover through a second RPC after the first rejects HTTP", async (t) => {
  let failed = 0, recovered = 0;
  const denied = await endpoint(t, (_, res) => {
    failed++;
    res.writeHead(403).end("Forbidden");
  });
  const healthy = await endpoint(t, (request, res) => {
    recovered++;
    assert.equal(request.method, "eth_blockNumber");
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: "0x123" }));
  });
  const client = createPublicClient({ transport: readTransport([denied, healthy]) });
  assert.equal(await client.getBlockNumber(), 291n);
  assert.equal(failed, 1);
  assert.equal(recovered, 1);
});

test("failed RPCs surface an error instead of fabricated chain values", async (t) => {
  const unavailable = await endpoint(t, (_, res) => res.writeHead(503).end());
  const client = createPublicClient({ transport: readTransport([unavailable]) });
  await assert.rejects(client.getBlockNumber(), /HTTP request failed/);
});

test("contract reverts are preserved without asking a different RPC for a different outcome", async (t) => {
  let fallbackCalls = 0;
  const revert = await endpoint(t, (request, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      jsonrpc: "2.0", id: request.id,
      error: { code: 3, message: "execution reverted: StalePrice" },
    }));
  });
  const other = await endpoint(t, (_, res) => {
    fallbackCalls++;
    res.writeHead(500).end();
  });
  const client = createPublicClient({ transport: readTransport([revert, other]) });
  await assert.rejects(client.call({
    to: "0x1111111111111111111111111111111111111111", data: "0x",
  }), /StalePrice/);
  assert.equal(fallbackCalls, 0);
});
