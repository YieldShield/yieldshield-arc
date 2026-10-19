# Operations

## Arc testnet deployment

**State: `deployed-and-verified`** (deployment `arc-testnet-2026-10-19T13-33-11Z-5929f2`, source `d48ec26`, Chronicle oracle).

- **Verified:** `npm run verify:arc-testnet` passed at 13:33 UTC on 19 October 2026.
- **Journey:** the journey wallet completed 8 confirmed transactions on the EURC market ([evidence](evidence/arc-testnet-journey.json)).
- **Addresses:** recorded in [config/deployment.json](../config/deployment.json) and listed in the [README](../README.md#status--19-october-2026).
- **Replacement deadline:** the featured markets close to new protection at **18 November 2026, 13:33 UTC**. Replace them before then (see below).

| Wallet | Address | Holds after deployment and journey |
|---|---|---|
| Deployer (dedicated test signer) | `0x10D42586A65a98BCa4baFAa1bF5DCB10c820f50a` | 4.663624 USDC. A replacement round needs 15 USDC of seeds plus gas, so top it up from the faucet first |
| Journey wallet (second, separate) | `0x424cb86EEd3Bf1101C0f2b6f74Db2C291284456d` | 20.779056 USDC and 19.285714 EURC |

**Wallets.**
- Both wallets were created on 19 October 2026 with `cast wallet new`.
- Their keys exist only in the ignored `.secrets/arc-test-signer.json` and `.secrets/arc-journey-wallet.json` (mode 600). They were never printed, committed or used in browser code.
- Use only faucet test USDC and EURC. Never fund either wallet from an account that holds real funds.
- Anvil's well-known development account #1 (`0x7099…79C8`) is blocklisted on Arc testnet. Never use it there.

**Faucet.** https://faucet.circle.com is protected by reCAPTCHA and limited to one request per token, network and address every 2 hours. Funding is therefore a manual step.

### Oracle: Chronicle in use, Pyth implemented but blocked

**Chronicle (deployed).** The adapters read Chronicle push feeds:

- EURC/USD ÷ USDC/USD for EURC;
- CIRBTC/USDC for cirBTC.

They reject values older than 3 hours (`maxPriceAge` 10,800 s).

**Outages.** These feeds were down for about 28 hours, from 18 October 09:08 UTC until 13:20–13:25 UTC on 19 October, and for about 34 hours on 7–8 October. During an outage:

- **These revert:** new protection, asset exits, market creation and replacement rounds. The preflight refuses to start and names the stale feed.
- **These keep working:** backing exits, settlement and claims.

Retry after Chronicle updates. Check a feed's age with:

```sh
cast call 0x4640b2AF58f6Efc32b524C61e59C99d3845aD7C1 'tryReadWithAge()(bool,uint256,uint256)' --rpc-url https://rpc.testnet.arc.io
```

**Pyth (alternative).** Set `"oracle": "pyth"` in a fresh deployment's manifest to use `ShieldPythOracle` with Pyth `0x2880aB155794e7179c9eE2e38200202908C17B43`. Pyth is a pull oracle, so the scripts, app and agent recipes push a price update in its own transaction before each price-reading step. It is unused for two reasons:

- **API key.** Hermes, the service that signs updates, has required an API key since 26 August 2026 (Pyth Terminal, https://pythdata.app/signup). Store the key in the ignored `.secrets/pyth-api-key` or export `PYTH_API_KEY`; on the hosted site it is a server-side Vercel variable. Never commit it or put it in browser code.
- **Contract generation.** Arc testnet's Pyth contract was left out of Pyth's August upgrade, and its last successful update was on 22 September. The Pyth preflight simulates an update on chain, for free, before anything is sent.

### Procedure

This procedure was used for the 19 October deployment, with Chronicle. Pyth differences are noted.

1. Build and test the exact checkout: `npm ci --ignore-scripts`, `npm run test:contracts`, `npm test`, `npm run build`.
2. `npm run deploy:arc-testnet` runs a read-only preflight. It checks:
   - the chain ID;
   - the signer, which must equal `deployer` in the manifest;
   - the identities of the USDC, EURC and cirBTC contracts;
   - the oracle:
     - **Chronicle:** the three feeds against `maxPriceAge`, and the SelfKisser's code.
     - **Pyth:** it fetches a Hermes update, checks each value's age, exponent and confidence, reads `getUpdateFee` and simulates `updatePriceFeeds` on chain.
   - that `contracts/out` was compiled from the current sources;
   - the git state;
   - the funding, against both views of the single USDC balance. The native view must cover gas plus seeds, and the ERC-20 view must cover the seeds.

   It never broadcasts. On 19 October it reported 20 USDC available against 15.962 needed, and feed ages of 484–734 s.
3. When the preflight passes, `npm run deploy:arc-testnet -- --broadcast` executes the plan:
   - deploy the scenario oracle, the two reference adapters and the factory. Chronicle adapters whitelist themselves through the SelfKisser in their constructor.
   - approve exactly 15 USDC to the factory;
   - create three featured markets, each seeded with 5 USDC credited to the deployer as provider shares.

   With Chronicle this is 8 steps (the 19 October run used 13.45M gas). With Pyth, an update step (`pyth-update-<n>`, a never-reused label) precedes each reference market, for 10 steps.

   Gas and fees:
   - Every transaction's gas limit is its estimate plus 30%, because a mined oracle read can cost more than estimated.
   - Fees are signed at no less than 40 gwei, because Arc drops transactions with `maxFeePerGas` below its 20 gwei minimum base fee.
4. `npm run verify:arc-testnet` checks the deployment and marks the manifest `deployed-and-verified` only if every check passes:
   - runtime code against `contracts/out`, with immutables masked;
   - factory wiring;
   - each adapter's configuration:
     - **Chronicle:** feeds, `maxAge` and whitelisting.
     - **Pyth:** contract, feeds, `maxAge` and confidence limit.
   - asset identities;
   - terms and open epochs;
   - each creation receipt's `PoolCreated`, `JuniorDeposited` and 6-decimal USDC seed transfer. Transfers are matched on the USDC contract as emitter; Arc also emits an 18-decimal system `Transfer`.
   - every recorded receipt.
5. `npm run journey:arc-testnet` checks the journey wallet and the price. With `--broadcast`, it runs a scripted journey from that second wallet, with a 30% gas margin on every transaction:
   - provide 2 USDC;
   - protect 2 EURC;
   - wait the exit delay;
   - take a partial asset exit, then a backing exit;
   - request notice and redeem.

   With Pyth, an update precedes providing, protecting and the asset exit. Evidence goes to `docs/evidence/arc-testnet-journey.json`; the 19 October run confirmed 8 transactions.
6. Commit the manifest and evidence separately. Rebuild the site; `/agent.json` then reports `writesEnabled: true`. Before describing the deployment as end-to-end tested with real wallets, do at least one real MetaMask transaction.

The scripts have no mainnet mode. Every asset-moving contract accepts only chain 5042002 or the local chain 31337.

### Signed intents and resuming

These rules are unchanged from the template.

- **Binding.** The first broadcast gives the manifest a `deploymentId` (`arc-testnet-…`). Every transaction is signed and saved as an intent in `.secrets/transactions/<deploymentId>/<label>.json` before it is sent. Each intent is bound to:
  - chain 5042002;
  - the signer;
  - its nonce;
  - the hash of its target, value and calldata;
  - for contract creations, the hash of the artifact bytecode.
- **Deadlines.** `deadline` arguments are set at signing time: chain time plus one hour.
- **Resuming.** A rerun handles each stored intent by its state:
  - **Mined:** recorded.
  - **Pending:** waited for.
  - **Unknown to the node, nonce unused:** rebroadcast unchanged. It is re-signed only near its deadline or if the node rejects it.
  - **Reverted:** recorded under `failedTransactions`, and the run stops. Retry with `--broadcast --retry-reverted <label>`.
  - **Nonce consumed elsewhere:** the run stops.
- **Do not:**
  - delete an intent that may be pending or mined;
  - send other transactions from the deployer during a deployment.
- **Starting over.** After contract changes, restore the pre-deployment manifest: every contract field `null`, `transactions: []`, and no `deploymentId`. One way is `git checkout <commit> -- config/deployment.json`.

### Rehearsal

`npm run rehearse:arc-testnet` runs everything above through the scripts' loopback-only overrides (`ARC_MANIFEST`, `ARC_RPC_URL`, `ARC_SIGNER_FILE`, `ARC_INTENTS_DIR`, `ARC_JOURNEY_WALLET`, `ARC_PRICE_SOURCE=mock`). The setup is:
- an Anvil on port 8567 with chain ID 5042002 and a 20 gwei base fee;
- local stand-ins installed at the canonical Arc addresses: USDC, EURC, cirBTC, Pyth (MockPyth, charging 1 wei per price like the real contract), the three Chronicle feeds and the SelfKisser;
- disposable signers under `.local/rehearsal/`.

The steps are: preflight (including the update simulation), broadcast (10 steps), verify, a rerun that must send nothing, then the 11-transaction second-wallet journey. One difference from Arc: Anvil keeps native and ERC-20 balances separate, so the rehearsal sets both to the same 20 USDC. The overrides are refused for any non-loopback RPC.

`npm run check:chronicle-fork` forks Arc testnet locally, deploys the Chronicle adapters on the fork only, and checks them against the real Chronicle feeds and SelfKisser. Once a Pyth API key exists, the same fork approach can dress-rehearse the Pyth deployment against the real contract.

## Featured markets and replacement

The featured terms are:

- 150% collateral;
- gain fees of 10% to providers and 1% to the creator, plus the fixed 1% protocol fee;
- a 30-day epoch, the contract maximum;
- a 60-second holder exit delay;
- a 120-second provider notice.

Epochs cannot be extended. The deployer is both creator and protocol fee recipient on this testnet.

**Slots.** The factory registers at most 32 markets in its lifetime:
- 10 slots are reserved for the deployer (the protocol account);
- community wallets share the other 22, at most two per wallet;
- each market allows at most 100 open positions and a 0.01 USDC minimum claim.

**Replacement.** Within seven days of the earliest featured maturity:

1. Top up the deployer: it holds 4.66 USDC after the first deployment, and a round needs 15 USDC of seeds plus gas. Then run `npm run deploy:arc-testnet -- --replace-featured`. The preflight budgets about 11M gas (enough for the Pyth variant's two updates and the 30% margin) and needs fresh Chronicle feeds.
2. Run the same command with `--broadcast`. The manifest switches to the new markets only once all three exist, and records the superseded ones under `replacements[n].retired`.
3. Run `npm run verify:arc-testnet`, then rebuild the site.

**Calendar.** Each live deployment needs one replacement run per month. The first deadline is **18 November 2026, 13:33 UTC**. Run the round from 11 November.

## Website and wallet behavior

- `npm run build` produces `dist/`, including `agent.json`, `llms.txt` and `abi/*.json` generated from `config/deployment.json`. No secret environment variable is needed.
- **Writes.** They are enabled only for a manifest marked `deployed-and-verified` on chain 5042002, or in the development-only local mode.
- **Wallet.** The app adds and switches to Arc Testnet with `https://rpc.testnet.arc.io`. Before signing, it:
  - simulates every call;
  - re-checks the account and chain;
  - uses exact approvals, slippage limits and chain-time deadlines;
  - records hashes before waiting for receipts.
- **USDC is gas.** USDC deposits keep 0.1 USDC unspent, and wallets without testnet USDC are told to use the faucet first.
- **Prices (Chronicle, deployed).** The status and market pages show each reference price and its age against the 3-hour limit. A stale reference is shown as stale; new protection and asset exits are then disabled by the contracts. It is never replaced by the scenario price.
- **Prices (Pyth mode).**
  - The pages show the last on-chain Pyth price, its publish time and its age against the 120 s limit.
  - Each price-reading action first pushes a fresh price. The review screen shows "2 · Pyth price update, then the action" with the fee.
  - Quotes use the fresh Pyth values, computed exactly as the adapter computes them.
- **Price proxy (Pyth mode only).** In production, the browser gets update data from the same-origin function `/api/pyth-update`. It forwards only this deployment's three feed IDs and keeps the Hermes key server-side in `PYTH_API_KEY`. Without the key, it answers 503 and the app explains that price updates are not configured. In development, the Vite server runs the same handler with the key from `.secrets/pyth-api-key`. Local mode uses MockPyth.

## Expiry and provider liquidity

**Freeze.** Provider entry and redemption are frozen while any protected position is open, which in a featured market can last up to 30 days.

**Settlement.**
- Anyone can settle a matured position from its detail page.
- The owner then claims the separately reserved USDC credit.
- Provider notice can start before exposure clears.

**Redemption.** It returns a proportional basket of USDC and surrendered protected assets. Earned fees are independent claims.

## Reproducible local evidence

- **Solidity:** 72 tests, including 6 fuzz tests of 256 runs each. They cover:
  - fairness, expiry, partial exits, rewards and reward-index solvency;
  - slots, factory limits, events and transfers;
  - 6-, 8- and 18-decimal assets;
  - Pyth adapter edge cases: staleness, never-published feeds, clock skew, zero or negative prices, exponents, confidence, the USDC/USD division, fees, and a pool round trip with pull updates;
  - Chronicle and Chainlink adapter edge cases;
  - Arc-style USDC blocklisting;
  - rejection of native value.
- **JavaScript:** 21 tests covering arithmetic (including custom fee terms), the agent manifest, Pyth math and Hermes parsing, the price proxy's allowlist and key handling, freshness and review lifecycle.
- **Browser:** 9 public tests, plus 3 local-chain tests:
  - the signed journey, with two Pyth updates, each immediately before its action;
  - a rejected price update that sends no protection;
  - the in-flight quote race.
- **Local journey:** 52 transactions on chain 31337 with MockPyth ([evidence](evidence/local-journey.json)).
- **Rehearsal:** [evidence](evidence/arc-rehearsal.json).
- **Fork check:** [evidence](evidence/chronicle-fork-check.json).

To run locally: start Anvil on 8567, run `node scripts/local-journey.mjs --browser-ready`, then `node scripts/local-web.mjs` (port 5204). Local chain state and `.local/` are ignored. Private keys are never needed in browser source.
