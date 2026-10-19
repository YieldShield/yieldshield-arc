// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ShieldPool} from "../src/ShieldPool.sol";
import {Vm, MutableOracle, MockToken} from "./ShieldMocks.sol";

/// @notice Reward-index solvency regressions: total earnings must never exceed the reward inventory.
contract ShieldRewardsTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    ShieldPool pool;
    MockToken usdc;
    MockToken eurc;
    MutableOracle oracle;
    address constant ALICE = address(0xA11CE);
    address constant BOB = address(0xB0B);
    address constant CAROL = address(0xCA201);
    address constant ERIN = address(0xE21);

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
        eurc.mint(ALICE, 1_000_000e6);
        vm.prank(ALICE);
        eurc.approve(address(pool), type(uint256).max);
        _fund(BOB);
        _fund(CAROL);
        _fund(ERIN);
        vm.prank(BOB);
        pool.depositJunior(1000e6, 1);
    }

    function _fund(address who) private {
        usdc.mint(who, 10_000e6);
        vm.prank(who);
        usdc.approve(address(pool), type(uint256).max);
    }

    function _gainExit(uint256 amount) private {
        vm.prank(ALICE);
        uint256 id = pool.protect(amount, 1, block.timestamp);
        vm.warp(block.timestamp + 61);
        uint256 p0 = oracle.price();
        oracle.set(p0 * 2);
        vm.prank(ALICE);
        pool.exitAsset(id, 0);
        oracle.set(p0);
    }

    /// Leaves EURC inventory so later deposits mint shares at a non-round NAV.
    function _unevenNav() private {
        vm.prank(ALICE);
        uint256 id = pool.protect(100e6, 1, block.timestamp);
        vm.warp(block.timestamp + 61);
        vm.prank(ALICE);
        pool.exitBacking(id);
        oracle.set(1_034_567);
    }

    function testEveryProviderCanClaimAfterUnevenShareChanges() public {
        _unevenNav();
        _gainExit(10e6 + 2);
        vm.prank(CAROL);
        pool.depositJunior(10_012_762, 1);
        vm.prank(ERIN);
        pool.depositJunior(13_691_282, 1);
        _gainExit(10e6 + 4538);
        require(pool.earned(BOB) + pool.earned(CAROL) + pool.earned(ERIN) <= pool.rewardInventory(), "over-credited");
        vm.prank(BOB);
        pool.claimRewards(BOB);
        vm.prank(CAROL);
        pool.claimRewards(CAROL);
        uint256 last = pool.earned(ERIN);
        require(last > 1000, "meaningful reward");
        vm.prank(ERIN);
        pool.claimRewards(ERIN);
        require(eurc.balanceOf(ERIN) == last, "last claimer paid");
    }

    function testFuzzRewardsNeverExceedInventory(uint32 rawD, uint32 rawE, uint64 rawA, uint64 rawB) public {
        _unevenNav();
        _gainExit(1e6 + uint256(rawA) % 200e6);
        vm.prank(CAROL);
        pool.depositJunior(10e6 + uint256(rawD) % 990e6, 1);
        vm.prank(ERIN);
        pool.depositJunior(10e6 + uint256(rawE) % 990e6, 1);
        _gainExit(1e6 + uint256(rawB) % 200e6);
        require(pool.earned(BOB) + pool.earned(CAROL) + pool.earned(ERIN) <= pool.rewardInventory(), "over-credited");
    }
}
