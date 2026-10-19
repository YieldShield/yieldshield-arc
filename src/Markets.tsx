import { useParams } from "react-router-dom";
import { useShield } from "./state";
import { assets, fmt, explorer } from "./chain";
import { PageTitle, RouteLink, MarketCard, Facts, Risk, Empty } from "./ui";
export function Markets({ home = false }: { home?: boolean }) {
  const { markets } = useShield();
  return (
    <>
      {home ? (
        <section className="hero">
          <div>
            <div className="eyebrow">YIELDSHIELD / ARC TESTNET</div>
            <h1>
              Keep the upside.
              <br />
              <em>Fix your floor in USDC.</em>
            </h1>
            <p>
              Protect Circle EURC or cirBTC against a fixed USDC claim, or
              provide the USDC behind it. Testnet only; test tokens have no
              monetary value.
            </p>
            <div className="button-row">
              <RouteLink className="secondary-button" to="/protect">
                Protect an asset ↗
              </RouteLink>
              <RouteLink className="secondary-button" to="/provide">
                Provide capital ↗
              </RouteLink>
            </div>
          </div>
          <div className="hero-art" aria-hidden>
            <svg viewBox="0 0 500 330">
              <path d="M40 300a210 210 0 0 1 420 0" fill="#d9e7d8" />
              <path d="M110 300a140 140 0 0 1 280 0" fill="#b3cfb8" />
              <path d="M180 300a70 70 0 0 1 140 0" fill="#729e80" />
              <path d="M20 300h460" stroke="#294d36" strokeWidth="2" />
              <path d="M70 318h360" stroke="#ef775d" strokeWidth="10" />
            </svg>
            <span className="hero-caption">
              CHAIN 5042002 · USDC AS GAS AND BACKING
            </span>
          </div>
        </section>
      ) : (
        <PageTitle
          eyebrow="DISCOVER"
          title="Find your market."
          description="Choose an asset and a role. Every market is backed by USDC."
        />
      )}
      <div className="market-heading">
        <div>
          <div className="eyebrow">EXPLORE THE RANGE</div>
          <h2>Protection markets</h2>
        </div>
        <RouteLink className="secondary-button" to="/create-pool">
          Create a market +
        </RouteLink>
      </div>
      <div className="catalog-grid">
        {markets.map((m) => (
          <MarketCard key={m.key} market={m} />
        ))}
      </div>
      <details className="field-note help-details">
        <summary>Which assets are these?</summary>
        <p>
          Circle-issued testnet tokens on Arc: USDC (backing and gas), EURC and
          cirBTC (protected assets). Get them from Circle&apos;s faucet. They
          have no monetary value. The scenario market uses real testnet EURC
          with a synthetic, clearly labelled price.
        </p>
        <RouteLink className="hero-link" to="/how-it-works">
          Read the field guide ↗
        </RouteLink>
      </details>
    </>
  );
}
export function PoolDetail() {
  const { key } = useParams();
  const { markets, snapshots, errors, ready } = useShield();
  const market = markets.find(
    (m) => m.key.toLowerCase() === key?.toLowerCase(),
  );
  if (!market)
    return (
      <Empty headingLevel={1} title="Market not found">
        Return to <RouteLink to="/markets">markets</RouteLink> or refresh after
        the factory registry loads.
      </Empty>
    );
  const s = snapshots[market.key],
    asset = assets.find((a) => a.key === market.asset)!;
  return (
    <>
      <PageTitle
        eyebrow="MARKET DETAILS"
        title={market.name}
        description={`${asset.symbol} protected by USDC backing. ${market.source}.`}
      />
      <div className="market-grid">
        <MarketCard market={market} headingLevel={2} />
        <article className="action-card">
          <h2>Know the terms</h2>
          {!s && !ready && !market.address && (
            <p className="muted-text">
              Prepared default terms. Verify the deployed pool before signing.
            </p>
          )}
          {!s && (ready || market.address) && (
            <p className="error-note" role="alert">
              Market terms could not be read. Refresh Network status before
              continuing.
            </p>
          )}
          <Facts
            items={[
              [
                "Collateral requirement",
                s
                  ? `${s.terms.collateralBps / 100}%`
                  : ready || market.address
                    ? "Unavailable"
                    : "150% · prepared",
              ],
              [
                "Gain fees: providers / creator / protocol",
                s
                  ? `${s.terms.juniorFeeBps / 100}% / ${s.terms.creatorFeeBps / 100}% / 1%`
                  : ready || market.address
                    ? "Unavailable"
                    : "10% / 1% / 1% · prepared",
              ],
              [
                "Earliest holder exit",
                s
                  ? `${s.terms.exitDelay} seconds after entry`
                  : ready || market.address
                    ? "Unavailable"
                    : "60 seconds after entry · prepared",
              ],
              [
                "Provider notice",
                s
                  ? `${s.terms.juniorNotice} seconds + exposure clearance`
                  : ready || market.address
                    ? "Unavailable"
                    : "120 seconds + exposure clearance · prepared",
              ],
              [
                "Maturity",
                s
                  ? new Date(Number(s.maturity) * 1000).toLocaleString("en-US")
                  : ready || market.address
                    ? "Unavailable"
                    : "Set at deployment",
              ],
              [
                "Remaining backing",
                s ? `${fmt(s.backing)} USDC` : "Unavailable",
              ],
              ["Open positions", s?.positions.length ?? "Unavailable"],
            ]}
          />
          {market.address && (
            <a
              className="contract-link"
              href={explorer("address", market.address)}
              target="_blank"
              rel="noreferrer"
            >
              Verify contract {market.address}
            </a>
          )}
          {errors[market.key] && (
            <p className="error-note">{errors[market.key]}</p>
          )}
        </article>
      </div>
      <Risk synthetic={market.synthetic} />
      <Risk provider />
      <div className="button-row">
        <RouteLink
          className="secondary-button"
          to={`/positions?pool=${market.key}`}
        >
          Positions
        </RouteLink>
        <RouteLink
          className="secondary-button"
          to={`/create-pool?pool=${market.key}`}
        >
          Create a fresh market
        </RouteLink>
      </div>
    </>
  );
}
