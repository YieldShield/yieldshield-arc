import { useState } from "react";
import { PageTitle, RouteLink, Facts, Risk } from "./ui";
export function Guide() {
  const [move, setMove] = useState(10);
  // 100 EURC at an entry price of 1.10 USDC: a 110 USDC entry claim.
  const entry = 110,
    spot = entry * (1 + move / 100),
    gain = Math.max(spot - entry, 0),
    fee = gain * 0.12;
  return (
    <>
      <PageTitle
        eyebrow="THE FIELD GUIDE"
        title="Two roles. One explicit tradeoff."
        description="A holder gives providers some positive-gain fees in exchange for an entry claim. Providers supply the backing and carry the downside."
      />
      <div className="asset-cards">
        <article>
          <div className="eyebrow">01 / HOLDER</div>
          <h2>Choose your exit.</h2>
          <p>
            Deposit EURC or cirBTC at the reference price; your entry claim is
            fixed in USDC. After the exit delay, withdraw part or all of the
            asset and pay fees only on realized gains, or surrender that slice
            for its proportional USDC claim. Ownership can be transferred with
            its original basis and maturity.
          </p>
          <RouteLink to="/protect">Open protection ↗</RouteLink>
        </article>
        <article>
          <div className="eyebrow">02 / CAPITAL PROVIDER</div>
          <h2>Back the downside.</h2>
          <p>
            Deposit USDC into a market. Positive asset exits create
            independently claimable fees. Backing exits consume your USDC and
            leave you the surrendered asset. Redemption returns a basket of USDC
            and asset inventory.
          </p>
          <RouteLink to="/provide">Provide capital ↗</RouteLink>
        </article>
      </div>
      <section className="scenario-section" id="scenarios">
        <div>
          <div className="eyebrow">ILLUSTRATION / NOT A LIVE QUOTE</div>
          <h2>Walk through the outcome.</h2>
          <p>
            Example: 100 EURC, entry price 1.10 USDC, default 10% provider + 1%
            creator + 1% protocol fee on gains. This slider does not move an
            oracle or send a transaction.
          </p>
          <label htmlFor="movement">
            Price move{" "}
            <strong>
              {move > 0 ? "+" : ""}
              {move}%
            </strong>
          </label>
          <input
            id="movement"
            type="range"
            min="-30"
            max="30"
            value={move}
            onChange={(e) => setMove(Number(e.target.value))}
          />
          <div className="range-labels">
            <span>−30%</span>
            <span>+30%</span>
          </div>
        </div>
        <div className="scenario-results">
          <Facts
            items={[
              ["Asset value at selected price", `${spot.toFixed(2)} USDC`],
              [
                "Asset exit value after gain fees",
                `${(spot - fee).toFixed(2)} USDC`,
              ],
              ["Backing exit claim", "110.00 USDC"],
              [
                "Providers’ gain fee",
                `${(gain * 0.1).toFixed(2)} USDC equivalent`,
              ],
              [
                "Providers’ surrendered-asset loss on backing exit",
                `${Math.max(entry - spot, 0).toFixed(2)} USDC equivalent`,
              ],
            ]}
          />
          <p>
            No APY is implied. Provider returns depend on realized fees and
            losses.
          </p>
        </div>
      </section>
      <Risk />
      <Risk provider />
      <div className="field-note">
        <h2>Why an epoch?</h2>
        <p>
          Provider entries and redemptions pause while any position is open.
          This prevents someone redeeming an overstated share value before
          holders exercise underwater claims. At the fixed maturity, anyone can
          settle each remaining position without its owner. Backing credit is
          reserved separately until the owner claims it.
        </p>
        <h2>What happens on a partial exit?</h2>
        <p>
          The withdrawn slice gets its proportional entry claim; rounding
          preserves the remainder. Gain fees apply only to the withdrawn slice.
          Remaining protection keeps its original opening time and maturity.
        </p>
        <h2>Why two signatures?</h2>
        <p>
          Reference markets use Pyth, a pull oracle: a price is only on chain
          after someone pushes it. Before protecting, taking an asset exit or
          creating a market, the app sends a Pyth price update (a fee of a few
          wei of USDC plus gas), then the action. The markets reject prices
          older than two minutes or with too wide a confidence interval. Backing
          exits and maturity settlement need no price and no update. No
          reference market ever falls back to the scenario price.
        </p>
      </div>
    </>
  );
}
export function Legal() {
  return (
    <>
      <PageTitle
        eyebrow="TERMS & RISKS"
        title="An experiment with clear limits."
        description="YieldShield Arc is an unaudited Arc testnet prototype with valueless test tokens. Providers can lose capital, a holder's claim is only as good as the USDC reserved in the contract, and no return is promised."
      />
      <div className="field-note">
        <h2>Use test assets only</h2>
        <p>
          All contracts are gated to Arc testnet (chain 5042002) or a local test
          chain. They use Circle&apos;s testnet USDC, EURC and cirBTC, which
          have no monetary value and are not redeemable. Nothing here is
          deployed on Arc mainnet or holds real funds.
        </p>
        <h2>Economic and technical risks</h2>
        <p>
          Providers may lose their backing. Holder protection is limited to a
          fixed USDC claim and depends on contract correctness and on the
          backing actually reserved. Oracle prices may be unavailable or stale;
          an asset exit can fail while a backing claim remains possible. USDC
          transfers to or from blocklisted addresses revert on Arc.
          Smart-contract errors, wallet errors and network interruptions are
          possible. At maturity, forced settlement forfeits remaining asset
          upside.
        </p>
        <h2>Browser data</h2>
        <p>
          The app stores transaction hashes, account addresses and labels
          locally in your browser for its Activity journal. It does not store
          private keys or recovery phrases. The RPC provider and your wallet
          receive requests needed to read and transact.
        </p>
        <h2>Production readiness</h2>
        <p>
          Source tests and local demonstrations do not replace an independent
          security audit, live contract verification or production integration
          review. Review contract addresses and network status before signing.
        </p>
      </div>
    </>
  );
}
