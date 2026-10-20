/**
 * Builds the static, machine-readable agent manifest served at /agent.json and its plain-text companion
 * /llms.txt. Both are generated from config/deployment.json at build time, so they always describe the
 * deployment the site was built with. Agents use them to discover markets, check terms and oracle freshness,
 * and prepare UNSIGNED transactions for a human's wallet. Nothing here signs, holds keys or moves funds.
 */
export const MANIFEST_SCHEMA = "yieldshield-arc/agent-manifest/v1";
export const SITE = "https://arc.yieldshield.ai";

const featuredMarkets = [
  {
    key: "eurc",
    field: "eurcPool",
    name: "EURC reference",
    asset: "EURC",
    oracle: "eurc",
    synthetic: false,
  },
  {
    key: "cirbtc",
    field: "cirbtcPool",
    name: "cirBTC reference",
    asset: "cirBTC",
    oracle: "cirbtc",
    synthetic: false,
  },
  {
    key: "scenario",
    field: "scenarioPool",
    name: "EURC scenario lab",
    asset: "EURC",
    oracle: "scenario",
    synthetic: true,
  },
];

/** Function signatures agents need; full ABIs are served next to the manifest under /abi/. */
export const signatures = {
  pool: [
    "function protect(uint256 amount, uint256 minFloor, uint256 deadline) returns (uint256 id)",
    "function exitAsset(uint256 id, uint256 minAsset)",
    "function partialExitAsset(uint256 id, uint256 amount, uint256 minAsset, uint256 deadline)",
    "function exitBacking(uint256 id)",
    "function partialExitBacking(uint256 id, uint256 amount, uint256 minBacking, uint256 deadline)",
    "function transferPosition(uint256 id, address recipient)",
    "function settleExpired(uint256 id)",
    "function claimBacking()",
    "function depositJuniorBounded(uint256 amount, uint256 minShares, uint256 deadline) returns (uint256)",
    "function requestJuniorWithdrawal()",
    "function cancelJuniorWithdrawal()",
    "function withdrawJuniorBounded(uint256 burn, uint256 minBacking, uint256 minAsset, uint256 deadline)",
    "function claimRewards(address recipient)",
    "function claimFees(address recipient)",
    "function previewPartialExit(uint256 id, uint256 amount) view returns (uint256 assetOut, uint256 fee, uint256 floorOut)",
    "function previewJuniorWithdrawal(address owner, uint256 burn) view returns (uint256 backingOut, uint256 assetOut)",
    "function positions(uint256 id) view returns (address owner, uint256 amount, uint256 floor, uint256 openedAt)",
    "function openPositionIds() view returns (uint256[])",
    "function capacity() view returns (uint256)",
    "function juniorValue() view returns (uint256)",
    "function totalShares() view returns (uint256)",
    "function reservedBacking() view returns (uint256)",
    "function maturity() view returns (uint256)",
    "function terms() view returns (uint16 collateralBps, uint16 juniorFeeBps, uint16 creatorFeeBps, uint32 epochSeconds, uint32 exitDelay, uint32 juniorNotice)",
    "function assetUnit() view returns (uint256)",
    "function oracle() view returns (address)",
    "function protectedToken() view returns (address)",
    "function backing() view returns (address)",
  ],
  factory: [
    "function allPools() view returns (address[])",
    "function isPool(address) view returns (bool)",
    "function allowed(address asset, address oracle) view returns (bool)",
    "function createPool(address asset, address oracle, (uint16,uint16,uint16,uint32,uint32,uint32) terms, uint256 deadline) returns (address)",
    "function CREATION_SEED() view returns (uint256)",
  ],
  oracle: [
    "function price() view returns (uint256)",
    "function age() view returns (uint256)",
    "function maxAge() view returns (uint256)",
  ],
  erc20: [
    "function approve(address spender, uint256 value) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ],
};

/**
 * @param {Record<string, any>} m deployment manifest (config/deployment.json)
 * @param {{ site?: string }} [options]
 */
export function buildAgentManifest(m, { site = SITE } = {}) {
  const live = m.status === "deployed-and-verified";
  const pyth = (m.oracle ?? "chronicle") === "pyth";
  const pythOracles = pyth && {
    eurc: {
      adapter: m.eurcOracle ?? null,
      kind: "pyth",
      price:
        "USDC base units (6 decimals) per 1 EURC = Pyth Crypto.EURC/USD ÷ Pyth Crypto.USDC/USD",
      feeds: {
        "Crypto.EURC/USD": m.pyth.feeds.eurcUsd,
        "Crypto.USDC/USD": m.pyth.feeds.usdcUsd,
      },
      maxAgeSeconds: m.pyth.maxAge,
      maxConfidenceBps: m.pyth.maxConfidenceBps,
      synthetic: false,
    },
    cirbtc: {
      adapter: m.cirbtcOracle ?? null,
      kind: "pyth",
      price:
        "USDC base units (6 decimals) per 1 cirBTC = Pyth Crypto.BTC/USD ÷ Pyth Crypto.USDC/USD (assumes cirBTC trades 1:1 with BTC; Pyth has no cirBTC feed)",
      feeds: {
        "Crypto.BTC/USD": m.pyth.feeds.btcUsd,
        "Crypto.USDC/USD": m.pyth.feeds.usdcUsd,
      },
      maxAgeSeconds: m.pyth.maxAge,
      maxConfidenceBps: m.pyth.maxConfidenceBps,
      synthetic: false,
    },
  };
  const oracles = {
    eurc: {
      adapter: m.eurcOracle ?? null,
      kind: "chronicle",
      price:
        "USDC base units (6 decimals) per 1 EURC = Chronicle EURC/USD ÷ Chronicle USDC/USD",
      feeds: {
        "EURC/USD": m.chronicle?.eurcUsd ?? null,
        "USDC/USD": m.chronicle?.usdcUsd ?? null,
      },
      maxAgeSeconds: m.maxPriceAge,
      synthetic: false,
    },
    cirbtc: {
      adapter: m.cirbtcOracle ?? null,
      kind: "chronicle",
      price:
        "USDC base units (6 decimals) per 1 cirBTC = Chronicle CIRBTC/USDC",
      feeds: { "CIRBTC/USDC": m.chronicle?.cirbtcUsdc ?? null },
      maxAgeSeconds: m.maxPriceAge,
      synthetic: false,
    },
    scenario: {
      adapter: m.scenarioOracle ?? null,
      kind: "synthetic",
      price:
        "Deterministic public cycle: 1.10 → 1.20 → 1.00 USDC per EURC, changing every 120 seconds from deployment",
      feeds: {},
      maxAgeSeconds: null,
      synthetic: true,
    },
  };
  if (pythOracles) Object.assign(oracles, pythOracles);
  /** With Pyth, every price-reading step needs this transaction immediately before it. */
  const pushFirst = pyth
    ? [
        "pyth.updatePriceFeeds(updateData) with value = pyth.getUpdateFee(updateData) wei of native USDC, mined less than maxAgeSeconds before the next step",
      ]
    : [];
  const terms = m.defaultTerms ?? {
    collateralBps: 15000,
    juniorFeeBps: 1000,
    creatorFeeBps: 100,
    epochSeconds: 2592000,
    exitDelay: 60,
    juniorNotice: 120,
  };
  return {
    schema: MANIFEST_SCHEMA,
    name: "YieldShield Arc",
    summary:
      "USDC-backed split-risk protection markets on Arc testnet. A holder deposits EURC or cirBTC for a fixed USDC entry claim reserved at 150% by capital providers. Before maturity the holder either keeps the asset minus fees on realized gains (10% providers, 1% creator, 1% protocol) or surrenders it for the fixed USDC claim. After maturity anyone may settle remaining positions into pull claims.",
    site,
    llms: `${site}/llms.txt`,
    status: {
      deployment: m.status,
      writesEnabled: live,
      deploymentId: m.deploymentId ?? null,
      verifiedAt: m.verifiedAt ?? null,
      sourceCommit: m.source?.commit ?? null,
      testnetOnly: true,
      audited: false,
      verificationMethod: live ? "runtime-bytecode-configuration-and-receipts" : null,
      explorerSourceVerified: false,
      testTokensHaveMonetaryValue: false,
      note: live
        ? "Arc testnet deployment checked against runtime bytecode, configuration and receipts. Source is not published as verified on the explorer. Unaudited prototype; test tokens only."
        : "No verified Arc testnet deployment yet; markets below have no addresses and must not be used.",
    },
    agentPolicy: {
      signing: "never",
      custody: "none",
      output:
        "unsigned EVM transactions { chainId, to, data, value: '0x0' } for the user's own wallet to review and sign",
      mustNotDo: [
        "sign or broadcast transactions",
        "request or store private keys or seed phrases",
        "describe a position as loss-proof, as cover against loss, or as earning a promised return",
        "present the scenario market's synthetic price as a market price",
        "treat testnet activity as adoption or value",
      ],
    },
    network: {
      name: m.network ?? "Arc Testnet",
      chainId: m.chainId,
      rpcUrl: m.rpcUrl,
      explorer: m.explorer,
      multicall3: m.multicall3,
      faucet: m.faucet,
      nativeCurrency: { symbol: "USDC", decimals: 18 },
      notes: [
        "USDC is Arc's gas token. Native balance (18 decimals) and the USDC ERC-20 interface (6 decimals) are one balance; contracts here use only the ERC-20 interface.",
        "Keep about 0.1 USDC unspent for network fees when preparing USDC deposits.",
        "Minimum base fee 20 gwei; transactions with a lower maxFeePerGas are dropped silently.",
        "Blocks are final on inclusion; block timestamps are non-decreasing, not strictly increasing.",
      ],
    },
    assets: [
      {
        symbol: "USDC",
        role: "backing and gas",
        address: m.usdc,
        decimals: 6,
        issuer: "Circle (testnet, no monetary value)",
      },
      {
        symbol: "EURC",
        role: "protected asset",
        address: m.eurc,
        decimals: 6,
        issuer: "Circle (testnet, no monetary value)",
      },
      {
        symbol: "cirBTC",
        role: "protected asset",
        address: m.cirbtc,
        decimals: 8,
        issuer: "Circle (testnet, no monetary value)",
      },
    ],
    contracts: {
      factory: m.factory ?? null,
      deployer: m.deployer ?? null,
      abis: {
        pool: `${site}/abi/ShieldPool.json`,
        factory: `${site}/abi/ShieldFactory.json`,
        chronicleOracle: `${site}/abi/ShieldChronicleOracle.json`,
        erc20: `${site}/abi/IERC20Metadata.json`,
      },
      signatures,
    },
    oracles,
    ...(pyth && {
      pyth: {
        contract: m.pyth.contract,
        hermes: m.pyth.hermes,
        hermesNote:
          "Hermes has required an API key (Authorization: Bearer) since Pyth's 26 August 2026 Core upgrade. Request GET {hermes}/v2/updates/price/latest?ids[]=<id>&... &encoding=hex and pass binary.data as updateData. The YieldShield site proxies this at /api/pyth-update?ids=<comma-separated ids> for its own three feeds.",
        feeds: m.pyth.feeds,
        updateFee:
          "pyth.getUpdateFee(updateData): 1 wei of native USDC per price on Arc testnet",
        maxAgeSeconds: m.pyth.maxAge,
        maxConfidenceBps: m.pyth.maxConfidenceBps,
      },
    }),
    oracleFreshnessRules: pyth
      ? [
          `Pyth is a pull oracle: the price on chain only moves when someone pushes an update. Before protect, exitAsset, partialExitAsset, createPool for a reference market, and depositJuniorBounded into a pool with surrendered assets (juniorInventory() > 0), push pyth.updatePriceFeeds(updateData){value: fee} as its own transaction, then send the action within maxAgeSeconds (${m.pyth.maxAge} s).`,
          `Reference adapters reject values older than ${m.pyth.maxAge} s, never-published feeds, non-positive prices, exponents outside -18..0, and zero confidence or confidence wider than ${m.pyth.maxConfidenceBps} bps of the price: price() reverts with INVALID_OR_STALE_PRICE, INVALID_PRICE or CONFIDENCE.`,
          "Before preparing the update, check the Hermes values yourself: publish time within 60 s of the latest block, positive price, confidence within the limit. Quote the action from these values (USDC per unit = feed ÷ USDC/USD), not from a stale on-chain price.",
          "age() on a reference adapter returns the age of the older stored publish time without a freshness check; a large age is normal between actions.",
          "exitBacking, partialExitBacking, settleExpired and claimBacking need no price and never need an update.",
          "No reference market ever falls back to the scenario price.",
        ]
      : [
          `Reference adapters reject any feed value older than maxAgeSeconds (${m.maxPriceAge} s), zero, future-dated or unavailable: price() reverts with INVALID_OR_STALE_PRICE.`,
          "Read age() on a reference adapter for the age in seconds of its oldest feed value; treat age() > maxAgeSeconds, or any revert, as stale.",
          "While stale, protect, exitAsset, partialExitAsset, provider deposits into pools holding surrendered assets and market creation revert. exitBacking, partialExitBacking, settleExpired and claimBacking need no price and keep working.",
          "No reference market ever falls back to the scenario price.",
          "Chronicle's Arc testnet feeds updated about every 52 minutes between 19 September and 18 October 2026, with outages of about 34 hours (7–8 October) and from 18 October 09:08 UTC. Check freshness on every request.",
        ],
    markets: featuredMarkets.map((f) => ({
      key: f.key,
      name: f.name,
      address: m[f.field] ?? null,
      protectedAsset: f.asset,
      backing: "USDC",
      oracle: f.oracle,
      synthetic: f.synthetic,
      terms,
    })),
    discovery:
      "Featured markets are listed above. Community markets: call factory.allPools(), keep addresses where factory.isPool(address) is true, and read protectedToken() and oracle() to classify them (an oracle equal to the scenario adapter is synthetic).",
    economics: {
      entryClaim:
        "floor = amount × price() ÷ 10^assetDecimals, in USDC base units, fixed at entry",
      reserve:
        "a new claim is admitted only while totalBacking ≥ ceil((reserved + floor) × collateralBps ÷ 10000)",
      gainFees:
        "on an asset exit, gain = max(0, value − floorOut) ÷ price in asset units; fees = gain × (juniorFeeBps + creatorFeeBps + 100) ÷ 10000",
      exits:
        "after exitDelay seconds and before maturity: keep the asset (minus fees on realized gains) or surrender it for the fixed USDC claim; partial exits are proportional",
      maturity:
        "at maturity asset exits close; anyone may call settleExpired(id), which credits the owner's fixed claim for claimBacking() and gives the asset to providers",
      providers:
        "provider deposits and redemptions are frozen while any position is open; redemption needs requestJuniorWithdrawal() and juniorNotice seconds",
      limits: {
        minimumEntryClaimUsdcBaseUnits: "10000",
        maximumOpenPositionsPerMarket: 100,
        maximumProtectionWholeUnits: 100000,
        protocolFeeBps: 100,
      },
    },
    safetyChecks: [
      "eth_chainId equals the manifest chainId (5042002); refuse any other chain.",
      "status.writesEnabled is true; otherwise prepare nothing.",
      "factory.isPool(market) is true and market.protectedToken(), backing() and oracle() match this manifest.",
      "Chain time + terms.exitDelay < maturity() for new protection; chain time < maturity() for provider deposits and asset exits.",
      pyth
        ? "For reference markets: fresh Hermes values (publish time within 60 s, confidence within the limit) and a successful eth_call of pyth.updatePriceFeeds with the fee. Never substitute the scenario price."
        : "For reference markets: price() succeeds and age() ≤ maxAge(). Never substitute the scenario price.",
      "floor ≥ 10000 (0.01 USDC) and floor ≤ capacity(); openPositionIds().length < 100.",
      "Provider deposits: reservedBacking() == 0; user's USDC balance minus the deposit leaves ≥ 0.1 USDC for gas.",
      "User holds the token amount and has enough allowance, or prepend an exact approve(pool, amount).",
      "Simulate every prepared call with eth_call from the user's address before handing it over.",
    ],
    unsignedTransactions: {
      conventions: {
        format: "{ chainId: 5042002, to, data, value }",
        value: pyth
          ? "0 for every YieldShield contract call (nothing is payable there); only pyth.updatePriceFeeds carries value: exactly pyth.getUpdateFee(updateData) wei of native USDC"
          : "always 0: no function is payable and native USDC is never sent to these contracts",
        gas: "estimate, then add 30%: a mined oracle read can cost more than its estimate",
        order: pyth
          ? "two signatures for price-reading actions: first the Pyth update, then the action, back to back"
          : "one transaction per action",
        deadline: "latest block timestamp + 600 seconds",
        slippage:
          "minimum outputs = ceil(quote × 0.995); quote with previewPartialExit or previewJuniorWithdrawal at the latest block",
        approvals:
          "exact-amount approve(spender, amount) on the token, never unlimited",
      },
      recipes: [
        {
          intent: "protect",
          plannedMcpTool: "yieldshield_prepare_deposit_shielded",
          steps: [
            "asset.approve(market, amount)",
            ...pushFirst,
            "market.protect(amount, minFloor = ceil(amount × price ÷ 10^decimals × 0.995), deadline)",
          ],
        },
        {
          intent: "asset exit (keep the asset)",
          plannedMcpTool: "yieldshield_prepare_partial_withdraw_shielded",
          steps: pyth
            ? [
                "assetOut = amount − fees, computed from the fresh Hermes price exactly as previewPartialExit does (the on-chain preview needs a fresh price)",
                ...pushFirst,
                "market.partialExitAsset(id, amount, minAsset = ceil(assetOut × 0.995), deadline)",
              ]
            : [
                "(assetOut,,) = market.previewPartialExit(id, amount)",
                "market.partialExitAsset(id, amount, minAsset = ceil(assetOut × 0.995), deadline)",
              ],
        },
        {
          intent: "backing exit (take the fixed USDC claim)",
          plannedMcpTool: "yieldshield_prepare_withdraw",
          steps: [
            "floorOut = amount == position.amount ? position.floor : position.floor × amount ÷ position.amount",
            "market.partialExitBacking(id, amount, minBacking = floorOut, deadline)",
          ],
        },
        {
          intent: "settle after maturity (anyone) and claim (owner)",
          plannedMcpTool: "yieldshield_prepare_withdraw",
          steps: [
            "market.settleExpired(id)",
            "market.claimBacking() from the owner",
          ],
        },
        {
          intent: "provide USDC",
          plannedMcpTool: "yieldshield_prepare_deposit_backing",
          steps: [
            "usdc.approve(market, amount)",
            ...(pyth ? ["if juniorInventory() > 0: " + pushFirst[0]] : []),
            "market.depositJuniorBounded(amount, minShares = ceil(expectedShares × 0.995), deadline)",
          ],
        },
        {
          intent: "provider redemption",
          plannedMcpTool:
            "yieldshield_prepare_unlock / yieldshield_prepare_protector_withdraw",
          steps: [
            "market.requestJuniorWithdrawal(); wait terms.juniorNotice seconds and until reservedBacking() == 0",
            "(backingOut, assetOut) = market.previewJuniorWithdrawal(owner, shares)",
            "market.withdrawJuniorBounded(shares, ceil(backingOut × 0.995), ceil(assetOut × 0.995), deadline)",
          ],
        },
        {
          intent: "claim fees",
          plannedMcpTool:
            "yieldshield_prepare_claim_rewards / yieldshield_prepare_claim_commission",
          steps: [
            "market.claimRewards(recipient) for provider gain fees",
            "market.claimFees(recipient) for creator or protocol fees",
          ],
        },
      ],
    },
    roadmap: {
      mcp: "Planned (grant milestone): expose these reads and recipes as YieldShield MCP tools (list pools, pool safety, oracle freshness, unsigned transaction preparation) using the main repository's agent-core.",
      cctp: "Planned, not implemented: App Kit Bridge exits from Arc Testnet (domain 26) to Ethereum Sepolia (0) and Base Sepolia (6). USDC uses TokenMessengerV2.depositForBurn; EURC uses CrossChainTokenService.crossChainTransfer with per-token TokenManager approval. Separate user-reviewed transfers; four completed token/route combinations required for the grant milestone.",
    },
  };
}

/** Plain-text summary for language-model agents, in the llms.txt style. */
export function buildLlmsTxt(manifest) {
  const a = manifest;
  const lines = [
    `# ${a.name}`,
    "",
    `> ${a.summary}`,
    "",
    `Status: ${a.status.deployment}. ${a.status.note} Testnet only; unaudited; test tokens have no monetary value.`,
    "",
    "Agents never sign. Prepare unsigned transactions for the user's own wallet, after the safety checks below.",
    "",
    "## Machine-readable",
    "",
    `- [Agent manifest](${a.site}/agent.json): network, assets, markets, terms, oracle freshness rules, safety checks and unsigned-transaction recipes`,
    `- [Pool ABI](${a.contracts.abis.pool}), [Factory ABI](${a.contracts.abis.factory}), [Oracle ABI](${a.contracts.abis.chronicleOracle}), [ERC-20 ABI](${a.contracts.abis.erc20})`,
    "",
    "## Network",
    "",
    `- ${a.network.name}, chain ID ${a.network.chainId}, RPC ${a.network.rpcUrl}, explorer ${a.network.explorer}`,
    `- Multicall3 ${a.network.multicall3}; faucet ${a.network.faucet}`,
    ...a.network.notes.map((n) => `- ${n}`),
    "",
    "## Assets",
    "",
    ...a.assets.map(
      (t) =>
        `- ${t.symbol} (${t.role}): ${t.address}, ${t.decimals} decimals, ${t.issuer}`,
    ),
    "",
    "## Markets",
    "",
    ...a.markets.map(
      (mk) =>
        `- ${mk.name} (${mk.key}): ${mk.address ?? "not deployed"}; protects ${mk.protectedAsset} with USDC; oracle ${mk.oracle}${mk.synthetic ? " (SYNTHETIC scenario price, never a reference)" : ""}`,
    ),
    `- Factory: ${a.contracts.factory ?? "not deployed"}`,
    "",
    ...(a.pyth
      ? [
          "## Pyth price updates (push first)",
          "",
          `- Pyth contract ${a.pyth.contract}; feeds: ${Object.entries(
            a.pyth.feeds,
          )
            .map(([k, v]) => `${k} ${v}`)
            .join(", ")}`,
          `- ${a.pyth.hermesNote}`,
          `- Fee: ${a.pyth.updateFee}. Freshness limit ${a.pyth.maxAgeSeconds} s; confidence limit ${a.pyth.maxConfidenceBps} bps.`,
          "",
        ]
      : []),
    "## Oracle freshness",
    "",
    ...a.oracleFreshnessRules.map((r) => `- ${r}`),
    "",
    "## Safety checks before preparing a transaction",
    "",
    ...a.safetyChecks.map((c, i) => `${i + 1}. ${c}`),
    "",
    "## Unsigned transaction recipes",
    "",
    `Conventions: ${a.unsignedTransactions.conventions.format}; ${a.unsignedTransactions.conventions.value}; ${a.unsignedTransactions.conventions.order}; gas: ${a.unsignedTransactions.conventions.gas}; deadline = ${a.unsignedTransactions.conventions.deadline}; ${a.unsignedTransactions.conventions.slippage}; ${a.unsignedTransactions.conventions.approvals}.`,
    "",
    ...a.unsignedTransactions.recipes.map(
      (r) => `- ${r.intent}: ${r.steps.join(" → ")}`,
    ),
    "",
    "## Do not",
    "",
    ...a.agentPolicy.mustNotDo.map((d) => `- ${d}`),
    "",
  ];
  return lines.join("\n");
}
