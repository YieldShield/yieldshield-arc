// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IShieldOracle} from "./ShieldPool.sol";

// Every adapter returns USDC base units (6 decimals) per one whole protected-asset unit.
uint256 constant USDC_DECIMALS = 6;

/// @dev Scales an `decimals`-decimal fixed-point value to 6 decimals, rounding down.
function toUsdcUnits(uint256 value, uint8 decimals) pure returns (uint256) {
    return
        decimals >= USDC_DECIMALS ? value / 10 ** (decimals - USDC_DECIMALS) : value * 10 ** (USDC_DECIMALS - decimals);
}

/// @notice Public, deterministic synthetic EURC scenario: 1.10 → 1.20 → 1.00 USDC, changing every 120 seconds.
/// Never a real market price and never a fallback for a reference market.
contract ShieldScenarioOracle is IShieldOracle {
    uint256 public immutable start = block.timestamp;
    uint256 public constant STEP_SECONDS = 120;

    /// @inheritdoc IShieldOracle
    function price() external view returns (uint256) {
        uint256 step = ((block.timestamp - start) / STEP_SECONDS) % 3;
        return step == 0 ? 1_100_000 : step == 1 ? 1_200_000 : 1_000_000;
    }
}

/// @notice Chronicle oracle interface (Scribe). Reads are whitelisted ("tolled").
interface IChronicle {
    function decimals() external view returns (uint8);
    function tryReadWithAge() external view returns (bool ok, uint256 value, uint256 age);
}

/// @notice Chronicle's testnet SelfKisser: any caller may whitelist itself on an oracle it manages.
interface ISelfKisser {
    function selfKiss(address oracle) external;
}

/// @notice Read-only Chronicle adapter. Price = feed, or feed ÷ quote when a quote feed is set
/// (for example EURC/USD ÷ USDC/USD, so the result is in USDC rather than dollars).
/// Rejects unavailable, zero, future-dated and stale values; there is no fallback price.
contract ShieldChronicleOracle is IShieldOracle {
    IChronicle public immutable feed;
    /// @notice Zero when `feed` already quotes in USDC.
    IChronicle public immutable quote;
    uint256 public immutable maxAge;
    uint8 public immutable feedDecimals;
    uint8 public immutable quoteDecimals;

    /// @param feed_ Chronicle oracle for the protected asset.
    /// @param quote_ Chronicle oracle for USDC/USD, or zero when `feed_` quotes USDC directly.
    /// @param maxAge_ Largest accepted age of each value, in seconds (at most one day).
    /// @param selfKisser_ Testnet SelfKisser used to whitelist this adapter, or zero if whitelisted otherwise.
    constructor(address feed_, address quote_, uint256 maxAge_, address selfKisser_) {
        require(feed_ != address(0) && feed_ != quote_, "FEED");
        require(maxAge_ > 0 && maxAge_ <= 1 days, "MAX_AGE");
        feed = IChronicle(feed_);
        quote = IChronicle(quote_);
        maxAge = maxAge_;
        if (selfKisser_ != address(0)) {
            ISelfKisser(selfKisser_).selfKiss(feed_);
            if (quote_ != address(0)) ISelfKisser(selfKisser_).selfKiss(quote_);
        }
        feedDecimals = IChronicle(feed_).decimals();
        quoteDecimals = quote_ == address(0) ? 0 : IChronicle(quote_).decimals();
        require(feedDecimals <= 18 && quoteDecimals <= 18, "DECIMALS");
    }

    function _read(IChronicle source) private view returns (uint256 value) {
        (bool ok, uint256 v, uint256 updatedAt) = source.tryReadWithAge();
        require(
            ok && v > 0 && updatedAt > 0 && updatedAt <= block.timestamp && block.timestamp - updatedAt <= maxAge,
            "INVALID_OR_STALE_PRICE"
        );
        return v;
    }

    /// @notice Age in seconds of the older of the feed values, for monitoring; reverts like `price`.
    function age() external view returns (uint256 oldest) {
        (,, uint256 feedAt) = feed.tryReadWithAge();
        oldest = feedAt;
        if (address(quote) != address(0)) {
            (,, uint256 quoteAt) = quote.tryReadWithAge();
            if (quoteAt < oldest) oldest = quoteAt;
        }
        require(oldest > 0 && oldest <= block.timestamp, "INVALID_OR_STALE_PRICE");
        return block.timestamp - oldest;
    }

    /// @inheritdoc IShieldOracle
    function price() external view returns (uint256 result) {
        uint256 base = _read(feed);
        if (address(quote) == address(0)) {
            result = toUsdcUnits(base, feedDecimals);
        } else {
            uint256 q = _read(quote);
            // base / 10^fd ÷ (q / 10^qd), expressed in 6 decimals.
            result = Math.mulDiv(base, 10 ** (USDC_DECIMALS + quoteDecimals), q * 10 ** feedDecimals);
        }
        require(result > 0, "ZERO_PRICE");
    }
}

/// @notice Chainlink AggregatorV3 interface.
interface IAggregatorV3 {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
}

/// @notice Read-only Chainlink adapter for the Arc mainnet path (Chainlink feeds are on Arc mainnet, not testnet).
/// Price = feed, or feed ÷ quote (for example EURC/USD ÷ USDC/USD). No implicit fallback from a stale real feed.
contract ShieldChainlinkOracle is IShieldOracle {
    IAggregatorV3 public immutable feed;
    /// @notice Zero when `feed` already quotes in USDC.
    IAggregatorV3 public immutable quote;
    uint256 public immutable maxAge;
    uint8 public immutable feedDecimals;
    uint8 public immutable quoteDecimals;

    /// @param feed_ Chainlink feed for the protected asset.
    /// @param quote_ Chainlink USDC/USD feed, or zero.
    /// @param maxAge_ Largest accepted round age in seconds (at most one day plus an hour for 24 h heartbeats).
    constructor(address feed_, address quote_, uint256 maxAge_) {
        require(feed_ != address(0) && feed_ != quote_, "FEED");
        require(maxAge_ > 0 && maxAge_ <= 25 hours, "MAX_AGE");
        feed = IAggregatorV3(feed_);
        quote = IAggregatorV3(quote_);
        maxAge = maxAge_;
        feedDecimals = IAggregatorV3(feed_).decimals();
        quoteDecimals = quote_ == address(0) ? 0 : IAggregatorV3(quote_).decimals();
        require(feedDecimals <= 18 && quoteDecimals <= 18, "DECIMALS");
    }

    function _read(IAggregatorV3 source) private view returns (uint256) {
        (uint80 round, int256 answer,, uint256 updated, uint80 answered) = source.latestRoundData();
        require(
            answer > 0 && answered >= round && updated > 0 && updated <= block.timestamp
                && block.timestamp - updated <= maxAge,
            "INVALID_OR_STALE_PRICE"
        );
        return uint256(answer);
    }

    /// @inheritdoc IShieldOracle
    function price() external view returns (uint256 result) {
        uint256 base = _read(feed);
        if (address(quote) == address(0)) {
            result = toUsdcUnits(base, feedDecimals);
        } else {
            uint256 q = _read(quote);
            result = Math.mulDiv(base, 10 ** (USDC_DECIMALS + quoteDecimals), q * 10 ** feedDecimals);
        }
        require(result > 0, "ZERO_PRICE");
    }
}
