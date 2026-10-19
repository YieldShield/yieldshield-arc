import { useSearchParams } from "react-router-dom";
import {
  config,
  assets,
  fmt,
  explorer,
  short,
  localMode,
  networkName,
  BACKING,
} from "./chain";
import { useShield } from "./state";
import { PageTitle, Facts, RouteLink, Empty } from "./ui";
import { formatAge, isFresh } from "./freshness.mjs";
const faucetUrl = config.faucet || "https://faucet.circle.com";
export function Portfolio() {
  const { account, balances, markets, snapshots, disconnect } = useShield();
  return (
    <>
      <PageTitle
        eyebrow="YOUR HOLDINGS"
        title="Wallet balances."
        description="Balances and claims in their original token units."
      />
      {account && (
        <button className="secondary-button" onClick={disconnect}>
          Disconnect {short(account)}
        </button>
      )}
      {!account && (
        <Empty title="Connect your wallet">
          Read balances, entry claims and provider exposure for your current
          account.
        </Empty>
      )}
      <div className="catalog-grid">
        {[
          { key: "usdc", symbol: "USDC", decimals: 6 },
          ...assets.map((a) => ({
            key: a.key,
            symbol: a.symbol,
            decimals: a.decimals,
          })),
        ].map((a) => (
          <article className="market-card" key={a.key}>
            <div className="eyebrow">WALLET / {a.symbol}</div>
            <h2>
              {balances[a.key] !== undefined
                ? fmt(balances[a.key], a.decimals, 8)
                : "—"}{" "}
              <small>{a.symbol}</small>
            </h2>
            {a.key === "usdc" && (
              <p className="card-description">
                The same balance pays Arc network fees. The wallet shows it with
                18 decimals; contracts use the 6-decimal ERC-20 view.
              </p>
            )}
            <RouteLink className="hero-link" to={`/faucet?asset=${a.key}`}>
              Get test {a.symbol} ↗
            </RouteLink>
          </article>
        ))}
      </div>
      <div className="table-list">
        {markets
          .filter((m) => snapshots[m.key] && account)
          .map((m) => {
            const s = snapshots[m.key],
              asset = assets.find((a) => a.key === m.asset)!,
              own = s.positions.filter(
                (p) => p.owner.toLowerCase() === account?.toLowerCase(),
              ),
              floor = own.reduce((n, p) => n + p.floor, 0n);
            return (
              <article key={m.key}>
                <h2>{m.name}</h2>
                <Facts
                  items={[
                    ["Protected entry claims", `${fmt(floor, 6, 6)} USDC`],
                    [
                      "Matured backing credit",
                      `${fmt(s.claimable, 6, 6)} USDC`,
                    ],
                    [
                      "Provider ownership",
                      s.totalShares
                        ? `${fmt((s.ownShares * 1000000n) / s.totalShares, 4, 2)}%`
                        : "0%",
                    ],
                    [
                      "Earned asset fees",
                      `${fmt(s.earned, asset.decimals, 8)} ${asset.symbol}`,
                    ],
                  ]}
                />
                <RouteLink
                  className="hero-link"
                  to={`/positions?pool=${m.key}`}
                >
                  Manage holdings ↗
                </RouteLink>
              </article>
            );
          })}
      </div>
    </>
  );
}
export function Activity() {
  const { activity, account, refresh } = useShield();
  const rows = activity.filter(
    (a) =>
      a.chainId === config.chainId &&
      a.account.toLowerCase() === account?.toLowerCase(),
  );
  return (
    <>
      <PageTitle
        eyebrow="TRANSACTION JOURNAL"
        title="Activity."
        description="Transactions submitted from this browser for the connected wallet. Pending or unknown transactions retain their hash for recovery; this is not a complete chain history."
      />
      <button className="secondary-button" onClick={() => void refresh()}>
        Refresh balances
      </button>
      {!rows.length && (
        <Empty title="No recorded transactions">
          Confirmed actions appear here after you use a deployed market.
        </Empty>
      )}
      <div className="table-list">
        {rows.map((a) => (
          <article key={a.hash}>
            <div className="transaction-row">
              <div>
                <h2>{a.label}</h2>
                <p>
                  {new Date(a.time).toLocaleString("en-US")} · {a.status}
                </p>
              </div>
              <a
                className="secondary-button"
                href={explorer("tx", a.hash)}
                target="_blank"
                rel="noreferrer"
              >
                Check transaction ↗
              </a>
            </div>
            <p className="address">{a.hash}</p>
          </article>
        ))}
      </div>
    </>
  );
}
/** Funding page: every asset comes from Circle's public testnet faucet; nothing is minted by this app. */
export function Faucet() {
  const [params] = useSearchParams();
  const { balances } = useShield();
  const back = params.get("return");
  const keep = new URLSearchParams(params);
  keep.delete("asset");
  keep.delete("return");
  const tokens = [
    {
      key: "usdc",
      symbol: "USDC",
      note: "Backing for providers and gas for every transaction. Request it first.",
    },
    {
      key: "eurc",
      symbol: "EURC",
      note: "Protected asset in the EURC reference and scenario markets.",
    },
    {
      key: "cirbtc",
      symbol: "cirBTC",
      note: "Protected asset in the cirBTC reference market.",
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow="TESTNET SUPPLIES"
        title="Get Arc testnet tokens."
        description="USDC pays gas and backs every market; EURC and cirBTC are the protected assets. All come from Circle's public faucet and have no monetary value."
      />
      <div className="catalog-grid">
        {tokens.map((t) => (
          <article
            className={`market-card${params.get("asset") === t.key ? " selected-card" : ""}`}
            key={t.key}
          >
            <div className="eyebrow">CIRCLE FAUCET / {t.symbol}</div>
            <h2>{t.symbol}</h2>
            <p className="card-description">{t.note}</p>
            <Facts
              items={[
                [
                  "Your balance",
                  balances[t.key] !== undefined
                    ? `${fmt(balances[t.key], t.key === "cirbtc" ? 8 : 6, 8)} ${t.symbol}`
                    : "Connect to read",
                ],
              ]}
            />
          </article>
        ))}
      </div>
      <div className="market-grid">
        <section className="market-card">
          <h2>Use Circle&apos;s faucet</h2>
          <p className="card-description">
            Open the faucet, choose the token and the <b>Arc Testnet</b>{" "}
            network, and paste your own wallet address. Circle allows one
            request per token and network every two hours. The faucet uses
            reCAPTCHA; this app never requests tokens on your behalf.
          </p>
          <a
            className="hero-link"
            href={faucetUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open faucet.circle.com ↗
          </a>
          {localMode && (
            <p className="muted-text">
              Local mode: the disposable chain pre-funds its test accounts with
              local stand-ins instead.
            </p>
          )}
        </section>
        <section className="market-card">
          <h2>Then return to your route</h2>
          <p className="card-description">
            Keep about 0.1 USDC unspent: the same balance pays network fees.
          </p>
          <div className="button-row">
            <RouteLink
              className="secondary-button"
              to={`/${back === "provide" ? "provide" : "protect"}?${keep.toString()}`}
            >
              {back === "provide"
                ? "Return to providing with your amount"
                : "Return to protection with your amount"}
            </RouteLink>
          </div>
        </section>
      </div>
    </>
  );
}
export function Status() {
  const { ready, markets, snapshots, errors, loading, refresh } = useShield();
  return (
    <>
      <PageTitle
        eyebrow="NETWORK STATUS"
        title="Verify before you sign."
        description="Check the network, deployment, contracts and price freshness."
      />
      <div className="market-grid">
        <article className="market-card">
          <h2>
            {ready
              ? "Contracts configured"
              : config.factory
                ? "Verification pending"
                : config.status === "awaiting-testnet-usdc"
                  ? "Waiting for testnet USDC"
                  : "Arc testnet deployment pending"}
          </h2>
          <Facts
            items={[
              ["Network", networkName],
              ["Chain ID", String(config.chainId)],
              ["RPC", config.rpcUrl],
              ["Explorer", config.explorer],
              ["Gas token", "USDC (18-decimal native view)"],
              ["Manifest state", config.status],
              [
                "Read status",
                !ready
                  ? "Available after verified deployment"
                  : loading
                    ? "Loading…"
                    : "See individual market results",
              ],
              [
                "Deployment evidence",
                `${config.transactions.length} recorded transactions`,
              ],
            ]}
          />
          <button
            className="secondary-button"
            disabled={!ready || loading}
            onClick={() => void refresh()}
          >
            {loading ? "Refreshing…" : "Refresh network reads"}
          </button>
          <p className="card-description">
            Local test results do not confirm an Arc testnet deployment.
          </p>
        </article>
        <article className="market-card">
          <h2>Deployment addresses</h2>
          {[
            ["factory", "Factory"],
            ["eurcOracle", "EURC price adapter"],
            ["cirbtcOracle", "cirBTC price adapter"],
            ...(config.pyth?.contract && config.oracle === "pyth"
              ? [["pythContract", "Pyth contract"]]
              : []),
            ["scenarioOracle", "Scenario oracle"],
            ["deployer", "Test deployer"],
          ].map(([key, label]) => {
            const address =
              key === "pythContract" ? config.pyth?.contract : config[key];
            return (
              <div key={key}>
                <p className="source-note">{label}</p>
                {address ? (
                  <a
                    className="address"
                    href={explorer("address", address)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {address} ↗
                  </a>
                ) : (
                  <p className="muted-text">Not deployed</p>
                )}
              </div>
            );
          })}
        </article>
      </div>
      <div className="table-list">
        {markets.map((m) => {
          const s = snapshots[m.key];
          return (
            <article key={m.key}>
              <h2>{m.name}</h2>
              <Facts
                items={[
                  [
                    "Data status",
                    errors[m.key]
                      ? "Read failed"
                      : s
                        ? "Contract read succeeded"
                        : ready || m.address
                          ? loading
                            ? "Loading…"
                            : "Unavailable"
                          : "Awaiting deployment",
                  ],
                  [
                    "Price",
                    s?.price
                      ? `${fmt(s.price, 6, 6)} USDC per ${assets.find((a) => a.key === m.asset)!.symbol}`
                      : s?.lastPrice
                        ? `${fmt(s.lastPrice, 6, 6)} USDC per ${assets.find((a) => a.key === m.asset)!.symbol} (last pushed; stale)`
                        : "Unavailable",
                  ],
                  ...(s?.publishTime != null
                    ? ([
                        [
                          "Pyth publish time",
                          `${new Date(Number(s.publishTime) * 1000).toISOString().replace(".000Z", " UTC").replace("T", " ")}${s.lastPrice ? ` · ${fmt(s.lastPrice, 6, 6)} USDC` : ""}`,
                        ],
                      ] as [string, string][])
                    : []),
                  [
                    "Freshness",
                    m.synthetic
                      ? "Synthetic scenario; never a reference"
                      : s?.oracleAge != null && s?.maxAge != null
                        ? `${formatAge(s.oracleAge)} old, limit ${formatAge(s.maxAge)} · ${isFresh(s.oracleAge, s.maxAge) ? "fresh" : s.publishTime != null ? "stale on chain until the next action pushes a Pyth update" : "stale: new protection and asset exits paused"}`
                        : "Unavailable",
                  ],
                  ["Source", m.source],
                ]}
              />
              {s?.oracleError && (
                <p className="error-note" role="alert">
                  {s.oracleError}
                </p>
              )}
              {errors[m.key] && (
                <p className="error-note" role="alert">
                  {errors[m.key]}
                </p>
              )}
            </article>
          );
        })}
      </div>
      {errors.registry && (
        <p className="error-note" role="alert">
          Registry read: {errors.registry}
        </p>
      )}
    </>
  );
}
export function Assets() {
  return (
    <>
      <PageTitle
        eyebrow="TOKEN IDENTITIES"
        title="Know what you hold."
        description="Circle testnet assets on Arc, their roles and contract addresses."
      />
      <div className="asset-cards">
        {[
          {
            key: "usdc",
            symbol: BACKING.symbol,
            name: BACKING.name,
            address: BACKING.address,
            decimals: 6,
            description:
              "Backing for every market and Arc's gas token. One balance, two views: 18 decimals natively (gas, wallet display) and 6 decimals through this ERC-20 interface, which the contracts use exclusively. Testnet USDC has no monetary value.",
          },
          ...assets,
        ].map((a) => (
          <article key={a.key}>
            <div className="eyebrow">
              {a.key === "usdc" ? "BACKING" : "PROTECTED ASSET"} / {a.decimals}{" "}
              DECIMALS
            </div>
            <h2>
              {a.name} · {a.symbol}
            </h2>
            <p>{a.description}</p>
            {a.address ? (
              <a
                className="address"
                href={explorer("address", a.address)}
                target="_blank"
                rel="noreferrer"
              >
                {a.address}
              </a>
            ) : (
              <small>Address unavailable</small>
            )}
          </article>
        ))}
      </div>
      <div className="field-note">
        <h2>Research references</h2>
        <p>
          USYC (Circle&apos;s tokenized money-market fund share) is entitlement
          gated and is not integrated: it cannot be bought, protected or
          provided here. CCTP exits and the Arc mainnet path are planned, not
          live. A production integration requires separate oracle, legal and
          security review.
        </p>
        <RouteLink className="hero-link" to="/agents">
          Machine-readable market manifest ↗
        </RouteLink>
      </div>
    </>
  );
}
