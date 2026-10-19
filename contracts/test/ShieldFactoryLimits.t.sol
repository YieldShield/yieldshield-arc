// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ShieldPool} from "../src/ShieldPool.sol";
import {ShieldFactory} from "../src/ShieldFactory.sol";
import {ShieldScenarioOracle} from "../src/ShieldOracles.sol";
import {Vm, MutableOracle, MockToken} from "./ShieldMocks.sol";

/// @notice Registry regressions: community creations cannot exhaust the slots featured markets need.
contract ShieldFactoryLimitsTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant PROTOCOL = address(0xD);
    MockToken usdc;
    MockToken eurc;
    ShieldFactory factory;
    address refOracle;

    function terms() private pure returns (ShieldPool.Terms memory) {
        return ShieldPool.Terms(15000, 1000, 100, 7 days, 60, 120);
    }

    function setUp() public {
        vm.chainId(5042002);
        vm.warp(10000);
        usdc = new MockToken("USDC", "USDC", 6);
        eurc = new MockToken("EURC", "EURC", 6);
        MockToken cirbtc = new MockToken("cirBTC", "cirBTC", 8);
        MutableOracle oracle = new MutableOracle();
        MutableOracle btc = new MutableOracle();
        factory = new ShieldFactory(
            usdc,
            PROTOCOL,
            address(eurc),
            address(cirbtc),
            address(oracle),
            address(btc),
            address(new ShieldScenarioOracle())
        );
        refOracle = factory.eurcOracle();
    }

    function _create(address creator) private returns (address created) {
        usdc.mint(creator, factory.CREATION_SEED());
        vm.startPrank(creator);
        usdc.approve(address(factory), factory.CREATION_SEED());
        created = factory.createPool(address(eurc), refOracle, terms(), block.timestamp);
        vm.stopPrank();
    }

    function testCommunityCreatorLimit() public {
        address alice = address(0xA11CE);
        _create(alice);
        _create(alice);
        uint256 seed = factory.CREATION_SEED();
        usdc.mint(alice, seed);
        vm.startPrank(alice);
        usdc.approve(address(factory), seed);
        vm.expectRevert(bytes("CREATOR_LIMIT"));
        factory.createPool(address(eurc), refOracle, terms(), block.timestamp);
        vm.stopPrank();
    }

    function testCommunityCannotTakeProtocolReservedSlots() public {
        uint256 community = factory.MAX_POOLS() - factory.PROTOCOL_RESERVED_POOLS();
        for (uint160 i; i < community; i++) {
            _create(address(0x1000 + i / 2));
        }
        uint256 seed = factory.CREATION_SEED();
        address late = address(0xBEEF);
        usdc.mint(late, seed);
        vm.startPrank(late);
        usdc.approve(address(factory), seed);
        vm.expectRevert(bytes("COMMUNITY_SLOTS_FULL"));
        factory.createPool(address(eurc), refOracle, terms(), block.timestamp);
        vm.stopPrank();
        // The protocol account can still use every reserved slot, without a per-creator limit.
        for (uint256 i; i < factory.PROTOCOL_RESERVED_POOLS(); i++) {
            _create(PROTOCOL);
        }
        require(factory.allPools().length == factory.MAX_POOLS(), "registry filled by reserved slots");
        usdc.mint(PROTOCOL, seed);
        vm.startPrank(PROTOCOL);
        usdc.approve(address(factory), seed);
        vm.expectRevert(bytes("REGISTRY_FULL"));
        factory.createPool(address(eurc), refOracle, terms(), block.timestamp);
        vm.stopPrank();
    }
}
