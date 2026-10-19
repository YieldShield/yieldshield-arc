# YieldShield Arc: research and scope

Research date: **19 October 2026**. Every chain fact below was checked that day, either against Circle's or Arc's official documentation or by a read-only RPC call against Arc testnet (or Arc mainnet, for the read-only reference feeds). The sources are listed at the end. No funding, partnership, audit, user adoption or mainnet readiness is claimed.

## Why Arc

Arc is Circle's EVM layer-1 chain, and USDC is its native gas token. YieldShield's split-risk model uses a stable backing asset and a volatile protected asset. On Arc, Circle issues both natively: USDC as the backing, and EURC and cirBTC as the protected assets. The backing that capital providers reserve is Arc's own gas and settlement asset. Holder claims are fixed amounts of it, and the planned exits leave Arc through Circle's CCTP. Arc is therefore where value enters, is reserved and settles, not a deployment target added at the end.

## Network facts (Arc testnet)

| Item | Verified value | How it was checked |
|---|---|---|
| Chain ID | `5042002` | `eth_chainId` on every RPC below |
| Public RPC | `https://rpc.testnet.arc.io` | Arc docs, "Connect to Arc"; answered `5042002` |
| Other RPCs | `https://rpc.blockdaemon.testnet.arc.io`, `https://rpc.drpc.testnet.arc.io`, `https://rpc.quicknode.testnet.arc.io` | Each answered `5042002` |
| Retired RPC | `rpc.testnet.arc.network` | NXDOMAIN. viem 2.56.5's built-in `arcTestnet` still lists it, so the app defines its own chain object |
| Explorer | `https://explorer.testnet.arc.io` (Blockscout API at `/api/v2`) | HTTP 200; `testnet.arcscan.app` 301-redirects here |
| Faucet | `https://faucet.circle.com`, Arc Testnet network | 20 USDC per address every 2 hours; EURC and cirBTC are also offered. The page is **protected by reCAPTCHA** |
| Native currency | USDC, 18 decimals | Arc docs; `eth_getBalance` |
| Gas | Minimum base fee 20 gwei, paid in USDC; the base fee goes to the block producer and is not burned. Transactions with `maxFeePerGas` below 20 gwei are dropped silently | Arc docs, "EVM differences"; `eth_gasPrice` returned 25 gwei and the base fee was 20 gwei |
| Blocks | Gas limit 30,000,000; about 0.5 s per block (155,619 blocks in 78,767 s); final on inclusion; timestamps are non-decreasing rather than strictly increasing | Latest block; Arc docs |
| EVM baseline | Osaka hard fork, with EIP-7708 `Transfer` logs for native value. `PREVRANDAO` is always 0; no blob transactions | Arc docs, "EVM differences". Contracts here compile for `cancun`, a subset of that baseline |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` (3,808 bytes of code) | Arc contract-address page; `eth_getCode` |
| Mainnet | Chain `5042`, RPC `https://rpc.mainnet.arc.io`, explorer `https://explorer.arc.io`. Public mainnet since 16 September 2026 | Arc docs; The Block, 16 Sep 2026; `eth_chainId` returned `5042` |

### USDC as gas: native balance and the ERC-20 interface

Arc has one USDC balance per account, which can be read and moved in two ways:

- **Native**: 18 decimals. Used for gas, `msg.value`, `address.balance` and `eth_getBalance`.
- **ERC-20 interface** at `0x3600000000000000000000000000000000000000`: 6 decimals (`decimals()` returned `6`). Used for `transfer`, `approve`, `allowance` and `balanceOf`.

The ERC-20 view truncates the last 12 digits of the native balance. The check on 19 October: the Gateway Wallet held `1003109050321661000000000000` native wei and `1003109050321661` ERC-20 units, exactly 10¹² apart. A transfer through either interface changes the same balance. One ERC-20 transfer emits two `Transfer` logs: an 18-decimal log from the system emitter and a 6-decimal log from the USDC contract. Arc's docs give three more rules:

- never mix `msg.value` with `USDC.balanceOf()` in pool math;
- never deploy a WETH-style wrapper;
- a native transfer can revert even with sufficient balance, for example to or from a blocklisted address, or a value transfer to `0x0`.

**What this means for the accounting here:**

1. Pools hold and move backing **only through the 6-decimal ERC-20 interface**, and keep their own counters (`totalBacking`, `reservedBacking`, `totalClaimableBacking`) rather than reading `balanceOf`. Native value sent to a pool, which can only arrive by force (`SELFDESTRUCT`), is ignored.
2. No pool function is `payable`, and there is no native protected asset. Protecting native USDC against USDC backing would be meaningless, and the template's native-AVAX path and `awAVAX` wrapper are exactly what Arc's docs advise against.
3. Every USDC payout is either a direct exit by the caller or a pull claim. A blocklisted holder or fee recipient therefore cannot block anyone else's exit or settlement. Matured settlement only credits a claim and does not push USDC.
4. The interface warns that USDC is also gas: depositing a whole balance leaves nothing for the next transaction.
5. Deployment and verification match ERC-20 events by emitter address, so the system emitter's 18-decimal log is never counted twice.

