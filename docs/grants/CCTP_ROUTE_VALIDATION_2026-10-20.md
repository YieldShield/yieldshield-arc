# Arc grant: CCTP route validation

Checked 20 October 2026. This is read-only integration research, not a completed bridge integration or evidence of a successful crosschain transfer.

## Proposed milestone routes

| Token leaving Arc Testnet | Source chain / CCTP domain | Destination chain / domain | Status checked today |
| --- | --- | --- | --- |
| USDC | 5042002 / 26 | Ethereum Sepolia 11155111 / 0 | Supported by Circle's CCTP and App Kit documentation |
| USDC | 5042002 / 26 | Base Sepolia 84532 / 6 | Supported by Circle's CCTP and App Kit documentation |
| EURC | 5042002 / 26 | Ethereum Sepolia 11155111 / 0 | Live sandbox token deployments enabled; bilateral domain trust confirmed |
| EURC | 5042002 / 26 | Base Sepolia 84532 / 6 | Live sandbox token deployments enabled; bilateral domain trust confirmed |

Circle's [CCTP chain table](https://developers.circle.com/cctp/concepts/supported-chains-and-domains) lists Arc, Ethereum and Base, includes their official testnets, and assigns domains 26, 0 and 6. Arc uses standard finality; fast transfer is unnecessary on this source chain. Domain numbers are not EVM chain IDs.

The [App Kit Bridge overview](https://docs.arc.io/app-kit/bridge) supports both USDC and EURC. Its [token and chain reference](https://docs.arc.io/app-kit/references/supported-blockchains) includes Arc, Ethereum and Base and explicitly includes EURC among bridge tokens.

## Correct integration architecture

The two tokens share Iris attestations and destination `MessageTransmitterV2`, but have different source contracts and approvals:

| Token | Approve | Source operation |
| --- | --- | --- |
| USDC | `TokenMessengerV2` | `depositForBurn` |
| EURC | EURC's resolved `TokenManager` | `CrossChainTokenService.crossChainTransfer` |

EURC must not be described as another `depositForBurn` call. Circle documents the separate approval targets and fee models in [CCTP for non-USDC compared to CCTP](https://developers.circle.com/cctp/expanded-assets/concepts/cctp-differences). The implementation should use App Kit Bridge with an explicitly selected token and retain the protocol-specific unsigned recipes for agents. Pool contracts remain single-chain; bridging is a separate user-reviewed operation after an exit or claim.

Use [Circle's EURC quickstart](https://developers.circle.com/cctp/expanded-assets/quickstarts/transfer-eurc-ethereum-to-arc) for token discovery, fee quotes, the per-token approval and `crossChainTransfer`. Resolve deployment addresses, check quote validity and preserve enough Arc USDC for gas and non-USDC transfer fees. Its example travels in the opposite direction; it is not itself proof that YieldShield has executed an outbound transfer.

## Live EURC evidence

The exact [sandbox Iris token query](https://iris-api-sandbox.circle.com/v2/cctpx/tokens?tokenid=0x2587821a0ee7daa174b95436b5dab1731cfa1844775b010217d3c0dd02a4eecd) returned one EURC entry with six decimals and enabled deployments on domains 0, 1, 6, 14 and 26.

Sandbox EURC token ID:

`0x2587821a0ee7daa174b95436b5dab1731cfa1844775b010217d3c0dd02a4eecd`

| Domain | Resolved EURC address |
| --- | --- |
| Arc Testnet / 26 | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` |
| Ethereum Sepolia / 0 | `0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4` |
| Base Sepolia / 6 | `0x808456652fdb597867f38412077A9182bf77359F` |

The Arc address matches `config/deployment.json`. No replacement token or wrapper is proposed.

Onchain reads against Circle's [documented testnet service](https://developers.circle.com/cctp/expanded-assets/references/contract-addresses), `0x63753E722bd2C2A5DF6EE19C5106662208B81077`, confirmed:

- Arc, block **68138791**: `isTrustedDomain(0)` and `isTrustedDomain(6)` both `true`.
- Ethereum Sepolia, block **11953535**: `isTrustedDomain(26)` is `true`.
- Base Sepolia, block **48354879**: `isTrustedDomain(26)` is `true`.
- `resolveTokenAddress(tokenId)` matched the three addresses above.
- `resolveTokenManager(tokenId)` returned `0xE5D6eacf2eD5A7F81cC89d2a216F004092c0C2E0` on all three chains.

Public RPCs used: `https://rpc.testnet.arc.io`, `https://11155111.rpc.thirdweb.com`, and `https://sepolia.base.org`. No signature, approval transaction, burn or mint was sent.

[Circle's non-USDC route reference](https://developers.circle.com/cctp/expanded-assets/concepts/supported-chains-and-domains) requires trust in both directions. Token registration and trust establish route configuration, not guaranteed runtime success: implementation must also check pauses, amount/rate limits, a current fee quote, balances and destination completion.

## Replacement milestone wording

**Title:** CCTP exits: USDC and EURC from Arc to Ethereum Sepolia and Base Sepolia

**Scope:** After an exit or claim, let users bridge USDC or EURC from Arc Testnet (domain 26) to Ethereum Sepolia (0) or Base Sepolia (6), in a separate reviewed transaction using App Kit Bridge. USDC uses TokenMessengerV2; EURC uses CrossChainTokenService with per-token TokenManager approval. Include fee estimates, route and token checks, attestation tracking, retry recovery, and unsigned agent recipes. Pools remain single-chain.

**Acceptance:** Publish code and tests plus four completed testnet transfers: USDC and EURC from Arc to each destination. Each record includes source receipt, token/domain identifiers, attestation, destination receipt and recipient balance change. Demonstrate recovery after an interrupted session without a second burn, and refusal of an unavailable route. Target: three weeks after acceptance; 35 hours / $3,500.

Recheck support before implementation and every transfer. If Circle disables a route, show it as unavailable and seek an agreed substitute route or milestone change; do not silently swap tokens, claim unexecuted transfers, or mark the original acceptance complete. This condition covers future service changes, not a current unsupported-EURC claim.
