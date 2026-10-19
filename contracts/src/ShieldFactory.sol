// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ShieldPool, IShieldOracle} from "./ShieldPool.sol";

/// @notice Registry and creator of USDC-backed protection markets for approved Circle assets on Arc.
/// @dev Every approved asset/oracle pair is fixed at deployment; no arbitrary token can be listed. Each creation
/// atomically seeds the new market with CREATION_SEED of USDC credited to the creator as provider shares.
contract ShieldFactory is ReentrancyGuard {
    using SafeERC20 for IERC20;
    /// @notice Arc USDC ERC-20 interface (6 decimals); the only backing.
    IERC20 public immutable backing;
    /// @notice Protocol fee recipient; also the only account that may use the reserved slots.
    address public immutable protocol;
    /// @notice Circle EURC (6 decimals).
    address public immutable eurc;
    /// @notice Circle cirBTC (8 decimals).
    address public immutable cirbtc;
    /// @notice EURC priced in USDC by the reference adapter.
    address public immutable eurcOracle;
    /// @notice cirBTC priced in USDC by the reference adapter.
    address public immutable cirbtcOracle;
    /// @notice Deterministic synthetic EURC price for scenario markets; never a real price.
    address public immutable scenarioOracle;
    /// @notice USDC taken from the creator and credited back as provider shares (5 USDC).
    uint256 public constant CREATION_SEED = 5e6;
    uint256 public constant MAX_POOLS = 32;
    /// @notice Slots only the protocol account can fill, so featured markets (and their replacements
    /// after maturity) cannot be crowded out by community creations.
    uint256 public constant PROTOCOL_RESERVED_POOLS = 10;
    /// @notice Community creators are limited per address so the shared registry is costly to fill.
    uint256 public constant MAX_POOLS_PER_CREATOR = 2;
    address[] public pools;
    mapping(address => bool) public isPool;
    mapping(address => uint256) public poolsCreatedBy;
    uint256 public communityPools;
    event PoolCreated(
        address indexed pool, address indexed creator, address indexed asset, address oracle, uint256 seed
    );

    /// @param backing_ Arc USDC ERC-20 interface.
    /// @param protocol_ Protocol fee recipient and reserved-slot account.
    /// @param eurc_ EURC token.
    /// @param cirbtc_ cirBTC token.
    /// @param eurcOracle_ Reference EURC/USDC adapter.
    /// @param cirbtcOracle_ Reference cirBTC/USDC adapter.
    /// @param scenarioOracle_ Synthetic EURC scenario oracle.
    constructor(
        IERC20 backing_,
        address protocol_,
        address eurc_,
        address cirbtc_,
        address eurcOracle_,
        address cirbtcOracle_,
        address scenarioOracle_
    ) {
        require(block.chainid == 5042002 || block.chainid == 31337, "TESTNET_ONLY");
        require(protocol_ != address(0), "ZERO_PROTOCOL");
        require(IERC20Metadata(address(backing_)).decimals() == 6, "BACKING_DECIMALS");
        require(
            eurc_ != address(0) && cirbtc_ != address(0) && eurc_ != cirbtc_ && eurc_ != address(backing_)
                && cirbtc_ != address(backing_),
            "ASSETS"
        );
        require(
            eurcOracle_ != address(0) && cirbtcOracle_ != address(0) && scenarioOracle_ != address(0)
                && eurcOracle_ != scenarioOracle_,
            "ORACLES"
        );
        backing = backing_;
        protocol = protocol_;
        eurc = eurc_;
        cirbtc = cirbtc_;
        eurcOracle = eurcOracle_;
        cirbtcOracle = cirbtcOracle_;
        scenarioOracle = scenarioOracle_;
    }

    /// @notice Whether `asset` may be protected in a market priced by `oracle_`.
    function allowed(address asset, address oracle_) public view returns (bool) {
        return (asset == eurc && (oracle_ == eurcOracle || oracle_ == scenarioOracle))
            || (asset == cirbtc && oracle_ == cirbtcOracle);
    }

    /// @notice Every registered market, featured and community.
    function allPools() external view returns (address[] memory) {
        return pools;
    }

    /// @notice Create, seed and register a market; the caller becomes its creator and first provider.
    function createPool(address asset, address oracle_, ShieldPool.Terms calldata terms, uint256 deadline)
        external
        nonReentrant
        returns (address pool)
    {
        require(block.timestamp <= deadline, "DEADLINE");
        require(pools.length < MAX_POOLS, "REGISTRY_FULL");
        if (msg.sender != protocol) {
            require(communityPools < MAX_POOLS - PROTOCOL_RESERVED_POOLS, "COMMUNITY_SLOTS_FULL");
            require(poolsCreatedBy[msg.sender] < MAX_POOLS_PER_CREATOR, "CREATOR_LIMIT");
            communityPools++;
        }
        poolsCreatedBy[msg.sender]++;
        require(allowed(asset, oracle_), "UNAPPROVED_PAIR");
        require(IShieldOracle(oracle_).price() > 0, "INVALID_PRICE");
        ShieldPool market = new ShieldPool(address(backing), oracle_, msg.sender, protocol, asset, terms);
        pool = address(market);
        uint256 beforeBalance = backing.balanceOf(address(this));
        backing.safeTransferFrom(msg.sender, address(this), CREATION_SEED);
        require(backing.balanceOf(address(this)) - beforeBalance == CREATION_SEED, "EXACT_TRANSFER_ONLY");
        backing.forceApprove(pool, CREATION_SEED);
        market.seedCreator(CREATION_SEED);
        pools.push(pool);
        isPool[pool] = true;
        emit PoolCreated(pool, msg.sender, asset, oracle_, CREATION_SEED);
    }
}
