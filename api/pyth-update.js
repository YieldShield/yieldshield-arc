/**
 * Same-origin proxy for Pyth price updates (Vercel serverless function). Hermes has required an API key since
 * Pyth's 26 August 2026 Core upgrade; the key stays server-side in the PYTH_API_KEY environment variable and
 * never reaches the browser. Only this deployment's three feed IDs are forwarded.
 */
import deployment from "../config/deployment.json" with { type: "json" };

const allowed = new Set(
  Object.values(deployment.pyth?.feeds ?? {}).map((id) => id.toLowerCase()),
);

/** Shared by the Vercel function and the Vite development middleware. */
export async function pythUpdate(
  idsParam,
  apiKey,
  base = deployment.pyth?.hermes,
) {
  const ids = String(idsParam ?? "")
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean);
  if (
    !ids.length ||
    ids.length > allowed.size ||
    ids.some((id) => !allowed.has(id))
  )
    return { status: 400, body: { error: "Unknown or missing feed ids" } };
  if (!apiKey)
    return { status: 503, body: { error: "Pyth API key not configured" } };
  const query = ids.map((id) => `ids[]=${id}`).join("&");
  const response = await fetch(
    `${base}/v2/updates/price/latest?${query}&encoding=hex`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    },
  );
  if (!response.ok)
    return {
      status: 502,
      body: { error: `Hermes answered HTTP ${response.status}` },
    };
  const body = await response.json();
  return { status: 200, body: { binary: body.binary, parsed: body.parsed } };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "GET only" });
    return;
  }
  const { status, body } = await pythUpdate(
    req.query?.ids,
    process.env.PYTH_API_KEY,
  );
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}
