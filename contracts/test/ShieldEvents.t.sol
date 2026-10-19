// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ShieldPool} from "../src/ShieldPool.sol";
import {Vm, MutableOracle, MockToken} from "./ShieldMocks.sol";

contract ShieldEventsTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    event GainFeesCharged(uint256 indexed id, uint256 providerReward, uint256 creatorFee, uint256 protocolFee);
    event Protected(uint256 indexed id, address indexed owner, uint256 amount, uint256 floor);
    ShieldPool pool;
    MutableOracle oracle;
    MockToken eurc;

    function setUp() public {
        vm.chainId(5042002);
        vm.warp(10000);
        MockToken usdc = new MockToken("USDC", "USDC", 6);
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
        eurc.mint(address(0xA11CE), 1000e6);
        vm.prank(address(0xA11CE));
        eurc.approve(address(pool), type(uint256).max);
        usdc.mint(address(0xB0B), 1000e6);
        vm.startPrank(address(0xB0B));
        usdc.approve(address(pool), type(uint256).max);
        pool.depositJunior(1000e6, 1);
        vm.stopPrank();
    }

    function testProtectionAndGainExitReportUnitsAndFeeSplit() public {
        vm.expectEmit(true, true, false, true);
        emit Protected(1, address(0xA11CE), 100e6, 110e6);
        vm.prank(address(0xA11CE));
        uint256 id = pool.protect(100e6, 1, block.timestamp);
        vm.warp(block.timestamp + 61);
        oracle.set(2_200_000); // value doubles: gain is half the EURC
        vm.expectEmit(true, false, false, true);
        emit GainFeesCharged(id, 5e6, 0.5e6, 0.5e6);
        vm.prank(address(0xA11CE));
        pool.exitAsset(id, 0);
    }
}
