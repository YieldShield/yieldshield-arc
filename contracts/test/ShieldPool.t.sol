// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ShieldPool} from "../src/ShieldPool.sol";
import {Vm, MutableOracle, MockToken} from "./ShieldMocks.sol";

/// @notice Core pool economics with a 6-decimal EURC-like asset and 6-decimal USDC backing.
/// Entry price 1.10 USDC per EURC; 100 EURC opens a 110 USDC entry claim.
contract ShieldPoolTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    ShieldPool pool;
    MockToken usdc;
    MockToken eurc;
    MutableOracle oracle;
    address constant ALICE = address(0xA11CE);
    address constant BOB = address(0xB0B);
    address constant CREATOR = address(0xC);
    address constant PROTOCOL = address(0xD);

    function terms() internal pure returns (ShieldPool.Terms memory) {
        return ShieldPool.Terms(15000, 1000, 100, 7 days, 60, 120);
    }

    function setUp() public {
        vm.chainId(5042002);
        vm.warp(10000);
        usdc = new MockToken("USDC", "USDC", 6);
        eurc = new MockToken("EURC", "EURC", 6);
        oracle = new MutableOracle();
        pool = new ShieldPool(address(usdc), address(oracle), CREATOR, PROTOCOL, address(eurc), terms());
        eurc.mint(ALICE, 100_000e6);
        vm.prank(ALICE);
        eurc.approve(address(pool), type(uint256).max);
        usdc.mint(BOB, 10_000e6);
        vm.startPrank(BOB);
        usdc.approve(address(pool), type(uint256).max);
        pool.depositJunior(1000e6, 1);
        vm.stopPrank();
    }

    function _open(uint256 amount) private returns (uint256 id) {
        vm.prank(ALICE);
        id = pool.protect(amount, 1, block.timestamp);
        vm.warp(block.timestamp + 61);
    }

    function testBackingExitPaysEntryFloorAndSurrendersAllAsset() public {
        uint256 id = _open(100e6);
        oracle.set(1_000_000);
        vm.prank(ALICE);
        pool.exitBacking(id);
        require(usdc.balanceOf(ALICE) == 110e6, "entry floor");
        require(pool.juniorInventory() == 100e6 && pool.totalBacking() == 890e6, "inventory");
        require(pool.reservedBacking() == 0 && pool.protectedBalance() == 0, "release");
        vm.prank(ALICE);
        vm.expectRevert(ShieldPool.NotOwner.selector);
        pool.exitBacking(id);
    }

    function testPositiveGainsFeeDistributionAndAssetSolvency() public {
        uint256 id = _open(100e6);
        oracle.set(2_200_000);
        (uint256 out, uint256 fee) = pool.previewExit(id);
        require(out == 94e6 && fee == 6e6, "12 percent of positive gain");
        uint256 before = eurc.balanceOf(ALICE);
        vm.prank(ALICE);
        pool.exitAsset(id, out);
        require(eurc.balanceOf(ALICE) - before == out, "recipient");
        require(pool.claimableFees(CREATOR) == 0.5e6 && pool.claimableFees(PROTOCOL) == 0.5e6, "fee recipients");
        require(pool.rewardInventory() == 5e6 && eurc.balanceOf(address(pool)) == 6e6, "provider fee");
    }

    function testNoGainNoFee() public {
        uint256 id = _open(100e6);
        oracle.set(1_000_000);
        vm.prank(ALICE);
        pool.exitAsset(id, 100e6);
        require(pool.juniorInventory() == 0 && pool.claimableFees(CREATOR) == 0, "no loss fee");
    }

    function testBackingExitDoesNotDependOnOracle() public {
        uint256 id = _open(100e6);
        oracle.set(0);
        vm.prank(ALICE);
        pool.exitBacking(id);
        require(usdc.balanceOf(ALICE) == 110e6, "fixed payout");
    }

    function testJuniorCannotWithdrawReservedBacking() public {
        _open(100e6);
        vm.prank(BOB);
        pool.requestJuniorWithdrawal();
        vm.warp(block.timestamp + 121);
        uint256 amount = pool.shares(BOB);
        vm.prank(BOB);
        vm.expectRevert(ShieldPool.ActiveExposure.selector);
        pool.withdrawJunior(amount, 0, 0);
    }

    function testJuniorWithdrawalPaysAssetBasketAfterClaim() public {
        uint256 id = _open(100e6);
        vm.prank(ALICE);
        pool.exitBacking(id);
        vm.prank(BOB);
        pool.requestJuniorWithdrawal();
        vm.warp(block.timestamp + 121);
        uint256 amount = pool.shares(BOB);
        vm.prank(BOB);
        pool.withdrawJunior(amount, 890e6, 100e6);
        require(usdc.balanceOf(BOB) == 9890e6 && eurc.balanceOf(BOB) == 100e6, "basket");
        require(pool.totalShares() == 0 && pool.totalBacking() == 0 && pool.juniorInventory() == 0, "empty");
    }

    function testNewJuniorUsesCombinedAssetNAV() public {
        uint256 id = _open(100e6);
        oracle.set(1_000_000);
        vm.prank(ALICE);
        pool.exitBacking(id);
        require(pool.juniorValue() == 990e6, "realized decline");
        usdc.mint(ALICE, 990e6);
        vm.startPrank(ALICE);
        usdc.approve(address(pool), 990e6);
        pool.depositJunior(990e6, 1000e18);
        vm.stopPrank();
        require(pool.shares(ALICE) == pool.shares(BOB), "equal NAV shares");
    }

    function testDelaysOwnershipAndSlippage() public {
        vm.prank(ALICE);
        uint256 id = pool.protect(100e6, 110e6, block.timestamp);
        vm.prank(ALICE);
        vm.expectRevert(ShieldPool.NotReady.selector);
        pool.exitBacking(id);
        vm.warp(block.timestamp + 61);
        vm.prank(BOB);
        vm.expectRevert(ShieldPool.NotOwner.selector);
        pool.exitBacking(id);
        vm.prank(ALICE);
        vm.expectRevert(ShieldPool.Slippage.selector);
        pool.exitAsset(id, 101e6);
        vm.prank(BOB);
        vm.expectRevert(ShieldPool.ActiveExposure.selector);
        pool.withdrawJunior(1e18, 0, 0);
        vm.prank(ALICE);
        vm.expectRevert(ShieldPool.Slippage.selector);
        pool.protect(100e6, 110e6 + 1, block.timestamp);
    }

    function testFuzzReserveAndTokenAccounting(uint64 rawAmount, uint32 rawPrice) public {
        uint256 amount = 0.01e6 + uint256(rawAmount) % (500e6 - 0.01e6);
        uint256 price = 0.5e6 + uint256(rawPrice) % 3e6;
        uint256 id = _open(amount);
        oracle.set(price);
        vm.prank(ALICE);
        pool.exitAsset(id, 0);
        require(
            eurc.balanceOf(address(pool))
                == pool.protectedBalance() + pool.juniorInventory() + pool.rewardInventory() + pool.otherFeeInventory(),
            "asset accounting"
        );
        require(usdc.balanceOf(address(pool)) == pool.totalBacking(), "backing accounting");
        require(pool.totalBacking() >= pool.requiredBacking(pool.reservedBacking()), "reserve ratio");
    }

    function testJuniorFairnessCannotEscapeUnrealizedShortfall() public {
        _open(400e6);
        oracle.set(0.6e6);
        vm.startPrank(BOB);
        pool.requestJuniorWithdrawal();
        vm.warp(block.timestamp + 121);
        vm.expectRevert(ShieldPool.ActiveExposure.selector);
        pool.withdrawJunior(500e18, 0, 0);
        vm.expectRevert(ShieldPool.ActiveExposure.selector);
        pool.depositJunior(100e6, 1);
        vm.stopPrank();
    }

    function testExpiryUnblocksJuniorWithoutOwnerAndKeepsClaimSolvent() public {
        uint256 id = _open(500e6);
        oracle.set(0);
        vm.warp(pool.maturity());
        vm.prank(BOB);
        pool.settleExpired(id);
        require(pool.reservedBacking() == 0 && pool.totalBacking() == 450e6, "settled");
        require(pool.claimableBacking(ALICE) == 550e6 && pool.totalClaimableBacking() == 550e6, "owed");
        vm.prank(BOB);
        pool.requestJuniorWithdrawal();
        vm.warp(block.timestamp + 121);
        uint256 amount = pool.shares(BOB);
        vm.prank(BOB);
        pool.withdrawJunior(amount, 450e6, 500e6);
        require(usdc.balanceOf(address(pool)) == 550e6, "owner credit remains");
        vm.prank(ALICE);
        pool.claimBacking();
        require(usdc.balanceOf(ALICE) == 550e6, "claim");
        require(pool.totalClaimableBacking() == 0, "claim liability released");
        vm.prank(ALICE);
        vm.expectRevert(ShieldPool.InvalidAmount.selector);
        pool.claimBacking();
    }

    function testEpochAdmissionCutoffAndUpsideForfeiture() public {
        uint256 id = _open(100e6);
        vm.warp(pool.maturity() - 60);
        vm.prank(ALICE);
        vm.expectRevert(ShieldPool.EpochClosed.selector);
        pool.protect(100e6, 1, block.timestamp);
        vm.warp(pool.maturity());
        oracle.set(2_200_000);
        vm.prank(ALICE);
        vm.expectRevert(ShieldPool.EpochClosed.selector);
        pool.exitAsset(id, 0);
        pool.settleExpired(id);
        require(pool.claimableBacking(ALICE) == 110e6, "expiry floor only");
    }

    function testMainnetAndOtherChainsRejected() public {
        uint256[3] memory chains = [uint256(5042), 1, 43113];
        for (uint256 i; i < chains.length; i++) {
            vm.chainId(chains[i]);
            vm.expectRevert(bytes("TESTNET_ONLY"));
            new ShieldPool(address(usdc), address(oracle), CREATOR, PROTOCOL, address(eurc), terms());
        }
        vm.chainId(31337);
        new ShieldPool(address(usdc), address(oracle), CREATOR, PROTOCOL, address(eurc), terms());
    }

    function testNativeValueIsNeverAccepted() public {
        vm.deal(ALICE, 10 ether);
        vm.prank(ALICE);
        (bool sent,) = address(pool).call{value: 1 ether}("");
        require(!sent, "plain native transfer rejected");
        vm.prank(ALICE);
        (bool paid,) =
            address(pool).call{value: 1 ether}(abi.encodeCall(ShieldPool.protect, (100e6, 1, block.timestamp)));
        require(!paid, "protect is not payable");
        require(address(pool).balance == 0 && pool.protectedBalance() == 0, "no native custody");
    }

    function testRejectsNativeSameOrUnsupportedAssets() public {
        MockToken five = new MockToken("FIVE", "FIVE", 5);
        MockToken nineteen = new MockToken("NINETEEN", "N19", 19);
        MockToken wad = new MockToken("WAD", "WAD", 18);
        vm.expectRevert(bytes("ASSET_REQUIRED"));
        new ShieldPool(address(usdc), address(oracle), CREATOR, PROTOCOL, address(0), terms());
        vm.expectRevert(bytes("ASSET_REQUIRED"));
        new ShieldPool(address(usdc), address(oracle), CREATOR, PROTOCOL, address(usdc), terms());
        vm.expectRevert(bytes("ASSET_DECIMALS"));
        new ShieldPool(address(usdc), address(oracle), CREATOR, PROTOCOL, address(five), terms());
        vm.expectRevert(bytes("ASSET_DECIMALS"));
        new ShieldPool(address(usdc), address(oracle), CREATOR, PROTOCOL, address(nineteen), terms());
        vm.expectRevert(bytes("BACKING_DECIMALS"));
        new ShieldPool(address(wad), address(oracle), CREATOR, PROTOCOL, address(eurc), terms());
        ShieldPool ok = new ShieldPool(address(usdc), address(oracle), CREATOR, PROTOCOL, address(wad), terms());
        require(ok.assetUnit() == 1e18 && pool.assetUnit() == 1e6, "asset unit from decimals");
    }

    /// Arc USDC transfers to or from a blocklisted address revert. A blocklisted holder must not be able to
    /// block maturity settlement, provider redemption or anyone else's claims.
    function testBlocklistedHolderCannotBlockSettlementOrProviders() public {
        uint256 id = _open(100e6);
        usdc.setBlocked(ALICE, true);
        vm.prank(ALICE);
        vm.expectRevert(bytes("BLOCKLISTED"));
        pool.exitBacking(id);
        vm.warp(pool.maturity());
        vm.prank(BOB);
        pool.settleExpired(id);
        vm.prank(BOB);
        pool.requestJuniorWithdrawal();
        vm.warp(block.timestamp + 121);
        uint256 amount = pool.shares(BOB);
        vm.prank(BOB);
        pool.withdrawJunior(amount, 890e6, 100e6);
        require(usdc.balanceOf(address(pool)) == 110e6 && pool.totalClaimableBacking() == 110e6, "credit kept");
        vm.prank(ALICE);
        vm.expectRevert(bytes("BLOCKLISTED"));
        pool.claimBacking();
        usdc.setBlocked(ALICE, false);
        vm.prank(ALICE);
        pool.claimBacking();
        require(usdc.balanceOf(ALICE) == 110e6, "credit survives the block");
    }

    function testBlocklistedFeeRecipientCanRedirectPullClaim() public {
        uint256 id = _open(100e6);
        oracle.set(2_200_000);
        eurc.setBlocked(CREATOR, true);
        vm.prank(ALICE);
        pool.exitAsset(id, 0);
        vm.prank(CREATOR);
        vm.expectRevert(bytes("BLOCKLISTED"));
        pool.claimFees(CREATOR);
        // The payout moves from the pool to the chosen recipient, so a blocked creator can still redirect it.
        vm.prank(CREATOR);
        pool.claimFees(address(0xFEE));
        require(eurc.balanceOf(address(0xFEE)) == 0.5e6 && pool.claimableFees(CREATOR) == 0, "redirected claim");
        require(pool.claimableFees(PROTOCOL) == 0.5e6, "other recipient unaffected");
    }
}
