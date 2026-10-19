// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ShieldChronicleOracle, ShieldChainlinkOracle, ShieldScenarioOracle} from "../src/ShieldOracles.sol";
import {Vm, MockChronicle, MockSelfKisser, MockAggregator} from "./ShieldMocks.sol";

/// @notice Oracle adapters: freshness, validity, whitelisting and decimal normalization to USDC units.
contract ShieldOraclesTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant MAX_AGE = 3 hours;
    MockChronicle eurcUsd;
    MockChronicle usdcUsd;
    MockChronicle btcUsdc;
    MockSelfKisser kisser;

    function setUp() public {
        vm.chainId(31337);
        vm.warp(1_800_000_000);
        eurcUsd = new MockChronicle();
        usdcUsd = new MockChronicle();
        btcUsdc = new MockChronicle();
        kisser = new MockSelfKisser();
        // Values read on Arc testnet on 19 October 2026 (18 decimals).
        eurcUsd.set(1_123300126579703113, block.timestamp - 600);
        usdcUsd.set(999837840390000000, block.timestamp - 600);
        btcUsdc.set(81827183708578801548325, block.timestamp - 600);
    }

    function _eurc() private returns (ShieldChronicleOracle) {
        return new ShieldChronicleOracle(address(eurcUsd), address(usdcUsd), MAX_AGE, address(kisser));
    }

    function testCompositeEurcPriceIsInUsdcUnits() public {
        ShieldChronicleOracle o = _eurc();
        // 1.1233001 USD per EURC ÷ 0.9998378 USD per USDC = 1.123482 USDC per EURC (rounded down).
        require(o.price() == 1_123482, "EURC/USD divided by USDC/USD");
        require(o.feedDecimals() == 18 && o.quoteDecimals() == 18, "decimals read");
    }

    function testDirectCirbtcPriceNormalizesEighteenToSix() public {
        ShieldChronicleOracle o = new ShieldChronicleOracle(address(btcUsdc), address(0), MAX_AGE, address(kisser));
        require(o.price() == 81827_183708, "CIRBTC/USDC in USDC base units");
        require(address(o.quote()) == address(0), "no quote feed");
    }

    function testAdapterWhitelistsItselfAndFailsWithoutWhitelist() public {
        ShieldChronicleOracle kissed = _eurc();
        require(eurcUsd.tolled(address(kissed)) && usdcUsd.tolled(address(kissed)), "self-kissed both feeds");
        ShieldChronicleOracle unkissed =
            new ShieldChronicleOracle(address(eurcUsd), address(usdcUsd), MAX_AGE, address(0));
        vm.expectRevert(abi.encodeWithSelector(MockChronicle.NotTolled.selector, address(unkissed)));
        unkissed.price();
    }

    function testFreshnessBoundaryIsInclusive() public {
        ShieldChronicleOracle o = _eurc();
        eurcUsd.set(1.1e18, block.timestamp - MAX_AGE);
        usdcUsd.set(1e18, block.timestamp - MAX_AGE);
        require(o.price() == 1_100000, "exactly maxAge is accepted");
        eurcUsd.set(1.1e18, block.timestamp - MAX_AGE - 1);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        o.price();
    }

    function testStaleQuoteAloneBlocksThePrice() public {
        ShieldChronicleOracle o = _eurc();
        usdcUsd.set(1e18, block.timestamp - MAX_AGE - 1);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        o.price();
    }

    function testRejectsFutureZeroAndUnavailableValues() public {
        ShieldChronicleOracle o = _eurc();
        eurcUsd.set(1.1e18, block.timestamp + 1);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        o.price();
        eurcUsd.set(0, block.timestamp);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        o.price();
        eurcUsd.set(1.1e18, block.timestamp);
        eurcUsd.setBroken(true);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        o.price();
        eurcUsd.setBroken(false);
        usdcUsd.set(1e18, 0);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        o.price();
    }

    function testDustThatRoundsToZeroIsRejected() public {
        ShieldChronicleOracle o = new ShieldChronicleOracle(address(btcUsdc), address(0), MAX_AGE, address(kisser));
        btcUsdc.set(1e12 - 1, block.timestamp);
        vm.expectRevert(bytes("ZERO_PRICE"));
        o.price();
        btcUsdc.set(1e12, block.timestamp);
        require(o.price() == 1, "one base unit");
    }

    function testAgeReportsTheOlderFeed() public {
        ShieldChronicleOracle o = _eurc();
        eurcUsd.set(1.1e18, block.timestamp - 100);
        usdcUsd.set(1e18, block.timestamp - 700);
        require(o.age() == 700, "oldest component");
    }

    function testConstructorBounds() public {
        vm.expectRevert(bytes("MAX_AGE"));
        new ShieldChronicleOracle(address(eurcUsd), address(usdcUsd), 0, address(kisser));
        vm.expectRevert(bytes("MAX_AGE"));
        new ShieldChronicleOracle(address(eurcUsd), address(usdcUsd), 1 days + 1, address(kisser));
        vm.expectRevert(bytes("FEED"));
        new ShieldChronicleOracle(address(eurcUsd), address(eurcUsd), MAX_AGE, address(kisser));
        vm.expectRevert(bytes("FEED"));
        new ShieldChronicleOracle(address(0), address(usdcUsd), MAX_AGE, address(kisser));
    }

    function testFuzzCompositeMatchesReferenceFormula(uint96 rawBase, uint96 rawQuote) public {
        uint256 base = 0.5e18 + uint256(rawBase) % 2e18;
        uint256 quote = 0.9e18 + uint256(rawQuote) % 0.2e18;
        eurcUsd.set(base, block.timestamp);
        usdcUsd.set(quote, block.timestamp);
        ShieldChronicleOracle o = _eurc();
        uint256 expected = base * 1e6 / quote;
        require(o.price() == expected, "base / quote in 6 decimals");
        // The result never exceeds the true ratio and is within one base unit of it.
        require(o.price() * quote <= base * 1e6 && (o.price() + 1) * quote > base * 1e6, "rounded down by < 1 unit");
    }

    function testChainlinkRejectsStaleFutureNonPositiveAndIncomplete() public {
        MockAggregator feed = new MockAggregator(8, 1.1e8);
        ShieldChainlinkOracle adapter = new ShieldChainlinkOracle(address(feed), address(0), 1 days);
        require(adapter.price() == 1_100000, "8 to 6 decimals");
        feed.set(1.1e8, block.timestamp - 1 days - 1, 2);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        adapter.price();
        feed.set(1.1e8, block.timestamp + 1, 2);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        adapter.price();
        feed.set(0, block.timestamp, 2);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        adapter.price();
        feed.set(-1, block.timestamp, 2);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        adapter.price();
        feed.set(1.1e8, block.timestamp, 1);
        vm.expectRevert(bytes("INVALID_OR_STALE_PRICE"));
        adapter.price();
    }

    function testChainlinkMainnetCompositeAndDecimalPaths() public {
        // Arc mainnet EURC/USD and USDC/USD are 8-decimal feeds.
        MockAggregator eurcFeed = new MockAggregator(8, 1_12245412);
        MockAggregator usdcFeed = new MockAggregator(8, 99986925);
        ShieldChainlinkOracle composite = new ShieldChainlinkOracle(address(eurcFeed), address(usdcFeed), 25 hours);
        require(composite.price() == 1_122600, "EURC/USD divided by USDC/USD");
        MockAggregator coarse = new MockAggregator(2, 112);
        require(new ShieldChainlinkOracle(address(coarse), address(0), 1 hours).price() == 1_120000, "scale up");
        MockAggregator wide = new MockAggregator(18, 1.14e18);
        require(new ShieldChainlinkOracle(address(wide), address(0), 1 hours).price() == 1_140000, "scale down");
        MockAggregator tooWide = new MockAggregator(19, 1);
        vm.expectRevert(bytes("DECIMALS"));
        new ShieldChainlinkOracle(address(tooWide), address(0), 1 hours);
        vm.expectRevert(bytes("MAX_AGE"));
        new ShieldChainlinkOracle(address(eurcFeed), address(0), 25 hours + 1);
    }

    function testScenarioCycleIsDeterministicAndLabelled() public {
        ShieldScenarioOracle scenario = new ShieldScenarioOracle();
        uint256 t0 = block.timestamp;
        require(scenario.price() == 1_100000, "step 0");
        vm.warp(t0 + 119);
        require(scenario.price() == 1_100000, "still step 0");
        vm.warp(t0 + 120);
        require(scenario.price() == 1_200000, "step 1");
        vm.warp(t0 + 240);
        require(scenario.price() == 1_000000, "step 2");
        vm.warp(t0 + 360);
        require(scenario.price() == 1_100000, "cycle repeats");
    }
}
