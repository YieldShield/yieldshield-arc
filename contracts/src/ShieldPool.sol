// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @notice Price source for one market: backing base units (6 decimals) per one whole protected-asset unit.
interface IShieldOracle {
    function price() external view returns (uint256);
}

/// @notice Bounded testnet split-risk market on Arc.
/// @dev Backing is the 6-decimal ERC-20 interface of Arc's native USDC; every backing movement goes through that
/// interface and internal counters, never `msg.value` or `address(this).balance`. The protected asset is an ERC-20
/// with 6 to 18 decimals (EURC: 6, cirBTC: 8). The economic rules are those of the YieldShield Alpine template;
/// only the asset unit (`assetUnit` instead of a fixed 1e18) and the removed native-asset path differ.
contract ShieldPool is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.UintSet;

    struct Terms {
        uint16 collateralBps;
        uint16 juniorFeeBps;
        uint16 creatorFeeBps;
        uint32 epochSeconds;
        uint32 exitDelay;
        uint32 juniorNotice;
    }

    struct Position {
        address owner;
        uint256 amount;
        uint256 floor;
        uint256 openedAt;
    }

    /// @notice Arc testnet chain ID; 31337 is the local development chain.
    uint256 public constant ARC_TESTNET_CHAIN_ID = 5042002;
    IERC20 public immutable backing;
    address public immutable protectedToken;
    /// @notice 10 ** decimals of the protected token: the amount the oracle prices.
    uint256 public immutable assetUnit;
    IShieldOracle public immutable oracle;
    address public immutable creator;
    address public immutable protocol;
    address private immutable initializer;
    Terms public terms;
    uint256 public immutable maturity;
    uint256 public constant PROTOCOL_FEE_BPS = 100;
    /// @notice Bound on concurrently open positions; closed positions free their slot.
    uint256 public constant MAX_POSITIONS = 100;
    /// @notice Smallest entry floor (0.01 backing unit), so open slots cannot be filled with dust.
    uint256 public constant MIN_FLOOR = 10_000;
    /// @notice Largest single protection, in whole protected-asset units.
    uint256 public constant MAX_PROTECT_UNITS = 100_000;
    uint256 private constant RAY = 1e27;
    uint256 public totalBacking;
    uint256 public reservedBacking;
    uint256 public protectedBalance;
    uint256 public juniorInventory;
    uint256 public rewardInventory;
    uint256 public otherFeeInventory;
    uint256 public rewardPerShare;
    uint256 public totalShares;
    uint256 public totalClaimableBacking;
    uint256 public nextPositionId = 1;
    mapping(uint256 => Position) public positions;
    EnumerableSet.UintSet private openIds;
    mapping(address => uint256) public shares;
    mapping(address => uint256) public withdrawalReadyAt;
    mapping(address => uint256) public claimableBacking;
    mapping(address => uint256) public claimableFees;
    mapping(address => uint256) private rewardPerSharePaid;
    mapping(address => uint256) private pendingRewards;
    event PositionTransferred(uint256 indexed id, address indexed from, address indexed to);
    event Protected(uint256 indexed id, address indexed owner, uint256 amount, uint256 floor);
    event Exited(uint256 indexed id, address indexed owner, bool backingExit, uint256 amount, uint256 received);
    event GainFeesCharged(uint256 indexed id, uint256 providerReward, uint256 creatorFee, uint256 protocolFee);
    event Expired(uint256 indexed id, address indexed owner, uint256 backingCredited);
    event BackingClaimed(address indexed owner, uint256 amount);
    event JuniorDeposited(address indexed owner, uint256 backingAmount, uint256 sharesMinted);
    event JuniorWithdrawalRequested(address indexed owner, uint256 readyAt);
    event JuniorWithdrawalCancelled(address indexed owner);
    event JuniorWithdrawn(address indexed owner, uint256 sharesBurned, uint256 backingAmount, uint256 assetAmount);
    event RewardsClaimed(address indexed owner, address indexed recipient, uint256 amount);
    event FeesClaimed(address indexed owner, address indexed recipient, uint256 amount);
    error InvalidAmount();
    error InsufficientBacking();
    error Slippage();
    error NotReady();
    error NotOwner();
    error ActiveExposure();
    error EpochClosed();
    error PositionLimit();

    /// @param backing_ Arc USDC ERC-20 interface (6 decimals), or a 6-decimal stand-in on the local chain.
    /// @param oracle_ Price in backing base units per whole protected-asset unit.
    /// @param creator_ Receives the creator gain fee by pull claim.
    /// @param protocol_ Receives the protocol gain fee by pull claim.
    /// @param protectedToken_ ERC-20 with 6 to 18 decimals; native value is not accepted on Arc.
    /// @param terms_ Immutable bounded terms.
    constructor(
        address backing_,
        address oracle_,
        address creator_,
        address protocol_,
        address protectedToken_,
        Terms memory terms_
    ) {
        require(block.chainid == ARC_TESTNET_CHAIN_ID || block.chainid == 31337, "TESTNET_ONLY");
        require(creator_ != address(0) && protocol_ != address(0), "ZERO_RECIPIENT");
        require(protectedToken_ != address(0) && protectedToken_ != backing_, "ASSET_REQUIRED");
        require(IERC20Metadata(backing_).decimals() == 6, "BACKING_DECIMALS");
        uint8 assetDecimals = IERC20Metadata(protectedToken_).decimals();
        require(assetDecimals >= 6 && assetDecimals <= 18, "ASSET_DECIMALS");
        require(terms_.collateralBps >= 12500 && terms_.collateralBps <= 30000, "COLLATERAL_LIMIT");
        require(
            terms_.juniorFeeBps <= 2000 && terms_.creatorFeeBps <= 500
                && uint256(terms_.juniorFeeBps) + terms_.creatorFeeBps + PROTOCOL_FEE_BPS <= 2500,
            "FEE_LIMIT"
        );
        require(terms_.epochSeconds >= 1 days && terms_.epochSeconds <= 30 days, "EPOCH_LIMIT");
        require(
            terms_.exitDelay >= 60 && terms_.exitDelay <= 1 hours && terms_.juniorNotice >= 120
                && terms_.juniorNotice <= 1 days,
            "DELAY_LIMIT"
        );
        backing = IERC20(backing_);
        oracle = IShieldOracle(oracle_);
        creator = creator_;
        protocol = protocol_;
        protectedToken = protectedToken_;
        assetUnit = 10 ** uint256(assetDecimals);
        terms = terms_;
        maturity = block.timestamp + terms_.epochSeconds;
        initializer = msg.sender;
    }

    /// @notice Backing that must stay in the pool to admit `reserved` entry claims.
    function requiredBacking(uint256 reserved) public view returns (uint256) {
        return Math.mulDiv(reserved, terms.collateralBps, 10000, Math.Rounding.Ceil);
    }

    /// @notice Ids of every open position (at most MAX_POSITIONS), for settlement and ownership discovery.
    function openPositionIds() external view returns (uint256[] memory) {
        return openIds.values();
    }

    /// @notice Entry claims, in backing units, that can still be admitted.
    function capacity() external view returns (uint256) {
        uint256 maximum = totalBacking * 10000 / terms.collateralBps;
        return maximum > reservedBacking ? maximum - reservedBacking : 0;
    }

    /// @notice Provider NAV in backing units: backing plus surrendered assets at the oracle price.
    function juniorValue() public view returns (uint256) {
        return totalBacking + (juniorInventory == 0 ? 0 : Math.mulDiv(juniorInventory, oracle.price(), assetUnit));
    }

    /// @notice Gain fees earned by a provider and not yet claimed, in protected-asset units.
    /// @dev Accrues against a per-owner index snapshot. A rounded debt would credit up to one extra unit
    /// per share change, letting total earnings exceed the reward inventory.
    function earned(address owner) public view returns (uint256) {
        return pendingRewards[owner] + Math.mulDiv(shares[owner], rewardPerShare - rewardPerSharePaid[owner], RAY);
    }

    function _checkpoint(address owner) private {
        pendingRewards[owner] = earned(owner);
        rewardPerSharePaid[owner] = rewardPerShare;
    }

    /// @notice Provide backing for provider shares; only while no protection is open.
    function depositJunior(uint256 amount, uint256 minShares) external nonReentrant returns (uint256) {
        return _depositJunior(msg.sender, amount, minShares);
    }

    /// @notice `depositJunior` with a deadline.
    function depositJuniorBounded(uint256 amount, uint256 minShares, uint256 deadline)
        external
        nonReentrant
        returns (uint256)
    {
        require(block.timestamp <= deadline, "DEADLINE");
        return _depositJunior(msg.sender, amount, minShares);
    }

    /// @notice The creating factory atomically credits its creation seed to the creator, not to itself.
    function seedCreator(uint256 amount) external nonReentrant returns (uint256) {
        require(msg.sender == initializer && totalShares == 0 && nextPositionId == 1, "INITIAL_SEED_ONLY");
        return _depositJunior(creator, amount, 1);
    }

    function _depositJunior(address owner, uint256 amount, uint256 minShares) private returns (uint256 minted) {
        if (reservedBacking != 0) revert ActiveExposure();
        if (block.timestamp >= maturity) revert EpochClosed();
        if (amount == 0 || amount > 1_000_000e6) revert InvalidAmount();
        uint256 nav = juniorValue();
        minted = totalShares == 0 ? amount * 1e12 : (nav == 0 ? 0 : Math.mulDiv(amount, totalShares, nav));
        if (minted == 0 || minted < minShares) revert Slippage();
        _checkpoint(owner);
        uint256 beforeBalance = backing.balanceOf(address(this));
        backing.safeTransferFrom(msg.sender, address(this), amount);
        require(backing.balanceOf(address(this)) - beforeBalance == amount, "EXACT_TRANSFER_ONLY");
        totalBacking += amount;
        totalShares += minted;
        shares[owner] += minted;
        withdrawalReadyAt[owner] = 0;
        emit JuniorDeposited(owner, amount, minted);
    }

    /// @notice Start the provider withdrawal notice.
    function requestJuniorWithdrawal() external {
        if (shares[msg.sender] == 0) revert InvalidAmount();
        withdrawalReadyAt[msg.sender] = block.timestamp + terms.juniorNotice;
        emit JuniorWithdrawalRequested(msg.sender, withdrawalReadyAt[msg.sender]);
    }

    /// @notice Cancel a pending withdrawal notice.
    function cancelJuniorWithdrawal() external {
        if (withdrawalReadyAt[msg.sender] == 0) revert NotReady();
        withdrawalReadyAt[msg.sender] = 0;
        emit JuniorWithdrawalCancelled(msg.sender);
    }

    /// @notice Backing and surrendered-asset basket for burning `burn` shares.
    function previewJuniorWithdrawal(address owner, uint256 burn)
        public
        view
        returns (uint256 backingOut, uint256 assetOut)
    {
        if (burn == 0 || burn > shares[owner]) revert InvalidAmount();
        return (Math.mulDiv(totalBacking, burn, totalShares), Math.mulDiv(juniorInventory, burn, totalShares));
    }

    /// @notice Redeem provider shares after notice, while no protection is open.
    function withdrawJunior(uint256 burn, uint256 minBacking, uint256 minAsset) external nonReentrant {
        _withdrawJunior(burn, minBacking, minAsset);
    }

    /// @notice `withdrawJunior` with a deadline.
    function withdrawJuniorBounded(uint256 burn, uint256 minBacking, uint256 minAsset, uint256 deadline)
        external
        nonReentrant
    {
        require(block.timestamp <= deadline, "DEADLINE");
        _withdrawJunior(burn, minBacking, minAsset);
    }

    function _withdrawJunior(uint256 burn, uint256 minBacking, uint256 minAsset) private {
        if (reservedBacking != 0) revert ActiveExposure();
        uint256 ready = withdrawalReadyAt[msg.sender];
        if (ready == 0 || block.timestamp < ready) revert NotReady();
        (uint256 stableOut, uint256 assetOut) = previewJuniorWithdrawal(msg.sender, burn);
        if (stableOut < minBacking || assetOut < minAsset) revert Slippage();
        if (totalBacking - stableOut < requiredBacking(reservedBacking)) revert InsufficientBacking();
        _checkpoint(msg.sender);
        shares[msg.sender] -= burn;
        totalShares -= burn;
        totalBacking -= stableOut;
        juniorInventory -= assetOut;
        withdrawalReadyAt[msg.sender] = 0;
        backing.safeTransfer(msg.sender, stableOut);
        _sendAsset(msg.sender, assetOut);
        emit JuniorWithdrawn(msg.sender, burn, stableOut, assetOut);
    }

    /// @notice Pull earned provider gain fees to `recipient`.
    function claimRewards(address recipient) external nonReentrant {
        require(recipient != address(0), "ZERO_RECIPIENT");
        _checkpoint(msg.sender);
        uint256 amount = pendingRewards[msg.sender];
        if (amount == 0) revert InvalidAmount();
        pendingRewards[msg.sender] = 0;
        rewardInventory -= amount;
        _sendAsset(recipient, amount);
        emit RewardsClaimed(msg.sender, recipient, amount);
    }

    /// @notice Pull creator or protocol gain fees to `recipient`.
    function claimFees(address recipient) external nonReentrant {
        require(recipient != address(0), "ZERO_RECIPIENT");
        uint256 amount = claimableFees[msg.sender];
        if (amount == 0) revert InvalidAmount();
        claimableFees[msg.sender] = 0;
        otherFeeInventory -= amount;
        _sendAsset(recipient, amount);
        emit FeesClaimed(msg.sender, recipient, amount);
    }

    /// @notice Deposit `amount` of the protected token for a fixed entry claim valued now.
    /// @param minFloor Smallest acceptable entry claim in backing units.
    function protect(uint256 amount, uint256 minFloor, uint256 deadline) external nonReentrant returns (uint256) {
        uint256 beforeBalance = IERC20(protectedToken).balanceOf(address(this));
        IERC20(protectedToken).safeTransferFrom(msg.sender, address(this), amount);
        require(IERC20(protectedToken).balanceOf(address(this)) - beforeBalance == amount, "EXACT_TRANSFER_ONLY");
        return _protect(amount, minFloor, deadline);
    }

    function _protect(uint256 amount, uint256 minFloor, uint256 deadline) private returns (uint256 id) {
        if (block.timestamp + terms.exitDelay >= maturity) revert EpochClosed();
        if (openIds.length() >= MAX_POSITIONS) revert PositionLimit();
        if (amount == 0 || amount > MAX_PROTECT_UNITS * assetUnit) revert InvalidAmount();
        require(block.timestamp <= deadline, "DEADLINE");
        uint256 floor = Math.mulDiv(amount, oracle.price(), assetUnit);
        if (floor < MIN_FLOOR) revert InvalidAmount();
        if (floor < minFloor) revert Slippage();
        if (totalBacking < requiredBacking(reservedBacking + floor)) revert InsufficientBacking();
        id = nextPositionId++;
        openIds.add(id);
        positions[id] = Position(msg.sender, amount, floor, block.timestamp);
        reservedBacking += floor;
        protectedBalance += amount;
        emit Protected(id, msg.sender, amount, floor);
    }

    /// @notice Hand the whole remaining position, with its basis and maturity, to `recipient`.
    function transferPosition(uint256 id, address recipient) external {
        Position storage p = positions[id];
        if (p.owner != msg.sender) revert NotOwner();
        require(recipient != address(0) && recipient != msg.sender, "INVALID_RECIPIENT");
        if (block.timestamp >= maturity) revert EpochClosed();
        p.owner = recipient;
        emit PositionTransferred(id, msg.sender, recipient);
    }

    /// @notice Asset returned, gain fee charged and entry claim released by an asset exit of `amount`.
    function previewPartialExit(uint256 id, uint256 amount)
        public
        view
        returns (uint256 assetOut, uint256 fee, uint256 floorOut)
    {
        Position memory p = positions[id];
        if (p.owner == address(0)) revert NotOwner();
        if (amount == 0 || amount > p.amount) revert InvalidAmount();
        floorOut = amount == p.amount ? p.floor : Math.mulDiv(p.floor, amount, p.amount);
        uint256 spot = oracle.price();
        uint256 nowValue = Math.mulDiv(amount, spot, assetUnit);
        uint256 gain = nowValue > floorOut ? Math.mulDiv(nowValue - floorOut, assetUnit, spot) : 0;
        fee = Math.mulDiv(gain, terms.juniorFeeBps, 10000) + Math.mulDiv(gain, terms.creatorFeeBps, 10000)
            + Math.mulDiv(gain, PROTOCOL_FEE_BPS, 10000);
        assetOut = amount - fee;
    }

    /// @notice `previewPartialExit` for the whole position.
    function previewExit(uint256 id) external view returns (uint256 out, uint256 fee) {
        (out, fee,) = previewPartialExit(id, positions[id].amount);
    }

    /// @notice Keep the whole position's asset, paying fees on any realized gain.
    function exitAsset(uint256 id, uint256 minAsset) external nonReentrant {
        _exitAsset(id, positions[id].amount, minAsset);
    }

    /// @notice Keep `amount` of the asset, paying fees on that slice's realized gain.
    function partialExitAsset(uint256 id, uint256 amount, uint256 minAsset, uint256 deadline) external nonReentrant {
        require(block.timestamp <= deadline, "DEADLINE");
        _exitAsset(id, amount, minAsset);
    }

    function _exitAsset(uint256 id, uint256 amount, uint256 minAsset) private {
        if (block.timestamp >= maturity) revert EpochClosed();
        Position memory p = _position(id);
        (uint256 out,, uint256 floorOut) = previewPartialExit(id, amount);
        if (out < minAsset) revert Slippage();
        uint256 spot = oracle.price();
        uint256 value = Math.mulDiv(amount, spot, assetUnit);
        uint256 gain = value > floorOut ? Math.mulDiv(value - floorOut, assetUnit, spot) : 0;
        uint256 reward = Math.mulDiv(gain, terms.juniorFeeBps, 10000);
        uint256 creatorFee = Math.mulDiv(gain, terms.creatorFeeBps, 10000);
        uint256 protocolFee = Math.mulDiv(gain, PROTOCOL_FEE_BPS, 10000);
        _reduce(id, p, amount, floorOut);
        if (reward > 0) {
            rewardInventory += reward;
            rewardPerShare += Math.mulDiv(reward, RAY, totalShares);
        }
        claimableFees[creator] += creatorFee;
        claimableFees[protocol] += protocolFee;
        otherFeeInventory += creatorFee + protocolFee;
        _sendAsset(msg.sender, out);
        if (reward + creatorFee + protocolFee > 0) emit GainFeesCharged(id, reward, creatorFee, protocolFee);
        emit Exited(id, msg.sender, false, amount, out);
    }

    /// @notice Surrender the whole position's asset for its fixed entry claim in USDC. Needs no price.
    function exitBacking(uint256 id) external nonReentrant {
        _exitBacking(id, positions[id].amount, 0);
    }

    /// @notice Surrender `amount` of the asset for its proportional entry claim.
    function partialExitBacking(uint256 id, uint256 amount, uint256 minBacking, uint256 deadline)
        external
        nonReentrant
    {
        require(block.timestamp <= deadline, "DEADLINE");
        _exitBacking(id, amount, minBacking);
    }

    function _exitBacking(uint256 id, uint256 amount, uint256 minimum) private {
        Position memory p = _position(id);
        if (amount == 0 || amount > p.amount) revert InvalidAmount();
        uint256 floorOut = amount == p.amount ? p.floor : Math.mulDiv(p.floor, amount, p.amount);
        if (floorOut == 0) revert InvalidAmount();
        if (floorOut < minimum) revert Slippage();
        _reduce(id, p, amount, floorOut);
        totalBacking -= floorOut;
        juniorInventory += amount;
        backing.safeTransfer(msg.sender, floorOut);
        emit Exited(id, msg.sender, true, amount, floorOut);
    }

    /// @notice After maturity anyone may settle a position: its asset goes to providers and its owner gets a
    /// segregated backing credit to pull with `claimBacking`. Needs no price and pushes no USDC.
    function settleExpired(uint256 id) external nonReentrant {
        if (block.timestamp < maturity) revert NotReady();
        Position memory p = positions[id];
        if (p.owner == address(0)) revert NotOwner();
        _reduce(id, p, p.amount, p.floor);
        totalBacking -= p.floor;
        juniorInventory += p.amount;
        claimableBacking[p.owner] += p.floor;
        totalClaimableBacking += p.floor;
        emit Expired(id, p.owner, p.floor);
    }

    /// @notice Pull a matured backing credit.
    function claimBacking() external nonReentrant {
        uint256 amount = claimableBacking[msg.sender];
        if (amount == 0) revert InvalidAmount();
        claimableBacking[msg.sender] = 0;
        totalClaimableBacking -= amount;
        backing.safeTransfer(msg.sender, amount);
        emit BackingClaimed(msg.sender, amount);
    }

    function _position(uint256 id) private view returns (Position memory p) {
        p = positions[id];
        if (p.owner != msg.sender) revert NotOwner();
        if (block.timestamp < p.openedAt + terms.exitDelay) revert NotReady();
    }

    function _reduce(uint256 id, Position memory p, uint256 amount, uint256 floorOut) private {
        if (amount == p.amount) {
            delete positions[id];
            openIds.remove(id);
        } else {
            positions[id].amount = p.amount - amount;
            positions[id].floor = p.floor - floorOut;
        }
        reservedBacking -= floorOut;
        protectedBalance -= amount;
    }

    function _sendAsset(address recipient, uint256 amount) private {
        if (amount == 0) return;
        IERC20(protectedToken).safeTransfer(recipient, amount);
    }
}
