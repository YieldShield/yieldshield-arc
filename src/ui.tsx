import { type ReactNode, useId } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { assets, config, fmt, localMode, type Market } from "./chain";
import { formatAge } from "./freshness.mjs";
import { useShield } from "./state";
export function useMarket() {
  const a = useShield();
  const [params, setParams] = useSearchParams();
  const key =
    params.get("pool") ||
    a.markets.find((m) => a.snapshots[m.key]?.protectOpen)?.key ||
    "eurc";
  const market = a.markets.find(
    (m) => m.key.toLowerCase() === key.toLowerCase(),
  );
  if (!market) throw new Error("Unknown market selection");
  return {
    ...a,
    market,
    snapshot: a.snapshots[market.key],
    params,
    select: (key: string) => {
      const n = new URLSearchParams(params);
      n.set("pool", key);
      n.delete("amount");
      setParams(n);
    },
  };
}
export function RouteLink({
  to,
  children,
  className = "",
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  const [params] = useSearchParams();
  const url = new URL(to, "https://arc.local");
  if (!url.searchParams.has("pool") && params.has("pool"))
    url.searchParams.set("pool", params.get("pool")!);
  return (
    <Link className={className} to={`${url.pathname}${url.search}${url.hash}`}>
      {children}
    </Link>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-title">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
export function MarketSelect() {
  const { market, markets, select, snapshots } = useMarket();
  return (
    <label className="field-label">
      Choose a market
      <select
        aria-label="Choose a market"
        value={market.key}
        onChange={(e) => select(e.target.value)}
      >
        {markets.map((m) => (
          <option key={m.key} value={m.key}>
            {m.name} / USDC
            {snapshots[m.key] && !snapshots[m.key].provideOpen
              ? " · matured"
              : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="market-facts">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function Notice() {
  const { ready } = useShield();
  return !ready ? (
    <div className="notice deployment-notice">
      <strong>Arc testnet only. Test tokens have no monetary value.</strong>{" "}
      {config.factory
        ? "Contract verification pending. Transactions disabled."
        : config.status === "awaiting-testnet-usdc"
          ? "Deployment is waiting for testnet USDC. Transactions disabled."
          : "Arc testnet deployment pending. Transactions disabled."}{" "}
      <RouteLink className="inline-link" to="/status">
        Network status
      </RouteLink>
    </div>
  ) : (
    <div className="testnet-note">
      <span>{localMode ? "LOCAL DEMO" : "ARC TESTNET ONLY"}</span>
      Testnet USDC, EURC and cirBTC have no monetary value.
    </div>
  );
}
export function ActionButton({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  const { ready, account, busy, connect } = useShield();
  return (
    <button
      className="primary-button"
      disabled={busy || !ready || (!account ? false : disabled)}
      onClick={!account ? () => void connect() : onClick}
    >
      {busy
        ? "Waiting for wallet or confirmation…"
        : !ready
          ? config.factory
            ? "Awaiting verification"
            : "Awaiting Arc testnet deployment"
          : !account
            ? "Connect wallet"
            : children}
      <span aria-hidden>↗</span>
    </button>
  );
}
export function Amount({
  value,
  onChange,
  symbol,
  label = "Amount",
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  symbol: string;
  label?: string;
  max?: string;
}) {
  const id = useId();
  const gas = symbol === "USDC";
  return (
    <div className="field-label">
      <label htmlFor={id}>{label}</label>
      <div className="amount-input">
        <input
          id={id}
          name={label.toLowerCase().replaceAll(" ", "-")}
          aria-label={label}
          aria-describedby={`${id}-hint`}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          maxLength={78}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
        />
        <span translate="no">{symbol}</span>
      </div>
      <span className="amount-help" id={`${id}-hint`}>
        Amount in {symbol}.
        {gas ? " USDC also pays Arc network fees; keep 0.1 USDC unspent." : ""}
      </span>
      {max && (
        <button
          type="button"
          className="text-button"
          onClick={() => onChange(max)}
        >
          Use maximum · {max}
        </button>
      )}
    </div>
  );
}
export function Risk({
  provider = false,
  synthetic = false,
}: {
  provider?: boolean;
  synthetic?: boolean;
}) {
  return (
    <div className="risk-box">
      <strong>
        {provider ? "Capital at risk" : "Fixed protection maturity"}
      </strong>
      <p>
        {provider
          ? "You absorb losses. Deposits and withdrawals pause while protection is open. After maturity, anyone can settle it to lift the pause. Redemptions can include surrendered assets; fees and returns may be zero."
          : "At maturity, remaining assets are surrendered for the fixed entry claim, even if their price rose. Exit earlier to keep upside. Partial exits reduce the claim proportionally."}
      </p>
      {synthetic && (
        <p>
          This is a scenario market: its price is a public synthetic cycle, not
          a market price. Use it to try both exits.
        </p>
      )}
    </div>
  );
}
export function MarketCard({
  market,
  headingLevel = 3,
}: {
  market: Market;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const { snapshots, ready, loading, errors, chainTime } = useShield();
  const s = snapshots[market.key],
    asset = assets.find((a) => a.key === market.asset)!;
  return (
    <article className="market-card">
      <div className="card-top">
        <div className="token-stack">
          <span className="asset-symbol">
            {market.asset === "cirbtc" ? "₿" : "€"}
          </span>
          <span className="backing-symbol">$</span>
        </div>
        <span className="test-pill">
          {s
            ? s.provideOpen
              ? market.synthetic
                ? "SCENARIO"
                : "TESTNET"
              : "MATURED"
            : errors[market.key]
              ? "READ FAILED"
              : market.address
                ? "READ PENDING"
                : "PREPARED"}
        </span>
      </div>
      <Heading>{market.name}</Heading>
      <p className="card-description">{asset.symbol} protected by USDC</p>
      <div className="price-source">{market.source}</div>
      <Facts
        items={[
          [
            `Price · USDC per ${asset.symbol}`,
            s?.price
              ? fmt(s.price, 6, 6)
              : s?.lastPrice
                ? `${fmt(s.lastPrice, 6, 6)} · last pushed`
                : "Unavailable",
          ],
          [
            "Price freshness",
            market.synthetic
              ? "Synthetic scenario"
              : s?.publishTime != null && s?.maxAge != null && chainTime > 0n
                ? `Pyth published ${formatAge(chainTime > s.publishTime ? chainTime - s.publishTime : 0n)} ago · limit ${formatAge(s.maxAge)} · each action pushes a fresh price`
                : s?.oracleAge != null && s?.maxAge != null
                  ? `${formatAge(s.oracleAge)} old · limit ${formatAge(s.maxAge)}`
                  : s?.oracleError
                    ? "Stale or unavailable"
                    : "Unavailable",
          ],
          [
            "Available entry claims",
            s
              ? s.protectOpen
                ? `${fmt(s.capacity)} USDC`
                : "Closed · epoch ending"
              : ready || market.address
                ? loading
                  ? "Loading…"
                  : "Unavailable"
                : "Awaiting deployment",
          ],
          [
            "Provider entry",
            s
              ? !s.provideOpen
                ? "Closed · matured"
                : s.reserved > 0n
                  ? "Frozen · open protection"
                  : "Available until maturity"
              : ready || market.address
                ? "Unavailable"
                : "Prepared",
          ],
        ]}
      />
      <div className="button-row">
        <RouteLink
          className="secondary-button"
          to={`/pools/${market.key}?pool=${market.key}`}
        >
          Market details ↗
        </RouteLink>
        {(!s || s.protectOpen) && (
          <RouteLink
            className="secondary-button"
            to={`/protect?pool=${market.key}`}
          >
            Protect
          </RouteLink>
        )}
        {(!s || s.provideOpen) && (
          <RouteLink
            className="secondary-button"
            to={`/provide?pool=${market.key}`}
          >
            Provide capital
          </RouteLink>
        )}
      </div>
    </article>
  );
}
export function Empty({
  title,
  children,
  headingLevel = 2,
}: {
  title: string;
  children: ReactNode;
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div className="empty-state">
      <span aria-hidden>◇</span>
      <Heading>{title}</Heading>
      <p>{children}</p>
    </div>
  );
}
