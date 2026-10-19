// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IShieldOracle} from "./ShieldPool.sol";

/// @notice Minimal vendored subset of Pyth's PythStructs (pyth-sdk-solidity, Apache-2.0).
library PythStructs {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }
}

/// @notice Minimal vendored subset of Pyth's IPyth interface.
interface IPyth {
    function getPriceNoOlderThan(bytes32 id, uint256 age) external view returns (PythStructs.Price memory);
    function getPriceUnsafe(bytes32 id) external view returns (PythStructs.Price memory);
    function getUpdateFee(bytes[] calldata updateData) external view returns (uint256);
    function updatePriceFeeds(bytes[] calldata updateData) external payable;
}

/// @notice Read-only Pyth pull-oracle adapter: USDC base units (6 decimals) per one whole protected-asset unit.
/// Price = feed ÷ quote (for example EURC/USD ÷ USDC/USD), or the feed alone when `quoteId` is zero.
/// Callers push a fresh Hermes update with `updatePriceFeeds` in a separate transaction right before acting.
/// Rejects stale, never-set, non-positive, badly scaled and low-confidence values; there is no fallback price.
contract ShieldPythOracle is IShieldOracle {
    IPyth public immutable pyth;
    bytes32 public immutable feedId;
    /// @notice Zero when `feedId` already quotes in USDC.
    bytes32 public immutable quoteId;
    /// @notice Largest accepted distance between block time and a value's publish time, in seconds.
    uint256 public immutable maxAge;
    /// @notice Largest accepted confidence interval, in basis points of the price.
    uint256 public immutable maxConfidenceBps;

    /// @param pyth_ Pyth contract on this chain.
    /// @param feedId_ Pyth price-feed id of the protected asset (for example Crypto.EURC/USD).
    /// @param quoteId_ Pyth price-feed id of USDC/USD, or zero.
    /// @param maxAge_ Freshness limit in seconds (1 to 3,600; 120 on Arc testnet).
    /// @param maxConfidenceBps_ Confidence limit in basis points (1 to 1,000; 100 on Arc testnet).
    constructor(address pyth_, bytes32 feedId_, bytes32 quoteId_, uint256 maxAge_, uint256 maxConfidenceBps_) {
        require(pyth_ != address(0) && feedId_ != bytes32(0) && feedId_ != quoteId_, "FEED");
        require(maxAge_ > 0 && maxAge_ <= 1 hours, "MAX_AGE");
        require(maxConfidenceBps_ > 0 && maxConfidenceBps_ <= 1000, "CONFIDENCE_LIMIT");
        pyth = IPyth(pyth_);
        feedId = feedId_;
        quoteId = quoteId_;
        maxAge = maxAge_;
        maxConfidenceBps = maxConfidenceBps_;
    }

    /// @dev One feed value scaled to 18 decimals.
    function _read(bytes32 id) private view returns (uint256) {
        PythStructs.Price memory p;
        try pyth.getPriceNoOlderThan(id, maxAge) returns (PythStructs.Price memory fresh) {
            p = fresh;
        } catch {
            revert("INVALID_OR_STALE_PRICE");
        }
        require(p.price > 0 && p.expo <= 0 && p.expo >= -18 && p.publishTime > 0, "INVALID_PRICE");
        uint256 value = uint256(uint64(p.price));
        require(p.conf > 0 && uint256(p.conf) * 10000 <= value * maxConfidenceBps, "CONFIDENCE");
        return value * 10 ** uint256(int256(18 + p.expo));
    }

    /// @dev Stored publish time of a feed, without a freshness check; reverts "NO_PRICE" if never published.
    function _publishTime(bytes32 id) private view returns (uint256 publishTime) {
        try pyth.getPriceUnsafe(id) returns (PythStructs.Price memory p) {
            publishTime = p.publishTime;
        } catch {
            revert("NO_PRICE");
        }
        require(publishTime > 0, "NO_PRICE");
    }

    /// @notice Seconds since the older of the stored feed values was published (0 if published ahead of block
    /// time), for monitoring. Reads stored values without a freshness check.
    function age() external view returns (uint256) {
        uint256 oldest = _publishTime(feedId);
        if (quoteId != bytes32(0)) {
            uint256 quoted = _publishTime(quoteId);
            if (quoted < oldest) oldest = quoted;
        }
        return oldest >= block.timestamp ? 0 : block.timestamp - oldest;
    }

    /// @inheritdoc IShieldOracle
    function price() external view returns (uint256 result) {
        uint256 base = _read(feedId);
        result = quoteId == bytes32(0) ? base / 1e12 : Math.mulDiv(base, 1e6, _read(quoteId));
        require(result > 0, "ZERO_PRICE");
    }
}
