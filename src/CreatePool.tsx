import { useReviewGuard } from "./review";
import { consumeReview } from "./lifecycle.mjs";
import { useState, useEffect } from "react";
import { decodeEventLog } from "viem";
import {
  assets,
  config,
  DEFAULT_TERMS,
  factoryAbi,
  oracleAbi,
  tokenAbi,
  read,
  fmt,
  chainDeadline,
  chainTimestamp,
  GAS_RESERVE,
  sourceNames,
} from "./chain";
import { useShield } from "./state";
import { PageTitle, ActionButton, Facts, RouteLink, Risk } from "./ui";
import { safeError } from "./math.mjs";
import { fetchPriceUpdate, pythAbi, usesPyth } from "./pyth";
import { TwoStepNote } from "./Workflows";
export function CreatePool() {
  const { account, identity, approve, transact } = useShield();
  const [asset, setAsset] = useState<"eurc" | "cirbtc">("eurc"),
    [source, setSource] = useState("reference"),
    [terms, setTerms] = useState(DEFAULT_TERMS),
    [review, setReview] = useState<{
      assertCurrent: () => void;
      deadline: bigint;
      seed: bigint;
      identity: number;
      priceUpdateFee?: bigint;
    } | null>(null),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  useEffect(() => {
    setReview(null);
    setError("");
    setSuccess("");
  }, [asset, source, terms, identity]);
  const chosen = assets.find((a) => a.key === asset)!,
    collateral = config.usdc,
    oracle =
      asset === "cirbtc"
        ? config.cirbtcOracle
        : source === "scenario"
          ? config.scenarioOracle
          : config.eurcOracle;
  const guard = useReviewGuard([asset, source, terms, identity]);
  async function check() {
    setError("");
    const assertCurrent = guard();
    try {
      if (!account) throw new Error("Connect first.");
      if (Object.values(terms).some((v) => !Number.isSafeInteger(v)))
        throw new Error("Terms must use whole basis points and whole seconds.");
      const [
        seed,
        allowed,
        created,
        community,
        registry,
        maxPools,
        reserved,
        perCreator,
        protocol,
      ] = await Promise.all([
        read(config.factory, factoryAbi, "CREATION_SEED"),
        read(config.factory, factoryAbi, "allowed", [chosen.address, oracle]),
        read(config.factory, factoryAbi, "poolsCreatedBy", [account]),
        read(config.factory, factoryAbi, "communityPools"),
        read(config.factory, factoryAbi, "allPools"),
        read(config.factory, factoryAbi, "MAX_POOLS"),
        read(config.factory, factoryAbi, "PROTOCOL_RESERVED_POOLS"),
        read(config.factory, factoryAbi, "MAX_POOLS_PER_CREATOR"),
        read(config.factory, factoryAbi, "protocol"),
      ]);
      const isProtocol = account.toLowerCase() === protocol.toLowerCase();
      if (BigInt(registry.length) >= maxPools)
        throw new Error(`The factory registry is full (${maxPools} markets).`);
      if (!isProtocol && community >= maxPools - reserved)
        throw new Error(
          `All ${maxPools - reserved} community market slots are taken; the rest are reserved for featured markets.`,
        );
      if (!isProtocol && created >= perCreator)
        throw new Error(
          `Each wallet can create at most ${perCreator} community markets.`,
        );
      if (!allowed)
        throw new Error(
          "This asset and oracle are not approved by the factory.",
        );
      // Creation reads the reference price: Pyth markets check a fresh update now and push one before creating.
      const pyth = usesPyth && oracle !== config.scenarioOracle;
      const priceUpdateFee = pyth
        ? (await fetchPriceUpdate()).fee
        : (await read(oracle, oracleAbi, "price"), undefined);
      const held = await read(collateral, tokenAbi, "balanceOf", [account]);
      if (held < seed + GAS_RESERVE)
        throw new Error(
          `Seeding needs ${fmt(seed)} USDC plus about 0.1 USDC for network fees; this wallet holds ${fmt(held)} USDC. Get testnet USDC from Circle's faucet first.`,
        );
      if (
        terms.collateralBps < 12500 ||
        terms.collateralBps > 30000 ||
        terms.juniorFeeBps < 0 ||
        terms.juniorFeeBps > 2000 ||
        terms.creatorFeeBps < 0 ||
        terms.creatorFeeBps > 500 ||
        terms.juniorFeeBps + terms.creatorFeeBps + 100 > 2500 ||
        terms.epochSeconds < 86400 ||
        terms.epochSeconds > 2592000 ||
        terms.exitDelay < 60 ||
        terms.exitDelay > 3600 ||
        terms.juniorNotice < 120 ||
        terms.juniorNotice > 86400
      )
        throw new Error("Choose terms inside the displayed factory limits.");
      const reviewedDeadline = await chainDeadline();
      assertCurrent();
      setReview({
        assertCurrent,
        deadline: reviewedDeadline,
        seed,
        identity,
        priceUpdateFee,
      });
    } catch (e) {
      setError(safeError(e));
    }
  }
  async function confirm() {
    setError("");
    const assertCurrent = guard();
    try {
      if (
        !review ||
        review.identity !== identity ||
        review.deadline < (await chainTimestamp())
      )
        throw new Error("Review expired or wallet changed.");
      consumeReview(review.assertCurrent);
      setReview(null);
      await approve(collateral, config.factory, review.seed);
      if (review.priceUpdateFee !== undefined) {
        assertCurrent();
        const fresh = await fetchPriceUpdate();
        await transact(
          "Update Pyth price",
          config.pyth.contract,
          pythAbi,
          "updatePriceFeeds",
          [fresh.data],
          fresh.fee,
          review.assertCurrent,
        );
      }
      assertCurrent();
      review.assertCurrent();
      const receipt = await transact(
        "Create and seed market",
        config.factory,
        factoryAbi,
        "createPool",
        [chosen.address, oracle, terms, review.deadline],
        undefined,
        review.assertCurrent,
      );
      for (const log of receipt.logs) {
        try {
          const event = decodeEventLog({
            abi: factoryAbi,
            data: log.data,
            topics: log.topics,
          }) as any;
          if (event.eventName === "PoolCreated") setSuccess(event.args.pool);
        } catch {}
      }
      setReview(null);
    } catch (e) {
      setError(safeError(e));
    }
  }
  const termInputs: [keyof typeof terms, string, number, number, number][] = [
    ["collateralBps", "Collateral (%)", 125, 300, 100],
    ["juniorFeeBps", "Provider gain fee (%)", 0, 20, 100],
    ["creatorFeeBps", "Creator gain fee (%)", 0, 5, 100],
    ["epochSeconds", "Epoch length (days)", 1, 30, 86400],
    ["exitDelay", "Holder exit delay (seconds)", 60, 3600, 1],
    ["juniorNotice", "Provider notice (seconds)", 120, 86400, 1],
  ];
  return (
    <>
      <PageTitle
        eyebrow="CREATE A MARKET"
        title="Set the terms. Supply the seed."
        description="Choose assets and terms. Create and fund your pool in one transaction."
      />
      <div className="market-grid">
        <section className="action-card">
          {success ? (
            <div className="success-panel">
              <h2>Market created.</h2>
              <p>
                Your creation seed belongs to you as provider shares. The
                factory registered the actual contract.
              </p>
              <RouteLink
                className="hero-link"
                to={`/pools/${success}?pool=${success}`}
              >
                Open your market ↗
              </RouteLink>
            </div>
          ) : (
            <>
              <label className="field-label">
                Protected asset
                <select
                  name="protected-asset"
                  value={asset}
                  onChange={(e) =>
                    setAsset(e.target.value as "eurc" | "cirbtc")
                  }
                >
                  {assets.map((a) => (
                    <option value={a.key} key={a.key}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="muted-text">
                Backing: USDC on Arc testnet, the only approved backing.
              </p>
              {asset === "eurc" && (
                <label className="field-label">
                  Price source
                  <select
                    name="oracle-source"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option value="reference">{sourceNames.eurc}</option>
                    <option value="scenario">
                      Synthetic scenario · 1.10 / 1.20 / 1.00
                    </option>
                  </select>
                </label>
              )}
              <div className="form-grid">
                {termInputs.map(([key, label, min, max, scale]) => (
                  <label className="field-label" key={key}>
                    {label}
                    <input
                      name={key}
                      autoComplete="off"
                      type="number"
                      min={min}
                      max={max}
                      step={scale === 100 ? "0.01" : "1"}
                      value={terms[key] / scale}
                      onChange={(e) =>
                        setTerms({
                          ...terms,
                          [key]: Math.round(Number(e.target.value) * scale),
                        })
                      }
                    />
                    <small>
                      Allowed {min}–{max}
                    </small>
                  </label>
                ))}
              </div>
              {review ? (
                <>
                  <Facts
                    items={[
                      ["Initial provider seed", `${fmt(review.seed)} USDC`],
                      ["Protocol gain fee", "Fixed 1%"],
                      ["Fees taken from", "Positive realized gains only"],
                      ["Factory limit", "32 registered markets"],
                    ]}
                  />
                  <TwoStepNote fee={review.priceUpdateFee} />
                  <ActionButton onClick={() => void confirm()}>
                    Create and fund market
                  </ActionButton>
                  <button
                    className="text-button"
                    onClick={() => setReview(null)}
                  >
                    Edit terms
                  </button>
                </>
              ) : (
                <ActionButton onClick={() => void check()}>
                  Review market creation
                </ActionButton>
              )}
              {error && (
                <p className="error-note" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </section>
        <section className="market-card">
          <h2>A real independent market.</h2>
          <p className="card-description">
            The seed is 5 testnet USDC. It is credited to you as provider
            shares, not consumed as a listing fee.
          </p>
          <Facts
            items={[
              ["Approved protected assets", "EURC · cirBTC"],
              ["Approved backing", "USDC"],
              [
                "Approved prices",
                `${config.oracle === "pyth" ? "Pyth" : "Chronicle"} reference · EURC scenario`,
              ],
              ["Position cap", "100 open positions; 0.01 minimum entry claim"],
              ["Creation limit", "2 markets per wallet; 22 community slots"],
              ["Creator control", "Immutable terms; no seizure function"],
            ]}
          />
          <Risk
            provider
            synthetic={asset === "eurc" && source === "scenario"}
          />
          <RouteLink className="hero-link" to="/faucet?asset=usdc">
            Get testnet USDC ↗
          </RouteLink>
        </section>
      </div>
    </>
  );
}