## Circle assets on Arc testnet

| Asset | Address | Decimals (on chain) | Role here |
|---|---|---:|---|
| USDC (ERC-20 interface) | `0x3600000000000000000000000000000000000000` | 6 | **Provider backing and holder claims**, and gas |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | 6 | **Protected asset**: EUR exposure against USDC backing |
| cirBTC ("Circle Wrapped Bitcoin") | `0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF` | 8 | **Protected asset**: BTC exposure against USDC backing |
| USYC ("US Yield Coin") | `0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C` | 6 | Research only. Entitlement-gated (Entitlements `0xcc205224862c7641930c87679e98999d23c26113`, Teller `0x9fdF14c5B14173D74C08Af27AebFf39240dC105A`); Circle describes it as for eligible non-US institutions |
| WETH (bridged) | `0x2c4047028a72803939b6fb674D01bC059B5C4961` | 18 | Not used. It is not a Circle-issued asset |

Every symbol, name and decimals value was read on chain. All of these are valueless testnet tokens.

**Tokenized-fund NAV.** USYC's NAV is published by a Chainlink-style oracle at `0x52b56c7642E71dc54714d879127d97cd0B3D4581`, which is also what `Teller.oracle()` returns. Its `description()` is "USYC / USD". It reports 18 decimals and returned 1.140485 from `latestRoundData`, updated 16 October 2026 at 12:33 UTC. The cadence is one update per business day after reconciliation. The repository's Chainlink adapter can read this interface. A USYC market is out of scope, because we cannot obtain entitled USYC and an 18-hour-plus staleness window needs its own design. It is listed as a future option for eligible institutional users.

## CCTP and Gateway on Arc testnet

- **CCTP V2, domain `26`**: `MessageTransmitterV2.localDomain()` returned `26`. Supported tokens: USDC and EURC.
  - TokenMessengerV2: `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA`
  - MessageTransmitterV2: `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275`
  - TokenMinterV2: `0xb43db544E2c27092c107639Ad201b3dEfAbcF192`
  - MessageV2: `0xbaC0179bB358A8936169a63408C8481D582390C4`

  The implementation behind TokenMessengerV2 contains the V2 selector `depositForBurn(uint256,uint32,bytes32,address,bytes32,uint256,uint32)` (`0x8e0250ee`), not the V1 four-argument version. The sandbox attestation API (`https://iris-api-sandbox.circle.com/v2/burn/USDC/fees/26/0`) quoted a minimum fee of 0 for both the fast threshold (1000) and the standard threshold (2000) from Arc to Ethereum Sepolia.
- **Gateway**: GatewayWallet `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`, GatewayMinter `0x0022222ABE238Cc2C7Bb1f21003F0a260052475B`. Both have code on chain.
- **Agent infrastructure listed by Arc**: ERC-8004 IdentityRegistry `0x8004A818BFB912233c491871b3d84c89A494BD9e`, ERC-8183 AgenticCommerce `0x0747EEf0706327138c69792bF28Cd525089e4583`, Multicall3From `0x522fAf9A91c41c443c66765030741e4AaCe147D0`. None is used yet.

CCTP is not integrated in this prototype. The funded plan uses it for USDC exits: a holder's backing exit or matured claim, or a provider redemption, can leave Arc to another CCTP domain in a separate, explicitly reviewed transaction. The pool contracts stay single-chain.

## Price oracles on Arc testnet

