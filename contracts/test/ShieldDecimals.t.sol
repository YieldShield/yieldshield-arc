// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ShieldPool} from "../src/ShieldPool.sol";
import {Vm, MutableOracle, MockToken} from "./ShieldMocks.sol";

/// @notice Decimal edge cases: the same economics for 6-decimal EURC, 8-decimal cirBTC and an 18-decimal asset,
/// all against 6-decimal USDC backing.
contract ShieldDecimalsTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant HOLDER = address(0xA11CE);
    address constant PROVIDER = address(0xB0B);
    MockToken usdc;

    function setUp() public {
        vm.chainId(5042002);
        vm.warp(10000);
        usdc = new MockToken("USDC", "USDC", 6);
    }

    function _market(uint8 decimals, uint256 price, uint256 backing)
        private
        returns (ShieldPool pool, MockToken asset, MutableOracle oracle)
    {
        asset = new MockToken("ASSET", "AST", decimals);
        oracle = new MutableOracle();
        oracle.set(price);
        pool = new ShieldPool(
            address(usdc),
            address(oracle),
            address(0xC),
            address(0xD),
            address(asset),
            ShieldPool.Terms(15000, 1000, 100, 7 days, 60, 120)
        );
        usdc.mint(PROVIDER, backing);
        vm.startPrank(PROVIDER);
        usdc.approve(address(pool), backing);
        pool.depositJunior(backing, 1);
        vm.stopPrank();
        asset.mint(HOLDER, 1_000_000 * 10 ** uint256(decimals));
        vm.prank(HOLDER);
        asset.approve(address(pool), type(uint256).max);
    }

    function testCirbtcEightDecimalFloorAndGainFee() public {
        // 81,827.183708 USDC per cirBTC, the Chronicle CIRBTC/USDC value of 18 October 2026.
        (ShieldPool pool, MockToken cirbtc, MutableOracle oracle) = _market(8, 81827_183708, 1000e6);
        require(pool.assetUnit() == 1e8, "8-decimal unit");
        vm.prank(HOLDER);
        uint256 id = pool.protect(0.001e8, 1, block.timestamp);
        (, uint256 amount, uint256 floor,) = pool.positions(id);
        require(amount == 100000 && floor == 81_827183, "0.001 cirBTC = 81.827183 USDC claim");
        vm.warp(block.timestamp + 61);
        oracle.set(163654_367416);
        (uint256 out, uint256 fee) = pool.previewExit(id);
        require(fee == 6000 && out == 94000, "12% of the half that is gain");
        vm.prank(HOLDER);
        pool.exitAsset(id, out);
        require(cirbtc.balanceOf(address(pool)) == 6000 && pool.rewardInventory() == 5000, "fee custody");
    }

    function testCirbtcMinimumClaimInSatoshis() public {
        (ShieldPool pool,,) = _market(8, 81827_183708, 1000e6);
        // 12 sats are worth 0.009819 USDC, below the 0.01 USDC minimum claim; 13 sats are worth 0.010637.
        vm.prank(HOLDER);
        vm.expectRevert(ShieldPool.InvalidAmount.selector);
        pool.protect(12, 1, block.timestamp);
        vm.prank(HOLDER);
        uint256 id = pool.protect(13, 1, block.timestamp);
        (,, uint256 floor,) = pool.positions(id);
        require(floor == 10637, "13 sat claim");
    }

    function testEurcMinimumClaimInMicroUnits() public {
        (ShieldPool pool,,) = _market(6, 1_123482, 1000e6);
        vm.prank(HOLDER);
        vm.expectRevert(ShieldPool.InvalidAmount.selector);
        pool.protect(8900, 1, block.timestamp);
        vm.prank(HOLDER);
        pool.protect(8901, 1, block.timestamp);
    }

    function testMaximumProtectionIsInWholeUnits() public {
        (ShieldPool pool,,) = _market(6, 1, 1_000_000e6);
        uint256 limit = pool.MAX_PROTECT_UNITS() * pool.assetUnit();
        vm.prank(HOLDER);
        vm.expectRevert(ShieldPool.InvalidAmount.selector);
        pool.protect(limit + 1, 1, block.timestamp);
        vm.prank(HOLDER);
        pool.protect(limit, 1, block.timestamp);
    }

    function testEighteenDecimalAssetUsesTheSameRules() public {
        (ShieldPool pool, MockToken weth, MutableOracle oracle) = _market(18, 2417_470000, 10_000e6);
        vm.prank(HOLDER);
        uint256 id = pool.protect(1 ether, 1, block.timestamp);
        (,, uint256 floor,) = pool.positions(id);
        require(floor == 2417_470000, "18-decimal floor");
        vm.warp(block.timestamp + 61);
        oracle.set(1208_735000);
        vm.prank(HOLDER);
        pool.exitBacking(id);
        require(usdc.balanceOf(HOLDER) == 2417_470000 && pool.juniorInventory() == 1 ether, "backing exit");
        require(pool.juniorValue() == 10_000e6 - 2417_470000 + 1208_735000, "NAV at assetUnit");
        require(weth.balanceOf(address(pool)) == 1 ether, "custody");
    }

    struct Case {
        ShieldPool pool;
        MockToken asset;
        MutableOracle oracle;
        uint256 unit;
        uint256 entry;
        uint256 amount;
        uint256 slice;
        uint256 id;
        uint256 entryFloor;
    }

    function testFuzzConservationAcrossDecimals(uint8 pick, uint64 rawAmount, uint64 rawEntry, uint32 rawMove) public {
        uint8[3] memory choices = [6, 8, 18];
        Case memory c;
        uint8 decimals = choices[pick % 3];
        c.unit = 10 ** uint256(decimals);
        c.entry = 0.5e6 + uint256(rawEntry) % 100_000e6;
        (c.pool, c.asset, c.oracle) = _market(decimals, c.entry, 1_000_000e6);
        // Between the 0.01 USDC minimum claim (at least 4 units, so a remainder survives the partial exit)
        // and the smaller of 100,000 USDC of claim or MAX_PROTECT_UNITS.
        uint256 minimum = (10_000 * c.unit + c.entry - 1) / c.entry;
        if (minimum < 4) minimum = 4;
        uint256 maximum = 100_000e6 * c.unit / c.entry;
        if (maximum > c.pool.MAX_PROTECT_UNITS() * c.unit) maximum = c.pool.MAX_PROTECT_UNITS() * c.unit;
        c.amount = minimum + uint256(rawAmount) % (maximum - minimum);
        c.slice = c.amount / 2 + 1;
        vm.prank(HOLDER);
        c.id = c.pool.protect(c.amount, 1, block.timestamp);
        (,, c.entryFloor,) = c.pool.positions(c.id);
        require(c.entryFloor == c.amount * c.entry / c.unit, "floor priced per whole unit");
        vm.warp(block.timestamp + 61);
        c.oracle.set(c.entry / 4 + uint256(rawMove) % (c.entry * 4));
        _roundTrip(c);
    }

    function _roundTrip(Case memory c) private {
        (uint256 out, uint256 fee, uint256 floorOut) = c.pool.previewPartialExit(c.id, c.slice);
        require(out + fee == c.slice, "asset split");
        require(fee * 100 <= c.slice * 12, "fee never exceeds 12% of the slice");
        vm.prank(HOLDER);
        c.pool.partialExitAsset(c.id, c.slice, out, block.timestamp);
        vm.prank(HOLDER);
        c.pool.exitBacking(c.id);
        ShieldPool pool = c.pool;
        require(pool.reservedBacking() == 0 && pool.protectedBalance() == 0, "fully released");
        require(
            c.asset.balanceOf(address(pool))
                == pool.juniorInventory() + pool.rewardInventory() + pool.otherFeeInventory(),
            "asset custody equals liabilities"
        );
        require(usdc.balanceOf(address(pool)) == pool.totalBacking(), "backing custody equals counter");
        require(usdc.balanceOf(HOLDER) + floorOut == c.entryFloor, "entry claim conserved across both exits");
    }
}
