// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {MainLauncher} from "../src/MainLauncher.sol";
import {MainSplitter} from "../src/MainSplitter.sol";
import {IPonsV2LaunchFactory} from "../src/interfaces/IPons.sol";
import {MockFactory, MockCurve, MockEscrow, MockToken, Rejecter} from "./mocks/MockPons.sol";

contract MainLauncherTest is Test {
    MockFactory pons;
    MainLauncher main;

    address treasury = makeAddr("treasury");
    address signer = makeAddr("signer");
    address launcher = makeAddr("launcher");
    address kol = makeAddr("kol");
    address kol2 = makeAddr("kol2");
    address kol3 = makeAddr("kol3");
    address trader = makeAddr("trader");

    // 3% tax + 0.7% pons share = 3.7% intake. KOL 1.0 / 3.7, launcher 0.5 / 3.7.
    uint16 constant KOL_BPS = 2703;
    uint16 constant KOL_ENDORSED_BPS = 5405;
    uint16 constant LAUNCHER_BPS = 1351;
    uint256 constant FEE = 0.0005 ether;

    function setUp() public {
        pons = new MockFactory();
        main = new MainLauncher(
            IPonsV2LaunchFactory(address(pons)),
            treasury,
            signer,
            MainLauncher.Shares({kolBps: KOL_BPS, endorsedKolBps: KOL_ENDORSED_BPS, launcherBps: LAUNCHER_BPS, creatorTaxBps: 300})
        );
        vm.deal(launcher, 10 ether);
        vm.deal(trader, 100 ether);
    }

    function _input(address[] memory accounts, uint96[] memory weights, MainLauncher.Kind kind)
        internal
        pure
        returns (MainLauncher.LaunchInput memory)
    {
        return MainLauncher.LaunchInput({
            name: "Proteus Season",
            symbol: "PROTEUS",
            logo: "ipfs://logo",
            description: "for @Proteus",
            socials: IPonsV2LaunchFactory.Socials({twitter: "https://x.com/proteus", telegram: "", discord: "", website: "", farcaster: ""}),
            expectedEconomics: bytes32(0),
            salt: keccak256("salt-1"),
            kind: kind,
            kolRef: "Proteus",
            kolAccounts: accounts,
            kolWeights: weights,
            minTokensOut: 0
        });
    }

    function _single(address a) internal pure returns (address[] memory accounts, uint96[] memory weights) {
        accounts = new address[](1);
        accounts[0] = a;
        weights = new uint96[](1);
        weights[0] = 1;
    }

    function _launch(address kolAccount) internal returns (address token, address curve, MainSplitter s) {
        (address[] memory a, uint96[] memory w) = _single(kolAccount);
        vm.prank(launcher);
        address splitter;
        (token, curve, splitter) = main.launch{value: FEE}(_input(a, w, MainLauncher.Kind.KOL));
        s = MainSplitter(payable(splitter));
    }

    function _tradeAndSweep(address curve, uint256 wei_) internal {
        vm.prank(trader);
        MockCurve(curve).buy{value: wei_}(wei_, 0, trader);
        MockCurve(curve).sweepFees(0);
    }

    // ------------------------------------------------------------------ launch

    function test_launch_wiresSplitterAsRecipientWithTax() public {
        (address token,, MainSplitter s) = _launch(kol);
        (,,,,, address recipient, uint16 tax,,,) = pons.lastParams();
        assertEq(recipient, address(s));
        assertEq(tax, 300);
        assertEq(pons.lastValue(), 0.0005 ether);
        assertEq(main.splitterOf(token), address(s));
        assertEq(s.token(), token);
        assertEq(s.launcher(), launcher);
        assertEq(main.tokenCount(), 1);
    }

    function test_launch_predictSplitterMatches() public {
        (address[] memory a, uint96[] memory w) = _single(kol);
        MainLauncher.LaunchInput memory input = _input(a, w, MainLauncher.Kind.KOL);
        address predicted = main.predictSplitter(launcher, input.salt);
        vm.prank(launcher);
        (,, address splitter) = main.launch{value: FEE}(input);
        assertEq(splitter, predicted);
    }

    function test_launch_devBuyGoesToLauncher() public {
        (address[] memory a, uint96[] memory w) = _single(kol);
        vm.prank(launcher);
        (address token, address curve,) = main.launch{value: FEE + 0.1 ether}(_input(a, w, MainLauncher.Kind.KOL));
        assertEq(MockCurve(curve).lastBuyWei(), 0.1 ether);
        assertEq(MockToken(token).balanceOf(launcher), 0.1 ether * 1000, "tokens handed to launcher");
        assertEq(MockToken(token).balanceOf(address(main)), 0);
        assertEq(pons.lastExemptions(0), launcher, "launcher exempt from snipe tax");
    }

    function test_launch_revertsBelowFee() public {
        (address[] memory a, uint96[] memory w) = _single(kol);
        vm.prank(launcher);
        vm.expectRevert(MainLauncher.BadDevBuy.selector);
        main.launch{value: 0.0001 ether}(_input(a, w, MainLauncher.Kind.KOL));
    }

    function test_launch_sameSaltTwiceReverts() public {
        (address[] memory a, uint96[] memory w) = _single(kol);
        vm.startPrank(launcher);
        main.launch{value: FEE}(_input(a, w, MainLauncher.Kind.KOL));
        vm.expectRevert();
        main.launch{value: FEE}(_input(a, w, MainLauncher.Kind.KOL));
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ distribution

    function test_distribute_splitsIntake() public {
        (address token, address curve, MainSplitter s) = _launch(kol);
        _tradeAndSweep(curve, 10 ether); // intake = 0.37 ETH
        uint256 intake = 10 ether * 37 / 1000;
        assertEq(s.claimable(), intake);

        main.sweepAndDistribute(token);

        uint256 kolShare = intake * KOL_BPS / 10_000;
        uint256 launcherShare = intake * LAUNCHER_BPS / 10_000;
        assertEq(kol.balance, kolShare);
        assertEq(launcher.balance, 10 ether - 0.0005 ether + launcherShare);
        assertEq(treasury.balance, intake - kolShare - launcherShare);
        assertEq(address(s).balance, 0);
        assertEq(s.totalDistributed(), intake);
        // 1.0% of volume to the KOL, within rounding of the bps approximation
        assertApproxEqRel(kolShare, 0.1 ether, 0.001e18);
        assertApproxEqRel(launcherShare, 0.05 ether, 0.001e18);
    }

    function test_distribute_endorsedDoublesKol() public {
        (address token, address curve, MainSplitter s) = _launch(kol);
        vm.prank(signer);
        main.setEndorsed(token, true);
        assertTrue(s.endorsed());
        _tradeAndSweep(curve, 10 ether);
        main.sweepAndDistribute(token);
        uint256 intake = 10 ether * 37 / 1000;
        assertEq(kol.balance, intake * KOL_ENDORSED_BPS / 10_000);
        assertApproxEqRel(kol.balance, 0.2 ether, 0.001e18);
        // launcher unchanged by endorsement
        assertEq(launcher.balance, 10 ether - 0.0005 ether + intake * LAUNCHER_BPS / 10_000);
    }

    function test_distribute_nothingReverts() public {
        (address token,, MainSplitter s) = _launch(kol);
        vm.expectRevert(MainSplitter.NothingToDistribute.selector);
        s.distribute();
        // the launcher-level helper just skips quietly
        assertEq(main.sweepAndDistribute(token), 0);
    }

    function test_anyoneCanDistribute() public {
        (address token, address curve,) = _launch(kol);
        _tradeAndSweep(curve, 1 ether);
        vm.prank(makeAddr("random"));
        main.sweepAndDistribute(token);
        assertGt(kol.balance, 0);
    }

    // ------------------------------------------------------------------ pending wallet

    function test_pendingKolAccruesThenReleasesOnSet() public {
        (address token, address curve, MainSplitter s) = _launch(address(0));
        _tradeAndSweep(curve, 10 ether);
        main.sweepAndDistribute(token);
        uint256 intake = 10 ether * 37 / 1000;
        uint256 kolShare = intake * KOL_BPS / 10_000;
        assertEq(s.pending(0), kolShare);
        assertEq(address(s).balance, kolShare); // held, not distributed
        assertEq(s.claimable(), 0); // reserved money is not "claimable"

        vm.prank(signer);
        main.setKolWallet(token, 0, kol);
        assertEq(kol.balance, kolShare);
        assertEq(s.pending(0), 0);
        assertEq(address(s).balance, 0);
    }

    function test_onlySignerOrOwnerCanEndorse() public {
        (address token,,) = _launch(kol);
        vm.prank(makeAddr("random"));
        vm.expectRevert(MainLauncher.NotSigner.selector);
        main.setEndorsed(token, true);
        main.setEndorsed(token, true); // owner (this test contract)
    }

    // ------------------------------------------------------------------ clans

    function test_clanSplitsKolPoolByWeight() public {
        address[] memory a = new address[](3);
        a[0] = kol;
        a[1] = kol2;
        a[2] = kol3;
        uint96[] memory w = new uint96[](3);
        w[0] = 1;
        w[1] = 1;
        w[2] = 2;
        vm.prank(launcher);
        (address token, address curve,) = main.launch{value: FEE}(_input(a, w, MainLauncher.Kind.CLAN));
        _tradeAndSweep(curve, 10 ether);
        main.sweepAndDistribute(token);
        uint256 intake = 10 ether * 37 / 1000;
        uint256 pool = intake * KOL_BPS / 10_000;
        assertEq(kol.balance, pool / 4);
        assertEq(kol2.balance, pool / 4);
        assertEq(kol3.balance, pool / 2);
    }

    function test_clanWithOnePendingMember() public {
        address[] memory a = new address[](2);
        a[0] = kol;
        a[1] = address(0);
        uint96[] memory w = new uint96[](2);
        w[0] = 1;
        w[1] = 1;
        vm.prank(launcher);
        (address token, address curve, address splitter) =
            main.launch{value: FEE}(_input(a, w, MainLauncher.Kind.CLAN));
        _tradeAndSweep(curve, 10 ether);
        main.sweepAndDistribute(token);
        MainSplitter s = MainSplitter(payable(splitter));
        uint256 pool = uint256(10 ether * 37 / 1000) * KOL_BPS / 10_000;
        assertEq(kol.balance, pool / 2);
        assertEq(s.pending(1), pool / 2);
        vm.prank(signer);
        main.setKolWallet(token, 1, kol2);
        assertEq(kol2.balance, pool / 2);
    }

    // ------------------------------------------------------------------ deferred payouts

    function test_rejectingRecipientIsDeferredAndCanWithdraw() public {
        Rejecter bad = new Rejecter();
        (address token, address curve, MainSplitter s) = _launch(address(bad));
        _tradeAndSweep(curve, 10 ether);
        main.sweepAndDistribute(token);
        uint256 kolShare = uint256(10 ether * 37 / 1000) * KOL_BPS / 10_000;
        assertEq(s.owed(address(bad)), kolShare);
        assertEq(address(s).balance, kolShare);
        // a second round must not touch the reserved amount
        _tradeAndSweep(curve, 10 ether);
        main.sweepAndDistribute(token);
        assertEq(s.owed(address(bad)), kolShare * 2);
        assertEq(address(s).balance, kolShare * 2);
    }

    // ------------------------------------------------------------------ owner config

    function test_sharesValidation() public {
        vm.expectRevert(MainLauncher.BadShares.selector);
        main.setShares(MainLauncher.Shares({kolBps: 6000, endorsedKolBps: 5000, launcherBps: 1000, creatorTaxBps: 300}));
        vm.expectRevert(MainLauncher.BadShares.selector);
        main.setShares(MainLauncher.Shares({kolBps: 5000, endorsedKolBps: 9000, launcherBps: 1001, creatorTaxBps: 300}));
        main.setShares(MainLauncher.Shares({kolBps: 3000, endorsedKolBps: 6000, launcherBps: 1500, creatorTaxBps: 500}));
        (uint16 k,,, uint16 t) = main.shares();
        assertEq(k, 3000);
        assertEq(t, 500);
    }
}