| Provider | Arc testnet status on 19 Oct 2026 | Usable for a live market? |
|---|---|---|
| **Chronicle** (push) | 66 oracles listed for Arc Testnet. Used here: EURC/USD `0x4640b2AF58f6Efc32b524C61e59C99d3845aD7C1`, USDC/USD `0x7fBe79354160a1C618015aa77c193CdE0FB29099`, CIRBTC/USDC `0xAd1C417C4bc9f037Fc61DC3fbDc999e501155960`. All report 18 decimals and need a whitelist ("toll"). The testnet SelfKisser `0xDecd203Ef38DEce4553Fc9fD5C570c26bD34B07F` is authorized on these oracles and lets any contract add itself | **Yes, with gaps** (see below) |
| Chainlink | Data Feeds launched on **Arc mainnet** (changelog, 9 Sep 2026; 34 feeds, including EURC/USD `0x361b95c10b76Ca3f35C686d423e43A951755Bf23`, EUR/USD `0xDd5B15443cd733D3966a50a3E48cB7DF9Fb5DE0D`, USDC/USD `0x84EA90AC252Dc437031461836DB5164219147905`; heartbeat 86,400 s; mainnet EURC/USD read 1.12245, updated 19 Oct 01:06 UTC). Chainlink's own network list has **no Arc testnet entry** | Testnet: no. Mainnet: yes; the `ShieldChainlinkOracle` adapter is included and tested for that path |
| Pyth (pull) | Arc testnet contract `0x2880aB155794e7179c9eE2e38200202908C17B43`. The last on-chain EUR/USD update was 22 Sep 2026; prices only move when a caller pushes a Hermes update | Only if every user transaction first pushes an update. Not used |
| Stork (pull) | `0xacC0a0cF13571d30B4b8637996F5D6D774d4fd62` on both networks. BTCUSD and ETHUSD were last written 21 Jun 2026; EURUSD and USDCUSD are not registered (they revert with `NotFound`) | No |
| RedStone | Listed on Arc's oracle page; no Arc testnet push feed was found | Not verified |

**Chronicle reliability on testnet.** The explorer API returned 750 EURC/USD updates between 19 September and 18 October 2026:

- The median update interval is 52 minutes, and the 99.5th percentile is 57 minutes.
- There were two outages. One ran from 7 October 07:07 UTC to 8 October 17:11 UTC (about 34 hours). The other started on 18 October at 09:08 UTC, and all three feeds above were still stale when checked at 07:01 UTC on 19 October.

The adapter therefore uses `maxAge = 10,800 s` (3 hours, which tolerates two missed updates) and **fails closed**:

- **During an outage** new protection, asset exits, provider entries priced against inventory and market creation revert.
- **Backing exits** and matured settlement need no price, so they keep working. Settlement credits a fixed claim.

No reference market ever falls back to the scenario price.

### Price units

The pools need one number: **USDC base units (6 decimals) per one whole protected-asset unit**.

- **EURC**: Chronicle EURC/USD ÷ Chronicle USDC/USD. A USDC depeg therefore moves the floor in USDC terms rather than being assumed away.
- **cirBTC**: Chronicle CIRBTC/USDC, used directly.

The adapter normalizes from 18 decimals to 6, rejects zero values, future timestamps and stale values, and whitelists itself on Chronicle through the testnet SelfKisser in its constructor. The pool divides by `10^decimals` of the protected token (6 for EURC, 8 for cirBTC) instead of the template's hard-coded `1e18`.

## Grant program (Circle Developer Grants), verified 19 Oct 2026

- **Pages**: https://www.circle.com/grant ("Circle Developer Grants"). Applications go through the Questbook portal https://circle.questbook.app/. The relaunch was announced on 14 May 2026 on community.arc.io.
- **Funding**: "Tiered USDC funding tied to meaningful integrations and ecosystem impact." Payments are released as milestones are met and approved. No cap is published. Grantees can apply for more funding after the final milestones. Support also includes co-marketing, mentorship and ecosystem access.
- **Fit**: Arc must be "core to your flow of value, liquidity, or settlement". The building blocks named are USDC, Wallets, CCTP, Nanopayments and Gateway. Priority use cases: agentic economic activity, stablecoin FX, peer-to-peer payments, treasury management, prediction markets, and lending and borrowing. The portal's 2026 description names onchain lending, capital markets, FX, agentic commerce and payments, and says projects "may not perform regulated activities themselves".
- **Criteria**: platform alignment, exceptional teams, traction ("evidence of usage, pilots, partnerships, revenue or a credible path to get there") and ecosystem impact.
- **Process**: portal application, then initial review, then a finalist technical review with Circle Ventures, Product and BD plus "applicable screenings", then acceptance and milestone design, then disbursement.
- **Portal state**: "Circle 2026 Cohort 2" is **Open**: $135k available, 878 proposals, 14 accepted. Cohort 1 is closed (19 accepted, $190k paid out). Across the program: 897 proposals, 33 accepted, $285k paid out, which averages about $8.6k per accepted team. Competition is heavy.
- **Form**: the Cohort 2 form fields and their limits are copied into the [application draft](grants/CIRCLE_DEVELOPER_GRANT_2026-10-19.md). It requires a video of at most 5 minutes with a codebase walkthrough, a transcript, code screenshots per Circle product and an investor deck, all in one Google Drive folder. Nothing was entered or submitted.
- **Not this program**: the **Arc Builders Fund** is Circle Ventures' venture-investment program (announced December 2025). It is equity-style funding, not a grant.

## Scope chosen

