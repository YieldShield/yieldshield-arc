// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ShieldPool} from "../src/ShieldPool.sol";
import {ShieldPythOracle} from "../src/ShieldPyth.sol";
import {Vm, MockPyth, MockToken} from "./ShieldMocks.sol";

/// @notice Pyth adapter: freshness, validity, confidence, exponent scaling, the USDC/USD division and a pool
/// round trip in which every price-reading action is preceded by an update.
contract ShieldPythTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    bytes32 constant EURC_USD = 0x76fa85158bf14ede77087fe3ae472f66213f6ea2f5b411cb2de472794990fa5c;
    bytes32 constant USDC_USD = 0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a;
    bytes32 constant BTC_USD = 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43;
    uint256 constant MAX_AGE = 120;
    uint256 constant CONF_BPS = 100;
    MockPyth pyth;

    function setUp() public {
        vm.chainId(5042002);
        vm.warp(1_800_000_000);
        pyth = new MockPyth();
        pyth.setFee(1);
        // Values of the shape Pyth publishes (expo -8), read from Arc testnet's Pyth contract on 19 October 2026.
        pyth.setPrice(EURC_USD, 116524999, 121170, -8, block.timestamp - 5);
        pyth.setPrice(USDC_USD, 99994808, 36282, -8, block.timestamp - 5);
        pyth.setPrice(BTC_USD, 8539753395754, 2780604245, -8, block.timestamp - 5);
    }

    function _eurc() private returns (ShieldPythOracle) {
        return new ShieldPythOracle(address(pyth), EURC_USD, USDC_USD, MAX_AGE, CONF_BPS);
    }

    function _btc() private returns (ShieldPythOracle) {
        return new ShieldPythOracle(address(pyth), BTC_USD, USDC_USD, MAX_AGE, CONF_BPS);
    }

    function testEurcAndCirbtcAreDividedByUsdc() public {
        // 1.16524999 / 0.99994808 = 1.165310... USDC per EURC; 85,397.53395754 / 0.99994808 = 85,401.968... per cirBTC.
        require(_eurc().price() == 1_165310, "EURC/USD divided by USDC/USD");
        require(_btc().price() == 85401_968027, "BTC/USD divided by USDC/USD");
        ShieldPythOracle direct = new ShieldPythOracle(address(pyth), EURC_USD, bytes32(0), MAX_AGE, CONF_BPS);
        require(direct.price() == 1_165249, "no quote: feed scaled to 6 decimals");
    }

    function testFreshnessBoundaryAndStaleFeeds() public {
        ShieldPythOracle o = _eurc();
        pyth.setPrice(EURC_USD, 110000000, 10000, -8, block.timestamp - MAX_AGE);
        pyth.setPrice(USDC_USD, 100000000, 10000, -8, block.timestamp - MAX_AGE);
        require(o.price() == 1_100000, "exactly maxAge is accepted");
        vm.warp(block.timestamp + 1);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        o.price();
    }

    function testStaleQuoteAloneBlocksThePrice() public {
        ShieldPythOracle o = _eurc();
        pyth.setPrice(USDC_USD, 100000000, 10000, -8, block.timestamp - MAX_AGE - 1);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        o.price();
    }

    function testNeverPublishedFeedIsStale() public {
        ShieldPythOracle o = new ShieldPythOracle(address(pyth), keccak256("missing"), USDC_USD, MAX_AGE, CONF_BPS);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        o.price();
        vm.expectRevert(bytes("NO_PRICE"));
        o.age();
    }

    function testFuturePublishTimeFollowsPythWithinMaxAge() public {
        ShieldPythOracle o = _eurc();
        // Pyth accepts a publish time ahead of block time by at most `age` (clock skew); beyond that it is stale.
        pyth.setPrice(EURC_USD, 110000000, 10000, -8, block.timestamp + 30);
        require(o.price() > 0, "small skew accepted");
        require(o.age() == 5, "age is that of the older (quote) value");
        pyth.setPrice(EURC_USD, 110000000, 10000, -8, block.timestamp + MAX_AGE + 1);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        o.price();
    }

    function testRejectsZeroNegativeAndBadExponents() public {
        ShieldPythOracle o = _eurc();
        int64[2] memory bad = [int64(0), int64(-1)];
        for (uint256 i; i < bad.length; i++) {
            pyth.setPrice(EURC_USD, bad[i], 0, -8, block.timestamp);
            vm.expectRevert(bytes("INVALID_PRICE"));
            o.price();
        }
        pyth.setPrice(EURC_USD, 11, 1, 1, block.timestamp);
        vm.expectRevert(bytes("INVALID_PRICE"));
        o.price();
        pyth.setPrice(EURC_USD, 110000000, 10000, -19, block.timestamp);
        vm.expectRevert(bytes("INVALID_PRICE"));
        o.price();
        pyth.setPrice(EURC_USD, 1_100000000000000000, 100, -18, block.timestamp);
        require(o.price() == 1_100057, "expo -18 scales");
        pyth.setPrice(EURC_USD, 1, 0, 0, block.timestamp);
        vm.expectRevert(bytes("CONFIDENCE"));
        o.price();
        pyth.setPrice(EURC_USD, 2, 0, 0, block.timestamp);
        pyth.setPrice(USDC_USD, 2, 0, 0, block.timestamp);
        vm.expectRevert(bytes("CONFIDENCE"));
        o.price();
    }

    function testConfidenceLimitIsInclusiveAndCoversTheQuote() public {
        ShieldPythOracle o = _eurc();
        pyth.setPrice(EURC_USD, 110000000, 1100000, -8, block.timestamp);
        require(o.price() > 0, "exactly 1% accepted");
        pyth.setPrice(EURC_USD, 110000000, 1100001, -8, block.timestamp);
        vm.expectRevert(bytes("CONFIDENCE"));
        o.price();
        pyth.setPrice(EURC_USD, 110000000, 1000, -8, block.timestamp);
        pyth.setPrice(USDC_USD, 100000000, 1000001, -8, block.timestamp);
        vm.expectRevert(bytes("CONFIDENCE"));
        o.price();
        pyth.setPrice(EURC_USD, 110000000, 0, -8, block.timestamp);
        pyth.setPrice(USDC_USD, 100000000, 1000, -8, block.timestamp);
        vm.expectRevert(bytes("CONFIDENCE"));
        o.price();
    }

    function testDustThatRoundsToZeroIsRejected() public {
        ShieldPythOracle o = new ShieldPythOracle(address(pyth), BTC_USD, bytes32(0), MAX_AGE, 1000);
        pyth.setPrice(BTC_USD, 99, 1, -8, block.timestamp);
        vm.expectRevert(bytes("ZERO_PRICE"));
        o.price();
        pyth.setPrice(BTC_USD, 100, 1, -8, block.timestamp);
        require(o.price() == 1, "one base unit");
    }

    function testConstructorBounds() public {
        vm.expectRevert(bytes("FEED"));
        new ShieldPythOracle(address(0), EURC_USD, USDC_USD, MAX_AGE, CONF_BPS);
        vm.expectRevert(bytes("FEED"));
        new ShieldPythOracle(address(pyth), EURC_USD, EURC_USD, MAX_AGE, CONF_BPS);
        vm.expectRevert(bytes("FEED"));
        new ShieldPythOracle(address(pyth), bytes32(0), USDC_USD, MAX_AGE, CONF_BPS);
        vm.expectRevert(bytes("MAX_AGE"));
        new ShieldPythOracle(address(pyth), EURC_USD, USDC_USD, 0, CONF_BPS);
        vm.expectRevert(bytes("MAX_AGE"));
        new ShieldPythOracle(address(pyth), EURC_USD, USDC_USD, 1 hours + 1, CONF_BPS);
        vm.expectRevert(bytes("CONFIDENCE_LIMIT"));
        new ShieldPythOracle(address(pyth), EURC_USD, USDC_USD, MAX_AGE, 0);
        vm.expectRevert(bytes("CONFIDENCE_LIMIT"));
        new ShieldPythOracle(address(pyth), EURC_USD, USDC_USD, MAX_AGE, 1001);
    }

    function testUpdateNeedsTheFeeAndOnlyMovesForward() public {
        bytes[] memory data = new bytes[](1);
        data[0] = abi.encode(EURC_USD, int64(120000000), uint64(1000), int32(-8), uint64(block.timestamp));
        vm.expectRevert(MockPyth.InsufficientFee.selector);
        pyth.updatePriceFeeds(data);
        pyth.updatePriceFeeds{value: pyth.getUpdateFee(data)}(data);
        require(pyth.getPriceUnsafe(EURC_USD).price == 120000000, "updated");
        data[0] = abi.encode(EURC_USD, int64(90000000), uint64(1000), int32(-8), uint64(block.timestamp - 60));
        pyth.updatePriceFeeds{value: 1}(data);
        require(pyth.getPriceUnsafe(EURC_USD).price == 120000000, "older update ignored");
    }

    function testFuzzQuotientMatchesReferenceFormula(uint64 rawBase, uint64 rawQuote, uint8 rawExpo) public {
        int32 expo = -int32(uint32(rawExpo % 19));
        uint256 scale = 10 ** uint256(int256(18 + expo));
        uint256 base = 100 + uint256(rawBase) % 1e15;
        uint256 quote = 100 + uint256(rawQuote) % 1e15;
        pyth.setPrice(EURC_USD, int64(uint64(base)), uint64(base / 100), expo, block.timestamp);
        pyth.setPrice(USDC_USD, int64(uint64(quote)), uint64(quote / 100), expo, block.timestamp);
        uint256 expected = base * scale * 1e6 / (quote * scale);
        ShieldPythOracle o = _eurc();
        if (expected == 0) {
            vm.expectRevert(bytes("ZERO_PRICE"));
            o.price();
        } else {
            require(o.price() == expected, "base / quote in 6 decimals, independent of the shared exponent");
        }
    }

    /// Pull model end to end: an update right before protection, a stale price later, and a backing exit that
    /// needs no price.
    function testPoolRoundTripWithPullUpdates() public {
        MockToken usdc = new MockToken("USDC", "USDC", 6);
        MockToken eurc = new MockToken("EURC", "EURC", 6);
        ShieldPythOracle o = _eurc();
        ShieldPool pool = new ShieldPool(
            address(usdc),
            address(o),
            address(0xC),
            address(0xD),
            address(eurc),
            ShieldPool.Terms(15000, 1000, 100, 7 days, 60, 120)
        );
        usdc.mint(address(this), 1000e6);
        usdc.approve(address(pool), type(uint256).max);
        pool.depositJunior(1000e6, 1);
        eurc.mint(address(this), 100e6);
        eurc.approve(address(pool), type(uint256).max);
        vm.warp(block.timestamp + 300);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        pool.protect(10e6, 1, block.timestamp);
        bytes[] memory data = new bytes[](2);
        data[0] = abi.encode(EURC_USD, int64(110000000), uint64(10000), int32(-8), uint64(block.timestamp));
        data[1] = abi.encode(USDC_USD, int64(100000000), uint64(10000), int32(-8), uint64(block.timestamp));
        pyth.updatePriceFeeds{value: pyth.getUpdateFee(data)}(data);
        uint256 id = pool.protect(10e6, 11e6, block.timestamp);
        vm.warp(block.timestamp + 61 + MAX_AGE);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        pool.exitAsset(id, 0);
        pool.exitBacking(id);
        require(usdc.balanceOf(address(this)) == 11e6, "backing exit pays the fixed claim while stale");
    }
}
