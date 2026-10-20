# End-to-end verification

Latest checks: [20 October 2026 release verification](E2E_REPORT_2026-10-20.md).

The report below records 19 October 2026 and separates what ran on which network.

**Arc testnet status:** the contracts are deployed and verified, and a scripted test wallet has completed a journey. No real wallet extension has signed yet.

## Arc testnet (chain 5042002)

Explorer: https://explorer.testnet.arc.io. Deployment `arc-testnet-2026-10-19T13-33-11Z-5929f2`, from source commit `d48ec26`, with the Chronicle reference oracle.

**Deployment.** The dedicated test signer `0x10D42586A65a98BCa4baFAa1bF5DCB10c820f50a` sent 8 transactions, in blocks 68018171–68018197:

| Step | Transaction | Gas used |
|---|---|---:|
| Scenario oracle | [`0xd1d8…87bd`](https://explorer.testnet.arc.io/tx/0xd1d879314ee616ff6ed4160dd7d542984b8734c1e5140ca6c49385693d3b87bd) | 140,881 |
| EURC adapter (Chronicle; whitelists itself via the SelfKisser) | [`0x8dee…82c1`](https://explorer.testnet.arc.io/tx/0x8dee425b412be82d55f8661d3f2942d719c4d77591d590d10201201636a382c1) | 686,623 |
| cirBTC adapter (Chronicle) | [`0xe99b…e101`](https://explorer.testnet.arc.io/tx/0xe99b199db622295cc90c3a1a118c57526f71fa374abff604b906246e7936e101) | 625,781 |
| Factory | [`0x0197…c4c7`](https://explorer.testnet.arc.io/tx/0x01979a717027d9b78598038f68a0c611a28f07830713ae2ef25bccbf7f3ff4c7) | 3,925,960 |
| Approve 15 USDC to the factory | [`0xf85e…07a2`](https://explorer.testnet.arc.io/tx/0xf85e6a4cf7adbaf68333deafed5d2b0ddca4dcf9208547a6e54fc98daabd07a2) | 55,438 |
| Create and seed the EURC market | [`0xe241…f95e`](https://explorer.testnet.arc.io/tx/0xe241c23ce964720736683a13282561303d45443a8fb53b314e049d6375c7f95e) | 2,706,611 |
| Create and seed the cirBTC market | [`0x68d5…c986`](https://explorer.testnet.arc.io/tx/0x68d556750dd87e8883f1523488596a111a220cd248e72c453e6eae4d366cc986) | 2,663,678 |
| Create and seed the scenario market | [`0xd5f6…46de`](https://explorer.testnet.arc.io/tx/0xd5f6d72ac6f92a5adf4f1bb74bb0a0e8ad42fae306faaee1bf5b85394af746de) | 2,650,047 |

**Verification.** `npm run verify:arc-testnet` passed at 13:33:32 UTC. The manifest records its checks:

- runtime code of the 3 oracles, the factory and the 3 pools matches `contracts/out`, with immutables masked;
- USDC (6 decimals), EURC (6) and cirBTC (8) identities;
- factory backing, protocol, assets, oracles and creation seed;
- the reference adapters read the manifest's Chronicle feeds with the manifest's `maxPriceAge` (3 hours) and are whitelisted;
- the 3 featured markets are registered and USDC-backed, with the correct asset, oracle, unit and terms and open epochs, and were seeded by their creation receipts;
- all 8 deployment receipts succeeded.

Prices at verification: 1.122456 USDC per EURC, and 82,442.06 USDC per cirBTC.

**Journey from a second wallet.** The test wallet `0x424cb86EEd3Bf1101C0f2b6f74Db2C291284456d` ran `npm run journey:arc-testnet -- --broadcast` on the EURC market `0x583E…626C` ([evidence](evidence/arc-testnet-journey.json)). All 8 transactions confirmed, each with a 30% gas margin:

| Step | Transaction |
|---|---|
| Approve 2 USDC | [`0x3499…6258`](https://explorer.testnet.arc.io/tx/0x3499b92d45d2b6b150f4d282ab12b9da29d71588e6992c33ea5f2f8d84cb6258) |
| Provide 2 USDC | [`0xc3ea…56b9`](https://explorer.testnet.arc.io/tx/0xc3ea614d750f9057188f7750232c0a13742e0685cb58f776a81516f8cd9556b9) |
| Approve 2 EURC | [`0x3807…9da4`](https://explorer.testnet.arc.io/tx/0x3807cb2453216852c8e2bc913ee0723042512d815d442d4e5eb56894adcd9da4) |
| Protect 2 EURC: position #1, 2.244912 USDC entry claim | [`0xe19c…b89e`](https://explorer.testnet.arc.io/tx/0xe19c61c2a48ca837903c4a5c32f600ad2967c8c91f0289cfa68b7db476abb89e) |
| Partial asset exit (1 EURC) | [`0x4f0d…99de`](https://explorer.testnet.arc.io/tx/0x4f0d6f0aa652601dd71fe24de30398bc13508f7269d0287203e7c53fbf8999de) |
| Backing exit of the remaining 1 EURC | [`0xcacf…363f`](https://explorer.testnet.arc.io/tx/0xcacf9c5429beb68be6d0d5aa2bb89e84d91f696252d9929fa012befc80df363f) |
| Provider withdrawal notice | [`0x9dce…d2f3`](https://explorer.testnet.arc.io/tx/0x9dce19e2302634aacfce05d3c4ed5799b663c944ac2d35783f702138398fd2f3) |
| Provider redemption (USDC plus surrendered EURC basket) | [`0x5c58…95d8`](https://explorer.testnet.arc.io/tx/0x5c5874c391b31cbd606fc65509f657105d7cc6657e774fdcc2d73705b68695d8) |

Balances moved as follows:

| Wallet | Before | After |
|---|---|---|
| Journey wallet | 20 USDC, 20 EURC | 20.779056 USDC, 19.285714 EURC |
| Deployer | 20 USDC | 4.663624 USDC, after 15 USDC of market seeds and gas |

Afterwards, the EURC market holds 4.198246 USDC and 0.714286 surrendered EURC, with no open protection.

**Oracle outage.**
- **The outage:** Chronicle's Arc testnet feeds were stale from 18 October 09:08 UTC until 13:20–13:25 UTC on 19 October, about 28 hours.
- **What the preflights did:** the morning preflight refused to start because of it ([evidence](evidence/arc-testnet-preflight.json)). The deployment was broadcast only after the feeds resumed, with ages of 484–734 seconds.
- **Expected behaviour in later outages:** the markets fail closed. New protection, asset exits and market creation revert; backing exits and settlement keep working.

**Pyth.** The Pyth path is implemented and tested, but unused. Hermes needs an API key, and Arc testnet's Pyth contract was left out of Pyth's August upgrade. The afternoon Pyth preflight therefore stopped before signing anything (same evidence file).

## Local and rehearsal runs (not Arc testnet activity)

| Run | Network | Result | Evidence |
|---|---|---|---|
| Chronicle adapter on a fork | Local Anvil fork of Arc testnet; adapters deployed on the fork only | Each adapter whitelisted itself through the real SelfKisser and read the real feeds. With the 3-hour limit, both correctly reverted while the feeds were stale | [chronicle-fork-check.json](evidence/chronicle-fork-check.json) |
| Deploy + verify rehearsal (Pyth) | Local Anvil with chain ID 5042002 and a 20 gwei base fee; MockPyth at the real Pyth address | 10 steps (2 price updates), verified; a rerun sent nothing; an 11-transaction second-wallet journey | [arc-rehearsal.json](evidence/arc-rehearsal.json) |
| Native lifecycle (Pyth) | Local Anvil, chain 31337 | 52 transactions, covering both exits, transfer, fees, a stale-price block and maturity settlement | [local-journey.json](evidence/local-journey.json) |
| Browser lifecycle (Pyth) | Local Anvil, chain 31337 | 9 browser-signed transactions, including two Pyth updates each immediately before its action; a rejected update sent no protection | [browser-receipts.json](evidence/e2e/browser-receipts.json) |

**Browser tests (12).**
- **Public routes (9):**
  - every route renders at 390 px;
  - writes are gated;
  - missing-wallet feedback is shown;
  - account and network changes reset the session;
  - the app renders when browser storage is denied;
  - a funding detour keeps the market, amount and role;
  - unknown pools are rejected;
  - the scenario market is labelled synthetic;
  - the agent files are served, and the price proxy leaks nothing;
  - the status and asset pages name Arc testnet.
- **Local chain (3):** the signed journey, a rejected price update, and the in-flight quote race.

## Still to do

1. Run at least one real MetaMask transaction on https://arc.yieldshield.ai.
2. Replace the featured markets before **18 November 2026, 13:33 UTC**. The deployer now holds 4.66 USDC, which is less than the 15 USDC of seeds plus gas a replacement round needs, so it must be topped up from the faucet first.

Scripted wallets and our own transactions are not users or traction. This is functional verification, not a security audit.
