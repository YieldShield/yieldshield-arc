import { fallback, http } from "viem";

// Arc's primary and dRPC endpoints rejected browser OPTIONS requests on 20 Oct 2026.
// Blockdaemon supports CORS. Keep the other official endpoints as bounded fallbacks.
export const ARC_RPC_URLS = [
  "https://rpc.blockdaemon.testnet.arc.io",
  "https://rpc.testnet.arc.io",
  "https://rpc.drpc.testnet.arc.io",
];

/** Public reads only. Wallet transactions continue through the user's provider. */
export function readTransport(urls = ARC_RPC_URLS, timeout = 6000) {
  return fallback(
    [...new Set(urls)].map((url) => http(url, { timeout, retryCount: 0 })),
    { retryCount: 0 },
  );
}
