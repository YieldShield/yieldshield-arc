/** Fixed-upstream, read-only Arc RPC. Browser reads do not depend on upstream CORS policies. */
import { ARC_RPC_URLS } from "../src/rpc.mjs";

const MAX_BYTES = 64 * 1024;
const READ_METHODS = new Set([
  "eth_chainId", "eth_blockNumber", "eth_call", "eth_getBalance", "eth_getCode",
  "eth_getBlockByNumber", "eth_getBlockByHash", "eth_getTransactionReceipt",
  "eth_getTransactionByHash", "eth_getTransactionCount", "eth_estimateGas",
  "eth_gasPrice", "eth_maxPriorityFeePerGas", "eth_feeHistory",
]);

/** Shared by production and development; fetch injection is only for isolated tests. */
export async function rpcRead(input, fetcher = fetch) {
  let request;
  try {
    const raw = typeof input === "string" ? input : JSON.stringify(input);
    if (!raw || Buffer.byteLength(raw) > MAX_BYTES)
      return { status: 413, body: { error: "RPC request too large" } };
    request = JSON.parse(raw);
  } catch {
    return { status: 400, body: { error: "Invalid JSON" } };
  }
  if (
    !request || Array.isArray(request) || request.jsonrpc !== "2.0" ||
    !READ_METHODS.has(request.method) || !Array.isArray(request.params) ||
    request.params.length > 4 ||
    !(typeof request.id === "number" || typeof request.id === "string")
  )
    return { status: 400, body: { error: "Unsupported read request" } };

  // Forward only JSON-RPC fields, never client-supplied URLs, cookies, headers or credentials.
  const { jsonrpc, id, method, params } = request;
  for (const url of ARC_RPC_URLS) {
    try {
      const response = await fetcher(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc, id, method, params }),
        signal: AbortSignal.timeout(5000),
        redirect: "error",
      });
      if (!response.ok) continue;
      const text = await response.text();
      if (Buffer.byteLength(text) > 2 * 1024 * 1024) continue;
      const body = JSON.parse(text);
      if (
        body?.jsonrpc !== "2.0" || body.id !== id ||
        !("result" in body || "error" in body)
      ) continue;
      // A contract revert is a valid RPC response. Preserve it; don't seek a different outcome.
      return { status: 200, body };
    } catch {
      // Network failure, timeout or malformed response: try the next fixed Arc endpoint.
    }
  }
  return { status: 502, body: { error: "Arc reads are temporarily unavailable. Please retry." } };
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "POST only" }));
    return;
  }
  let input = req.body;
  if (input === undefined) {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BYTES) {
        res.statusCode = 413;
        res.end(JSON.stringify({ error: "RPC request too large" }));
        return;
      }
      chunks.push(Buffer.from(chunk));
    }
    input = Buffer.concat(chunks).toString("utf8");
  }
  const { status, body } = await rpcRead(input);
  res.statusCode = status;
  res.end(JSON.stringify(body));
}
