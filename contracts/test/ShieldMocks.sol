// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IShieldOracle} from "../src/ShieldPool.sol";

/// @notice Foundry cheatcodes used by these tests.
interface Vm {
    function deal(address, uint256) external;
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function warp(uint256) external;
    function expectRevert() external;
    function expectRevert(bytes4) external;
    function expectRevert(bytes calldata) external;
    function expectEmit(bool, bool, bool, bool) external;
    function chainId(uint256) external;
}

/// @notice Test-only oracle whose price the test sets directly.
contract MutableOracle is IShieldOracle {
    uint256 public price = 1_100_000;

    function set(uint256 x) external {
        price = x;
    }
}

/// @notice Test ERC-20 with chosen decimals and an Arc-style blocklist: transfers to or from a blocked address
/// revert, as Arc's USDC does for blocklisted accounts.
contract MockToken is ERC20 {
    uint8 private immutable places;
    mapping(address => bool) public blocked;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        places = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return places;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setBlocked(address who, bool value) external {
        blocked[who] = value;
    }

    function _update(address from, address to, uint256 value) internal override {
        require(!blocked[from] && !blocked[to], "BLOCKLISTED");
        super._update(from, to, value);
    }
}

/// @dev Fixed-metadata stand-ins for the canonical Arc assets. They keep no constructor state, so the local
/// rehearsal can install their runtime code at the real Arc addresses on an Anvil chain. Never deployed on Arc.
abstract contract FixedToken is ERC20 {
    constructor() ERC20("", "") {
        require(block.chainid == 31337, "LOCAL_ONLY");
    }

    /// @notice Open mint: local and rehearsal chains only.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @notice Local stand-in for Arc USDC's 6-decimal ERC-20 interface. Not Circle USDC.
contract MockUSDC is FixedToken {
    function name() public pure override returns (string memory) {
        return "USDC";
    }

    function symbol() public pure override returns (string memory) {
        return "USDC";
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

/// @notice Local stand-in for Circle EURC (6 decimals). Not Circle EURC.
contract MockEURC is FixedToken {
    function name() public pure override returns (string memory) {
        return "EURC";
    }

    function symbol() public pure override returns (string memory) {
        return "EURC";
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

/// @notice Local stand-in for Circle cirBTC (8 decimals). Not Circle cirBTC.
contract MockCirBTC is FixedToken {
    function name() public pure override returns (string memory) {
        return "Circle Wrapped Bitcoin";
    }

    function symbol() public pure override returns (string memory) {
        return "cirBTC";
    }

    function decimals() public pure override returns (uint8) {
        return 8;
    }
}

/// @notice Chronicle Scribe stand-in: 18 decimals, whitelisted reads, settable value and age.
/// Address zero is treated as whitelisted, as on Chronicle, so off-chain `eth_call` reads work.
contract MockChronicle {
    uint256 public value;
    uint256 public updatedAt;
    bool public broken;
    mapping(address => bool) public tolled;

    error NotTolled(address caller);

    function decimals() external pure returns (uint8) {
        return 18;
    }

    function set(uint256 value_, uint256 updatedAt_) external {
        value = value_;
        updatedAt = updatedAt_;
    }

    function setBroken(bool broken_) external {
        broken = broken_;
    }

    function kiss(address who) external {
        tolled[who] = true;
    }

    function tryReadWithAge() external view returns (bool, uint256, uint256) {
        if (!tolled[msg.sender] && msg.sender != address(0)) revert NotTolled(msg.sender);
        if (broken || value == 0) return (false, 0, 0);
        return (true, value, updatedAt);
    }
}

/// @notice Chronicle testnet SelfKisser stand-in: whitelists the caller on `oracle`.
contract MockSelfKisser {
    function selfKiss(address oracle) external {
        MockChronicle(oracle).kiss(msg.sender);
    }
}

/// @notice Chainlink AggregatorV3 stand-in.
contract MockAggregator {
    uint8 public decimals;
    int256 public answer;
    uint256 public updated;
    uint80 public round = 2;
    uint80 public answered = 2;

    constructor(uint8 decimals_, int256 answer_) {
        decimals = decimals_;
        answer = answer_;
        updated = block.timestamp;
    }

    function set(int256 a, uint256 t, uint80 r) external {
        answer = a;
        updated = t;
        answered = r;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (round, answer, updated, updated, answered);
    }
}
