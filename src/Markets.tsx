import { useParams } from "react-router-dom";
import { useShield } from "./state";
import { assets, fmt, explorer } from "./chain";
import { PageTitle, RouteLink, MarketCard, Facts, Risk, Empty } from "./ui";
export function Markets({ home = false }: { home?: boolean }) {
  const { markets } = useShield();
  return (
    <>
      {home ? (
        <section className="hero" aria-labelledby="home-title">
          <div className="hero-art" aria-hidden="true">
            <img
              src="/images/arc-sculpture-1672.webp"
              srcSet="/images/arc-sculpture-960.webp 960w, /images/arc-sculpture-1672.webp 1672w"
              sizes="(max-width: 1100px) 960px, 1100px"
              width="1672"
              height="941"
              fetchPriority="high"
              alt=""
            />
          </div>
          <div className="hero-copy">
            <div className="eyebrow">YIELDSHIELD ARC</div>
            <h1 id="home-title">
              <span>Keep the upside.</span>
              <span>Fix your floor.</span>
            </h1>
            <p>
              USDC-backed protection for EURC and cirBTC.
            </p>
            <div className="hero-actions">
              <RouteLink className="hero-primary" to="/protect">
                Protect an asset <span aria-hidden="true">↗</span>
              </RouteLink>
              <RouteLink className="hero-secondary" to="/provide">
                Provide capital <span aria-hidden="true">↗</span>
              </RouteLink>
            </div>
            <RouteLink className="hero-guide" to="/how-it-works">
              How protection works <span aria-hidden="true">→</span>
            </RouteLink>
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
