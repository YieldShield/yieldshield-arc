# Operations

## Arc testnet deployment

**State on 19 October 2026: `awaiting-testnet-usdc`.**

| Wallet | Address | Needs (from https://faucet.circle.com, network "Arc Testnet") |
|---|---|---|
| Deployer (dedicated test signer) | `0x10D42586A65a98BCa4baFAa1bF5DCB10c820f50a` | One USDC claim (20 USDC): 15 USDC for three 5 USDC market seeds, plus about 0.7 USDC of gas with 30% headroom |
| Journey wallet (second, separate) | `0x424cb86EEd3Bf1101C0f2b6f74Db2C291284456d` | One USDC claim and one EURC claim (20 each) |

**Wallets.**
- Both wallets were created on 19 October 2026 with `cast wallet new`.
- Their keys exist only in the ignored `.secrets/arc-test-signer.json` and `.secrets/arc-journey-wallet.json` (mode 600). They were never printed, committed or used in browser code.
- Use only faucet test USDC and EURC. Never fund either wallet from an account that holds real funds.
- Anvil's well-known development account #1 (`0x7099…79C8`) is blocklisted on Arc testnet. Never use it there.

**Faucet.** It is protected by reCAPTCHA and limited to one request per token, network and address every 2 hours. Funding is therefore a manual step.

**Oracle prerequisite.** The reference markets are created against Chronicle feeds, which must be younger than 3 hours (`maxPriceAge` 10,800 s). The 19 October preflight found all three feeds about 22 hours old ([evidence](evidence/arc-testnet-preflight.json)). On 7–8 October, a similar outage lasted about 34 hours. If the feeds are stale, the preflight refuses to start and names the stale feed. Retry after Chronicle updates. Check the age with:

```sh
cast call 0x4640b2AF58f6Efc32b524C61e59C99d3845aD7C1 'tryReadWithAge()(bool,uint256,uint256)' --rpc-url https://rpc.testnet.arc.io
```

### Procedure

1. Build and test the exact checkout: `npm ci --ignore-scripts`, `npm run test:contracts`, `npm test`, `npm run build`.
2. `npm run deploy:arc-testnet` runs a read-only preflight. It checks:
   - the chain ID;
   - the signer, which must equal `deployer` in the manifest;
   - the identities of the USDC, EURC and cirBTC contracts;
   - the three Chronicle feeds against `maxPriceAge`;
   - the SelfKisser's code;
   - that `contracts/out` was compiled from the current sources;
   - the git state;
   - the funding, against both views of the single USDC balance. The native view must cover gas plus seeds, and the ERC-20 view must cover the seeds.

   It never broadcasts.
3. When the preflight passes, `npm run deploy:arc-testnet -- --broadcast` executes the plan in 8 steps:
   - deploy the scenario oracle, the two Chronicle adapters (each whitelists itself through the SelfKisser in its constructor) and the factory;
   - approve exactly 15 USDC to the factory;
   - create three featured markets, each seeded with 5 USDC credited to the deployer as provider shares.

   Measured on the rehearsal: 13.42M gas limit, 13.28M used. Fees are signed at no less than 40 gwei, because Arc drops transactions with `maxFeePerGas` below its 20 gwei minimum base fee.
4. `npm run verify:arc-testnet` checks the deployment and marks the manifest `deployed-and-verified` only if every check passes:
   - runtime code against `contracts/out`, with immutables masked;
   - factory wiring;
   - each adapter's feeds, `maxAge` and Chronicle whitelisting;
   - asset identities;
   - terms and open epochs;
   - each creation receipt's `PoolCreated`, `JuniorDeposited` and 6-decimal USDC seed transfer. Transfers are matched on the USDC contract as emitter; Arc also emits an 18-decimal system `Transfer`.
   - every recorded receipt.
5. `npm run journey:arc-testnet` checks the journey wallet and the price. With `--broadcast`, it runs a scripted journey from that second wallet:
   - provide 2 USDC;
   - protect 2 EURC;
   - wait the exit delay;
   - take a partial asset exit, then a backing exit;
   - request notice and redeem.

   Evidence goes to `docs/evidence/arc-testnet-journey.json`.
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

`npm run rehearse:arc-testnet` runs everything above through the scripts' loopback-only overrides (`ARC_MANIFEST`, `ARC_RPC_URL`, `ARC_SIGNER_FILE`, `ARC_INTENTS_DIR`, `ARC_JOURNEY_WALLET`). The setup is:
- an Anvil on port 8567 with chain ID 5042002 and a 20 gwei base fee;
- local stand-ins installed at the canonical Arc addresses: USDC, EURC, cirBTC, the three Chronicle feeds and the SelfKisser;
- disposable signers under `.local/rehearsal/`.

The steps are: preflight, broadcast, verify, a rerun that must send nothing, then the second-wallet journey. One difference from Arc: Anvil keeps native and ERC-20 balances separate, so the rehearsal sets both to the same 20 USDC. The overrides are refused for any non-loopback RPC.

`npm run check:chronicle-fork` forks Arc testnet locally, deploys the adapters on the fork only, and checks them against the real Chronicle feeds and SelfKisser.

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

1. Run `npm run deploy:arc-testnet -- --replace-featured`. It needs 15 USDC for seeds, about 8.2M gas and fresh feeds.
2. Run the same command with `--broadcast`. The manifest switches to the new markets only once all three exist, and records the superseded ones under `replacements[n].retired`.
3. Run `npm run verify:arc-testnet`, then rebuild the site.

**Calendar.** Each live deployment needs one replacement run per month.

## Website and wallet behavior

- `npm run build` produces `dist/`, including `agent.json`, `llms.txt` and `abi/*.json` generated from `config/deployment.json`. No secret environment variable is needed.
- **Writes.** They are enabled only for a manifest marked `deployed-and-verified` on chain 5042002, or in the development-only local mode.
- **Wallet.** The app adds and switches to Arc Testnet with `https://rpc.testnet.arc.io`. Before signing, it:
  - simulates every call;
  - re-checks the account and chain;
  - uses exact approvals, slippage limits and chain-time deadlines;
  - records hashes before waiting for receipts.
- **USDC is gas.** USDC deposits keep 0.1 USDC unspent, and wallets without testnet USDC are told to use the faucet first.
- **Prices.** The status and market pages show each reference price's age against its limit. A stale reference is shown as stale and never replaced by the scenario price.

## Expiry and provider liquidity

**Freeze.** Provider entry and redemption are frozen while any protected position is open, which in a featured market can last up to 30 days.

**Settlement.**
- Anyone can settle a matured position from its detail page.
- The owner then claims the separately reserved USDC credit.
- Provider notice can start before exposure clears.

**Redemption.** It returns a proportional basket of USDC and surrendered protected assets. Earned fees are independent claims.

## Reproducible local evidence

- **Solidity:** 60 tests, including 5 fuzz tests of 256 runs each. They cover:
  - fairness, expiry, partial exits, rewards and reward-index solvency;
  - slots, factory limits, events and transfers;
  - 6-, 8- and 18-decimal assets;
  - Chronicle and Chainlink adapter edge cases;
  - Arc-style USDC blocklisting;
  - rejection of native value.
- **JavaScript:** 19 tests covering arithmetic, the agent manifest, freshness and review lifecycle.
- **Browser:** 9 public tests, plus 3 local-chain tests (the signed journey, stale-price blocking, and the in-flight quote race).
- **Local journey:** 56 transactions on chain 31337 ([evidence](evidence/local-journey.json)).
- **Rehearsal:** [evidence](evidence/arc-rehearsal.json).
- **Fork check:** [evidence](evidence/chronicle-fork-check.json).

To run locally: start Anvil on 8567, run `node scripts/local-journey.mjs --browser-ready`, then `node scripts/local-web.mjs` (port 5204). Local chain state and `.local/` are ignored. Private keys are never needed in browser source.
