// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ShieldPool} from "../src/ShieldPool.sol";
import {ShieldFactory} from "../src/ShieldFactory.sol";
import {ShieldChronicleOracle, ShieldScenarioOracle} from "../src/ShieldOracles.sol";
import {Vm, MutableOracle, MockToken, MockChronicle, MockSelfKisser} from "./ShieldMocks.sol";

/// @notice Workflow parity with the template: partial exits, rewards, notice, transfers, deadlines and the factory.
contract ShieldParityTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant HOLDER = address(0xA11CE);
    address constant PROVIDER = address(0xB0B);
    address constant CREATOR = address(0xC);
    address constant PROTOCOL = address(0xD);
    MockToken usdc;
    MockToken eurc;
    MockToken cirbtc;
    MutableOracle oracle;
    MutableOracle btcOracle;
    ShieldScenarioOracle scenario;
    ShieldPool pool;
    ShieldFactory factory;

    function terms() private pure returns (ShieldPool.Terms memory) {
        return ShieldPool.Terms(15000, 1000, 100, 7 days, 60, 120);
    }

    function setUp() public {
        vm.chainId(5042002);
        vm.warp(10000);
        usdc = new MockToken("USDC", "USDC", 6);
        eurc = new MockToken("EURC", "EURC", 6);
        cirbtc = new MockToken("cirBTC", "cirBTC", 8);
        oracle = new MutableOracle();
        btcOracle = new MutableOracle();
        btcOracle.set(81827_183708);
        scenario = new ShieldScenarioOracle();
        factory = new ShieldFactory(
            usdc, PROTOCOL, address(eurc), address(cirbtc), address(oracle), address(btcOracle), address(scenario)
        );
        pool = new ShieldPool(address(usdc), address(oracle), CREATOR, PROTOCOL, address(eurc), terms());
        usdc.mint(PROVIDER, 10_000e6);
        vm.startPrank(PROVIDER);
        usdc.approve(address(pool), type(uint256).max);
        pool.depositJunior(1000e6, 1);
        vm.stopPrank();
        usdc.mint(HOLDER, 10_000e6);
        eurc.mint(HOLDER, 10_000e6);
        cirbtc.mint(HOLDER, 1e8);
        vm.startPrank(HOLDER);
        usdc.approve(address(factory), type(uint256).max);
        eurc.approve(address(pool), type(uint256).max);
        vm.stopPrank();
    }

    function open() private returns (uint256 id) {
        vm.prank(HOLDER);
        id = pool.protect(100e6, 110e6, block.timestamp);
        vm.warp(block.timestamp + 61);
    }

    function testPartialBackingThenAssetExitPreservesRemainingClaim() public {
        uint256 id = open();
        vm.prank(HOLDER);
        pool.partialExitBacking(id, 33_333333, 36e6, block.timestamp);
        (, uint256 amount, uint256 floor,) = pool.positions(id);
        require(amount == 66_666667 && floor == 73_333334, "conservative remaining claim");
        require(pool.reservedBacking() == floor, "remaining reserve");
        vm.prank(HOLDER);
        pool.partialExitAsset(id, amount, amount, block.timestamp);
        require(pool.reservedBacking() == 0 && pool.protectedBalance() == 0, "fully closed");
        vm.prank(HOLDER);
        vm.expectRevert();
        pool.exitBacking(id);
    }

    function testPartialPositiveGainPaysIndependentRewardsWithoutPrincipalLoss() public {
        uint256 id = open();
        oracle.set(2_200_000);
        vm.prank(HOLDER);
        pool.partialExitAsset(id, 50e6, 47e6, block.timestamp);
        require(pool.earned(PROVIDER) == 2.5e6, "half gain fee");
        require(pool.protectedBalance() == 50e6 && pool.juniorInventory() == 0, "principal segregated");
        uint256 before = eurc.balanceOf(PROVIDER);
        vm.prank(PROVIDER);
        pool.claimRewards(PROVIDER);
        require(eurc.balanceOf(PROVIDER) - before == 2.5e6, "claim received");
        require(
            pool.protectedBalance() == 50e6 && pool.totalBacking() == 1000e6 && pool.rewardInventory() == 0,
            "reward cannot consume principal"
        );
    }

    function testRewardsCannotBeClaimedTwiceOrInheritedByNewDepositor() public {
        uint256 id = open();
        oracle.set(2_200_000);
        vm.prank(HOLDER);
        pool.exitAsset(id, 0);
        vm.startPrank(HOLDER);
        usdc.approve(address(pool), 1000e6);
        pool.depositJunior(1000e6, 1);
        vm.stopPrank();
        require(pool.earned(HOLDER) == 0 && pool.earned(PROVIDER) == 5e6, "new shares have no past reward");
        vm.prank(PROVIDER);
        pool.claimRewards(PROVIDER);
        vm.prank(PROVIDER);
        vm.expectRevert(ShieldPool.InvalidAmount.selector);
        pool.claimRewards(PROVIDER);
    }

    function testPartialJuniorRedemptionKeepsPriorRewardsClaimable() public {
        uint256 id = open();
        oracle.set(2_200_000);
        vm.prank(HOLDER);
        pool.exitAsset(id, 0);
        vm.prank(PROVIDER);
        pool.requestJuniorWithdrawal();
        vm.warp(block.timestamp + 121);
        vm.prank(PROVIDER);
        pool.withdrawJunior(500e18, 500e6, 0);
        require(pool.shares(PROVIDER) == 500e18 && pool.earned(PROVIDER) == 5e6, "partial withdrawal preserves rewards");
        vm.prank(PROVIDER);
        pool.claimRewards(PROVIDER);
        require(pool.totalBacking() == 500e6, "principal intact");
    }

    function testCancelNoticeResetsOnlyCaller() public {
        vm.prank(PROVIDER);
        pool.requestJuniorWithdrawal();
        vm.prank(PROVIDER);
        pool.cancelJuniorWithdrawal();
        require(pool.withdrawalReadyAt(PROVIDER) == 0, "cancelled");
        vm.warp(block.timestamp + 121);
        vm.prank(PROVIDER);
        vm.expectRevert(ShieldPool.NotReady.selector);
        pool.withdrawJunior(1e18, 0, 0);
    }

    function testPartialBoundAndDeadlineCannotBeBypassed() public {
        uint256 id = open();
        vm.prank(HOLDER);
        vm.expectRevert(ShieldPool.Slippage.selector);
        pool.partialExitAsset(id, 50e6, 51e6, block.timestamp);
        vm.prank(HOLDER);
        vm.expectRevert();
        pool.partialExitBacking(id, 50e6, 1, block.timestamp - 1);
        require(pool.protectedBalance() == 100e6, "failed exits unchanged");
    }

    function testFactoryCreatesAndSeedsAtomically() public {
        vm.prank(HOLDER);
        address created = factory.createPool(address(eurc), address(oracle), terms(), block.timestamp);
        ShieldPool market = ShieldPool(created);
        require(factory.isPool(created) && factory.allPools().length == 1, "registered");
        require(market.creator() == HOLDER && market.protectedToken() == address(eurc), "identities");
        require(address(market.backing()) == address(usdc) && market.assetUnit() == 1e6, "USDC backing");
        require(market.shares(HOLDER) == 5e18 && market.totalBacking() == 5e6, "creation seed belongs to creator");
        require(usdc.balanceOf(address(factory)) == 0, "no unaccounted bond");
    }

    function testFactoryApprovedPairsOnly() public {
        require(factory.allowed(address(eurc), address(oracle)), "EURC reference");
        require(factory.allowed(address(eurc), address(scenario)), "EURC scenario");
        require(factory.allowed(address(cirbtc), address(btcOracle)), "cirBTC reference");
        require(!factory.allowed(address(cirbtc), address(oracle)), "cirBTC cannot use the EURC price");
        require(!factory.allowed(address(cirbtc), address(scenario)), "no cirBTC scenario");
        require(!factory.allowed(address(usdc), address(oracle)), "USDC is never a protected asset");
        require(!factory.allowed(address(0), address(oracle)), "no native asset");
        vm.prank(HOLDER);
        address btcMarket = factory.createPool(address(cirbtc), address(btcOracle), terms(), block.timestamp);
        require(ShieldPool(btcMarket).assetUnit() == 1e8, "cirBTC market");
    }

    function testFactoryRejectsUnsupportedPairAndBadTermsWithoutRegistration() public {
        vm.prank(HOLDER);
        vm.expectRevert(bytes("UNAPPROVED_PAIR"));
        factory.createPool(address(cirbtc), address(oracle), terms(), block.timestamp);
        ShieldPool.Terms memory t = terms();
        t.collateralBps = 10000;
        vm.prank(HOLDER);
        vm.expectRevert(bytes("COLLATERAL_LIMIT"));
        factory.createPool(address(eurc), address(oracle), t, block.timestamp);
        vm.prank(HOLDER);
        vm.expectRevert(bytes("DEADLINE"));
        factory.createPool(address(eurc), address(oracle), terms(), block.timestamp - 1);
        require(factory.allPools().length == 0 && usdc.balanceOf(HOLDER) == 10_000e6, "atomic rejection");
    }

    /// A stale Chronicle reference blocks creation and protection, but never falls back to the scenario price.
    function testStaleReferenceBlocksCreationWithoutFallback() public {
        MockChronicle eurcUsd = new MockChronicle();
        MockChronicle usdcUsd = new MockChronicle();
        MockSelfKisser kisser = new MockSelfKisser();
        eurcUsd.set(1.1e18, block.timestamp);
        usdcUsd.set(1e18, block.timestamp);
        ShieldChronicleOracle refOracle =
            new ShieldChronicleOracle(address(eurcUsd), address(usdcUsd), 3 hours, address(kisser));
        ShieldFactory live = new ShieldFactory(
            usdc, PROTOCOL, address(eurc), address(cirbtc), address(refOracle), address(btcOracle), address(scenario)
        );
        vm.startPrank(HOLDER);
        usdc.approve(address(live), type(uint256).max);
        ShieldPool market = ShieldPool(live.createPool(address(eurc), address(refOracle), terms(), block.timestamp));
        eurc.approve(address(market), type(uint256).max);
        uint256 id = market.protect(3e6, 1, block.timestamp);
        vm.stopPrank();
        vm.warp(block.timestamp + 3 hours + 1);
        vm.startPrank(HOLDER);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        live.createPool(address(eurc), address(refOracle), terms(), block.timestamp);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        market.protect(1e6, 1, block.timestamp);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        market.exitAsset(id, 0);
        market.exitBacking(id);
        vm.stopPrank();
        require(usdc.balanceOf(HOLDER) == 10_000e6 - 5e6 + 3.3e6, "backing exit still pays the fixed claim");
        require(live.allPools().length == 1, "failed creation left no market");
    }

    function testFactoryConstructorRejectsBadConfiguration() public {
        MockToken wad = new MockToken("WAD", "WAD", 18);
        vm.expectRevert(bytes("BACKING_DECIMALS"));
        new ShieldFactory(
            wad, PROTOCOL, address(eurc), address(cirbtc), address(oracle), address(btcOracle), address(scenario)
        );
        vm.expectRevert(bytes("ASSETS"));
        new ShieldFactory(
            usdc, PROTOCOL, address(usdc), address(cirbtc), address(oracle), address(btcOracle), address(scenario)
        );
        vm.expectRevert(bytes("ORACLES"));
        new ShieldFactory(
            usdc, PROTOCOL, address(eurc), address(cirbtc), address(oracle), address(btcOracle), address(oracle)
        );
        vm.expectRevert(bytes("ZERO_PROTOCOL"));
        new ShieldFactory(
            usdc, address(0), address(eurc), address(cirbtc), address(oracle), address(btcOracle), address(scenario)
        );
        vm.chainId(5042);
        vm.expectRevert(bytes("TESTNET_ONLY"));
        new ShieldFactory(
            usdc, PROTOCOL, address(eurc), address(cirbtc), address(oracle), address(btcOracle), address(scenario)
        );
    }

    function testFuzzPartialBackingNeverOverpaysEntry(uint64 raw) public {
        uint256 id = open();
        uint256 part = 0.01e6 + uint256(raw) % (100e6 - 0.01e6);
        uint256 before = usdc.balanceOf(HOLDER);
        vm.prank(HOLDER);
        pool.partialExitBacking(id, part, 1, block.timestamp);
        (, uint256 remaining, uint256 floor,) = pool.positions(id);
        require(remaining + part == 100e6, "asset conservation");
        uint256 paid = usdc.balanceOf(HOLDER) - before;
        require(paid + floor == 110e6 && pool.reservedBacking() == floor, "floor conservation");
    }

    function testTransferPreservesEntryBasisAndExcludesOldOwner() public {
        uint256 id = open();
        vm.prank(HOLDER);
        pool.transferPosition(id, PROVIDER);
        (address owner, uint256 amount, uint256 floor, uint256 opened) = pool.positions(id);
        require(owner == PROVIDER && amount == 100e6 && floor == 110e6 && opened == 10000, "basis preserved");
        vm.prank(HOLDER);
        vm.expectRevert(ShieldPool.NotOwner.selector);
        pool.exitBacking(id);
        vm.prank(PROVIDER);
        pool.exitBacking(id);
        require(pool.reservedBacking() == 0, "new owner closes");
    }

    function testPartialGainThenLossDoesNotDoubleChargeOrLosePrincipal() public {
        uint256 id = open();
        oracle.set(2_200_000);
        vm.prank(HOLDER);
        pool.partialExitAsset(id, 40e6, 0, block.timestamp);
        require(pool.earned(PROVIDER) == 2e6, "slice gain only");
        oracle.set(0.5e6);
        vm.prank(HOLDER);
        pool.exitBacking(id);
        require(
            pool.totalBacking() == 934e6 && pool.juniorInventory() == 60e6 && pool.reservedBacking() == 0,
            "remaining entry claim exact"
        );
        require(pool.earned(PROVIDER) == 2e6, "no double reward");
    }

    function testProviderDeadlinesRevertAtomically() public {
        vm.prank(PROVIDER);
        vm.expectRevert();
        pool.depositJuniorBounded(10e6, 1, block.timestamp - 1);
        vm.prank(PROVIDER);
        pool.requestJuniorWithdrawal();
        vm.warp(block.timestamp + 121);
        vm.prank(PROVIDER);
        vm.expectRevert();
        pool.withdrawJuniorBounded(100e18, 0, 0, block.timestamp - 1);
        require(pool.shares(PROVIDER) == 1000e18, "expired redemption unchanged");
    }
}
