// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ShieldPool} from "../src/ShieldPool.sol";
import {Vm, MutableOracle, MockToken} from "./ShieldMocks.sol";

/// @notice Position-slot regressions: slots bound open exposure, not lifetime activity.
contract ShieldPositionsTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    ShieldPool pool;
    MockToken usdc;
    MockToken eurc;
    MutableOracle oracle;
    address constant ALICE = address(0xA11CE);
    address constant BOB = address(0xB0B);
    address constant MALLORY = address(0xBAD);

    function setUp() public {
        vm.chainId(5042002);
        vm.warp(10000);
        usdc = new MockToken("USDC", "USDC", 6);
        eurc = new MockToken("EURC", "EURC", 6);
        oracle = new MutableOracle();
        pool = new ShieldPool(
            address(usdc),
            address(oracle),
            address(0xC),
            address(0xD),
            address(eurc),
            ShieldPool.Terms(15000, 1000, 100, 7 days, 60, 120)
        );
        for (uint160 i; i < 2; i++) {
            address who = i == 0 ? ALICE : MALLORY;
            eurc.mint(who, 1000e6);
            vm.prank(who);
            eurc.approve(address(pool), type(uint256).max);
        }
        usdc.mint(BOB, 1000e6);
        vm.startPrank(BOB);
        usdc.approve(address(pool), type(uint256).max);
        pool.depositJunior(1000e6, 1);
        vm.stopPrank();
    }

    function _open(address who, uint256 amount) private returns (uint256 id) {
        vm.prank(who);
        id = pool.protect(amount, 1, block.timestamp);
    }

    function testDustBelowMinimumFloorIsRejected() public {
        // 0.009 EURC at 1.10 USDC is a 0.0099 USDC claim, below the 0.01 minimum.
        vm.prank(MALLORY);
        vm.expectRevert(ShieldPool.InvalidAmount.selector);
        pool.protect(9000, 1, block.timestamp);
        // 0.01 EURC (the smallest documented journey amount) remains allowed.
        _open(ALICE, 0.01e6);
    }

    function testOpenThenCloseCyclesDoNotExhaustSlots() public {
        for (uint256 i; i < 120; i++) {
            uint256 id = _open(MALLORY, 0.01e6);
            vm.warp(block.timestamp + 61);
            vm.prank(MALLORY);
            pool.exitBacking(id);
        }
        require(pool.nextPositionId() == 121, "lifetime ids keep counting");
        require(pool.openPositionIds().length == 0, "nothing open");
        _open(ALICE, 1e6);
    }

    function testOpenSlotCapAndRelease() public {
        uint256 first = _open(MALLORY, 0.01e6);
        for (uint256 i = 1; i < 100; i++) {
            _open(MALLORY, 0.01e6);
        }
        vm.prank(ALICE);
        vm.expectRevert(ShieldPool.PositionLimit.selector);
        pool.protect(1e6, 1, block.timestamp);
        vm.warp(block.timestamp + 61);
        vm.prank(MALLORY);
        pool.exitBacking(first);
        _open(ALICE, 1e6);
    }

    function testOpenIdsTrackPartialAndFullExits() public {
        uint256 a = _open(ALICE, 1e6);
        uint256 b = _open(ALICE, 1e6);
        vm.warp(block.timestamp + 61);
        vm.startPrank(ALICE);
        pool.partialExitBacking(a, 0.5e6, 0, block.timestamp);
        uint256[] memory ids = pool.openPositionIds();
        require(ids.length == 2, "partial exit keeps slot");
        pool.exitBacking(b);
        vm.stopPrank();
        ids = pool.openPositionIds();
        require(ids.length == 1 && ids[0] == a, "full exit frees slot");
        vm.warp(pool.maturity());
        pool.settleExpired(a);
        require(pool.openPositionIds().length == 0, "settlement frees slot");
    }
}