| Decision | Choice | Reason |
|---|---|---|
| Backing | **Real Arc testnet USDC** (ERC-20 interface, 6 decimals) | It is Arc's settlement asset. No project-issued "demo dollar" exists in this repository |
| Protected assets | **EURC** (6 decimals) and **cirBTC** (8 decimals) | Both are Circle-issued and available from Circle's faucet. EURC gives an FX market against USDC; cirBTC gives a volatile market. The pool core generalizes to any decimals from 6 to 18 |
| Reference oracle | **Chronicle** through `ShieldChronicleOracle` (EURC/USD ÷ USDC/USD; CIRBTC/USDC), max age 3 hours | The only push feeds found live on Arc testnet. Outages are documented and fail closed |
| Scenario market | EURC priced by `ShieldScenarioOracle`, a public deterministic cycle of 1.10 → 1.20 → 1.00 USDC per EURC, changing every 120 s | Exercises both exits on demand. Labelled as synthetic everywhere and never used as a fallback |
| Mainnet oracle path | `ShieldChainlinkOracle` (Chainlink EURC/USD and USDC/USD on Arc mainnet) | Built and tested; not deployed on testnet |
| Featured markets | EURC reference, cirBTC reference, EURC scenario | Three markets, each seeded through the factory with 5 USDC |
| Creation seed | 5 USDC (the template's 500 demo units) | Real testnet USDC is rationed: 20 USDC per address every 2 hours. Three seeds plus gas fit one faucet claim |
| Removed from the template | Native-asset protection, the `awAVAX` wrapper, the demo dollar and its faucet, both demo ERC-4626 vaults, the backing vault and the funded exchange | Arc advises against wrappers. Real Circle assets come from Circle's faucet, so no invented assets or inventory are needed |
| Agent surface | Static `/agent.json` and `/llms.txt` describing markets, terms, oracle freshness rules and unsigned-transaction recipes | First step toward the funded MCP integration. It never signs or holds keys |

The pool's economic rules are **unchanged** from the template: fixed entry claim, 150% default reserve, 10/1/1% fees on realized gains only, holder exit delay, provider notice, provider freeze while any exposure is open, permissionless maturity settlement into a pull claim, 100 open positions and a 0.01 USDC minimum claim. The only changes are the unit and asset changes forced by Arc, listed in [FEATURE_PARITY.md](FEATURE_PARITY.md).

## Sources (all accessed 19 October 2026)

- Arc docs, network and RPCs: https://docs.arc.io/arc/references/connect-to-arc (the docs moved from `docs.arc.network`, which now 301-redirects)
- Arc contract addresses (USDC, EURC, USYC, cirBTC, CCTP, Gateway, Multicall3, ERC-8004): https://docs.arc.io/arc/references/contract-addresses
- Stablecoin native model (18 and 6 decimals, shared balance, no wrapper): https://docs.arc.io/arc/concepts/stablecoin-native-model
- EVM differences (native transfer rules, base fee, Osaka, timestamps): https://docs.arc.io/arc/references/evm-differences
- CCTP on Arc (domain 26, USDC and EURC): https://docs.arc.io/integrate/exchanges/cctp-bridging.md
- Oracles listed by Arc: https://docs.arc.io/arc/tools/oracles
- Chronicle testnet addresses: https://docs.chroniclelabs.org/Developers/testnet (section "Arc Testnet")
- Chainlink Arc mainnet feeds: https://dev.chain.link/changelog/data-feeds-expands-to-arc-mainnet and https://reference-data-directory.vercel.app/feeds-arc-mainnet.json; Chainlink network list: `src/features/data/chains.ts` in `smartcontractkit/documentation`
- Pyth EVM addresses: https://docs.pyth.network/price-feeds/core/contract-addresses/evm
- Stork EVM addresses: https://docs.stork.network/resources/contract-addresses/evm
- USYC contracts and oracle: https://developers.circle.com/tokenized/usyc/smart-contracts
- Circle faucet: https://faucet.circle.com
- Arc mainnet launch: https://www.theblock.co/news/ecosystems/2026-09-16-circle-launches-arc-mainnet-with-blackrock-and-visa-among-validators-mints-10-billion-arc-tokens-415250
- Circle Developer Grants: https://www.circle.com/grant, https://circle.questbook.app/, https://community.arc.io/home/blogs/circle-developer-grants-program-relaunches-2026-05-14, https://www.circle.com/blog/announcing-the-first-circle-grant-recipients-in-2026
- Arc Builders Fund (venture, not a grant): https://www.circle.com/blog/introducing-the-arc-builders-fund
- On-chain reads: `cast` against `https://rpc.testnet.arc.io` and `https://rpc.mainnet.arc.io`; Chronicle update history from `https://explorer.testnet.arc.io/api/v2/addresses/<oracle>/logs`
