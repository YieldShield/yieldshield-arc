# YieldShield Arc: narration script for founder review

Revised 20 October 2026 around the deployed app. This replaces the earlier 4:56 video.

- **Duration:** 4:31 (270.666667 seconds), below the five-minute limit; H.264, 1920×1080, 30 fps, AAC audio.
- **Format:** an edited sequence of real browser screenshots from the deployed app and Arc explorer, with narration. This is not continuous screen recording. UI screenshots were captured on 20 October 2026; displayed prices, balances and freshness are dated observations.
- **Scope:** 2:47 of deployed UI and public receipts, 1:10 of essential USDC/EURC/cirBTC implementation, and 34 seconds of planned grant milestones. The grant requires both an integration demonstration and a codebase walkthrough.
- **Wallet:** disconnected throughout the UI capture. No wallet signature, quote confirmation or newly executed transaction is shown. The explorer receipts are project-run scripted tests, not external adoption.
- **Status:** Arc testnet only; unaudited; test tokens have no monetary value. Code was written with substantial AI assistance and founder review.
- **Voice:** synthetic narration generated in the signed-in ElevenLabs browser using Chris, model `eleven_multilingual_v2`, speed 1.1, stability 0.5, similarity 0.75, style 0 and speaker boost. No subscription, voice clone or account-permission change was needed.

## Production notes

The text below is the exact 596-word narration. ElevenLabs Scribe transcription checked the spoken content and supplied word timing; the transcript preserves the intended spelling of code symbols and cirBTC. Visual cuts anticipate the corresponding words by approximately 0.2 seconds. Audio is 267.258750 seconds with a 0.4-second lead and three-second silent tail, rounded to the 30 fps frame grid.

## 1. Start with the deployed app (0:00–0:32)

> This is YieldShield Arc, running at arc dot yieldshield dot ai. These are real browser captures from October twentieth. The app protects EURC or cirBTC against a fixed USDC claim, funded by capital providers. All tokens are testnet only and have no monetary value. On Markets, the reference markets show Chronicle prices, freshness and available claims. The scenario lab is clearly labelled synthetic. Let us open the EURC market and inspect its terms.

Visual cues:

- 0:00: `01-home.png`
- 0:19: `02-markets.png`
- 0:29: `03-eurc-details.png`

## 2. Choose an asset and amount (0:32–0:59)

> The market details show one hundred and fifty percent collateral, fees only on realized gains, the exit delay and maturity. On Protect, I enter one EURC. The form keeps the asset, backing, price source and fees together. Switching to cirBTC updates the market and denomination. This browser is not connected to a wallet. Reviewing and submitting a transaction requires the person's wallet; no signature is being shown here.

Visual cues:

- 0:32: `03-eurc-details.png`
- 0:40: `04-protect-empty.png`
- 0:40: `05-protect-one-eurc.png`
- 0:47: `06-protect-cirbtc.png`

## 3. Provide the backing (0:59–1:24)

> Now the other side: Provide. I choose the EURC reference market and enter two USDC. The page explains that USDC also pays Arc's network fees, so a small gas reserve must remain. Providers carry the downside. Deposits and withdrawals pause while protection is open, and redemption can include surrendered assets. The fee split is visible before a wallet is connected.

Visual cues:

- 0:59: `07-provide-two-usdc.png`

## 4. Get test assets and manage positions (1:24–1:50)

> Get test USDC opens guidance for Circle's public faucet. It explains which token does what, and the user makes their own faucet request. Returning preserves the selected market and two USDC amount. Portfolio is where holders and providers manage positions, balances and activity. Here it honestly asks for a connection instead of displaying invented balances or a completed transaction.

Visual cues:

- 1:24: `08-faucet.png`
- 1:34: `09-return-preserved.png`
- 1:38: `10-positions.png`

## 5. Inspect integrations and live reads (1:50–2:24)

> Agents have a dedicated page with a public manifest, contract interfaces and unsigned transaction recipes. The rules prohibit signing or holding keys and require simulation from the user's address. Network status exposes deployment addresses, the chain and live oracle freshness. After Refresh network reads, all three markets report successful reads. These deployment checks are distinct from an audit. The current contracts are unaudited and were built with substantial AI assistance and founder review.

Visual cues:

- 1:50: `11-agents.png`
- 2:03: `12-status.png`
- 2:09: `13-status-markets.png`

## 6. Inspect real on-chain evidence (2:24–2:47)

> The linked Arc explorer contains the market's actual transactions. Our scripted test wallet has exercised providing, protection, both holder exit choices and provider redemption. These receipts are project-run tests, not external adoption or a recording of wallet-extension signing. The application links the reproducible evidence.

Visual cues:

- 2:24: `14-explorer-transactions.png`

## 7. Codebase walkthrough: USDC (2:47–3:11)

> Here is the essential implementation. In ShieldPool dot sol, protect fixes the USDC claim at entry and reserves one hundred and fifty percent backing. Backing enters through Arc's six-decimal USDC token interface. The backing exit pays the recorded claim without reading an oracle, so that exit still works when prices are stale.

Visual cues:

- 2:47: `usdc-02-protect-reserves-usdc.png`
- 3:04: `usdc-03-exit-backing.png`

## 8. Codebase walkthrough: EURC (3:11–3:33)

> EURC uses ShieldChronicleOracle. It divides the EURC dollar feed by the USDC dollar feed to price the asset in backing units. Zero, future-dated or stale values revert; a reference market never falls back to the synthetic scenario. The factory restricts which asset and oracle pairs can create markets.

Visual cues:

- 3:11: `eurc-02-chronicle-price.png`
- 3:29: `eurc-01-factory-allowed-pairs.png`

## 9. Codebase walkthrough: cirBTC (3:33–3:57)

> For cirBTC, assetUnit preserves its eight-decimal denomination. Its adapter reads Chronicle's cirBTC to USDC feed directly. The decimal tests cover the smallest claim in satoshis and fuzz conservation across six, eight and eighteen decimals. These are the contracts behind the real market selection shown earlier, with USDC as backing and gas.

Visual cues:

- 3:33: `cirbtc-01-asset-unit.png`
- 3:43: `cirbtc-04-fuzz-conservation.png`

## 10. Grant milestones (3:57–4:31)

> The grant adds App Kit routes from Arc to Ethereum Sepolia and Base Sepolia. USDC uses deposit for burn; EURC uses Cross Chain Token Service. Acceptance requires all four transfers with recovery evidence. Next are unsigned MCP tools, an agent identity and a pilot targeting ten testers and thirty journeys. We request sixteen thousand dollars, with five thousand conditional on an independent audit and legal review. Thank you.

Visual cues:

- 3:57: `card-bridge-corrected.png`
- 4:14: `card-roadmap-corrected.png`
- 4:27: `card-closing.png`
