// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {MainLauncher} from "../src/MainLauncher.sol";
import {MainSplitter} from "../src/MainSplitter.sol";
import {TreasurySplit} from "../src/TreasurySplit.sol";
import {BuybackVault} from "../src/BuybackVault.sol";
import {IPonsV2LaunchFactory} from "../src/interfaces/IPons.sol";
import {MockFactory, MockCurve, MockToken, Rejecter} from "./mocks/MockPons.sol";

/// The production fee model: 3.5% on platform coins, 3.6% on $MAIN, no endorse bonus, buyback & burn.
contract TreasuryTest is Test {
    MockFactory pons;
    MainLauncher main;
    BuybackVault vault;
    TreasurySplit treasury;

    address leo = 0x5Bc6884BAb4f2Ae87A2F18c3180C8B4E2Bfbb070;
    address team = 0xdC397056D4F851b0ab4C74Accb8aa4D9167D9F99;
    address signer = makeAddr("signer");
    address launcher = makeAddr("launcher");
    address kol = makeAddr("kol");
    address trader = makeAddr("trader");

    uint256 constant FEE = 0.0005 ether;
    // platform: intake 3.2% of volume = 0.7 (pons creator share) + 2.5 tax. kol 1.0, launcher 0.5, rest 1.7 → treasury
    uint16 constant P_KOL = 3125;
    uint16 constant P_LAUNCHER = 1563;
    uint16 constant P_TAX = 250;
    // $MAIN: intake 3.3% = 0.7 + 2.6 tax. team 1.0, leo 1.8, rest 0.5 → vault
    uint16 constant M_KOL = 3030;
    uint16 constant M_LAUNCHER = 5455;
    uint16 constant M_TAX = 260;

    function setUp() public {
        pons = new MockFactory();
        vault = new BuybackVault(address(this), IPonsV2LaunchFactory(address(pons)));
        address[] memory a = new address[](2);
        a[0] = address(vault);
        a[1] = leo;
        uint96[] memory w = new uint96[](2);
        w[0] = 5; // 0.5 of the 1.7 treasury share
        w[1] = 12; // 1.2
        treasury = new TreasurySplit(address(this), a, w);
        main = new MainLauncher(
            IPonsV2LaunchFactory(address(pons)),
            address(treasury),
            signer,
            MainLauncher.Shares({kolBps: P_KOL, endorsedKolBps: P_KOL, launcherBps: P_LAUNCHER, creatorTaxBps: P_TAX})
        );
        vm.deal(launcher, 10 ether);
        vm.deal(trader, 100 ether);
        vm.deal(address(this), 10 ether);
    }

    function _input(address[] memory accounts, uint96[] memory weights, string memory salt) internal pure returns (MainLauncher.LaunchInput memory) {
        return MainLauncher.LaunchInput({
            name: "x", symbol: "X", logo: "", description: "",
            socials: IPonsV2LaunchFactory.Socials("", "", "", "", ""),
            expectedEconomics: bytes32(0), salt: keccak256(bytes(salt)),
            kind: MainLauncher.Kind.KOL, kolRef: "x", kolAccounts: accounts, kolWeights: weights, minTokensOut: 0
        });
    }

    function _one(address x) internal pure returns (address[] memory a, uint96[] memory w) {
        a = new address[](1); a[0] = x; w = new uint96[](1); w[0] = 1;
    }

    /// Mock curve accrues 3.7% of volume regardless of tax; scale so intake matches the real tax for the assertion.
    function _tradeAndSweep(address curve, uint256 volume) internal {
        vm.prank(trader);
        MockCurve(curve).buy{value: volume}(volume, 0, trader);
        MockCurve(curve).sweepFees(0);
    }

    // ------------------------------------------------------------------ platform coins

    function test_platformSplit_noEndorseBonus() public {
        (address[] memory a, uint96[] memory w) = _one(kol);
        vm.prank(launcher);
        (address token, address curve,) = main.launch{value: FEE}(_input(a, w, "p1"));
        (,,,,, address recipient, uint16 tax,,,) = pons.lastParams();
        assertEq(tax, P_TAX);
        assertTrue(recipient != address(0));

        _tradeAndSweep(curve, 10 ether);
        main.sweepAndDistribute(token);
        uint256 intake = 10 ether * 37 / 1000; // mock accrual
        assertEq(kol.balance, intake * P_KOL / 10_000, "kol");
        assertEq(launcher.balance, 10 ether - FEE + intake * P_LAUNCHER / 10_000, "launcher");
        assertEq(address(treasury).balance, intake - intake * P_KOL / 10_000 - intake * P_LAUNCHER / 10_000, "treasury got the rest");

        // endorse changes nothing but the flag
        uint256 kolBefore = kol.balance;
        vm.prank(signer);
        main.setEndorsed(token, true);
        _tradeAndSweep(curve, 10 ether);
        main.sweepAndDistribute(token);
        assertEq(kol.balance - kolBefore, intake * P_KOL / 10_000, "same share after endorse");
    }

    function test_treasurySplit_forwardsByWeight() public {
        (address[] memory a, uint96[] memory w) = _one(kol);
        vm.prank(launcher);
        (address token, address curve,) = main.launch{value: FEE}(_input(a, w, "p2"));
        _tradeAndSweep(curve, 10 ether);
        main.sweepAndDistribute(token);
        uint256 t = address(treasury).balance;
        assertGt(t, 0);
        treasury.distribute();
        assertEq(address(vault).balance, t * 5 / 17, "vault 5/17");
        assertEq(leo.balance, t * 12 / 17, "leo 12/17");
        assertLe(address(treasury).balance, 1, "dust only");
    }

    function test_treasurySplit_reweight_and_deferred() public {
        Rejecter bad = new Rejecter();
        address[] memory a = new address[](2);
        a[0] = address(bad);
        a[1] = leo;
        uint96[] memory w = new uint96[](2);
        w[0] = 1;
        w[1] = 1;
        treasury.setRecipients(a, w);
        (bool ok,) = address(treasury).call{value: 2 ether}("");
        assertTrue(ok);
        treasury.distribute();
        assertEq(treasury.owed(address(bad)), 1 ether);
        assertEq(leo.balance, 1 ether);
        assertEq(treasury.pending(), 0);
        vm.expectRevert(TreasurySplit.Nothing.selector);
        treasury.distribute();
    }

    // ------------------------------------------------------------------ buyback & burn

    function _launchMain() internal returns (address token, address curve) {
        (address[] memory a, uint96[] memory w) = _one(team);
        (token, curve,) = main.launchWithShares{value: FEE}(
            _input(a, w, "main"),
            leo,
            MainLauncher.Shares({kolBps: M_KOL, endorsedKolBps: M_KOL, launcherBps: M_LAUNCHER, creatorTaxBps: M_TAX}),
            address(vault)
        );
        vault.setToken(token);
    }

    function test_mainToken_customShares() public {
        (address token, address curve) = _launchMain();
        (,,,,,, uint16 tax,,,) = pons.lastParams();
        assertEq(tax, M_TAX);
        MainSplitter s = MainSplitter(payable(main.splitterOf(token)));
        assertEq(s.launcher(), leo);
        assertEq(s.treasury(), address(vault));
        _tradeAndSweep(curve, 10 ether);
        main.sweepAndDistribute(token);
        uint256 intake = 10 ether * 37 / 1000;
        assertEq(team.balance, intake * M_KOL / 10_000, "team");
        assertEq(leo.balance, intake * M_LAUNCHER / 10_000, "leo");
        assertEq(address(vault).balance, intake - intake * M_KOL / 10_000 - intake * M_LAUNCHER / 10_000, "vault");
    }

    function test_launchWithShares_onlyOwner() public {
        (address[] memory a, uint96[] memory w) = _one(team);
        vm.prank(launcher);
        vm.expectRevert();
        main.launchWithShares{value: FEE}(_input(a, w, "nope"), leo, MainLauncher.Shares(1, 1, 1, 1), address(vault));
    }

    function test_vault_buysOnCurveAndBurns() public {
        (address token, address curve) = _launchMain();
        (bool ok,) = address(vault).call{value: 1 ether}("");
        assertTrue(ok);
        assertTrue(vault.ready());
        (uint256 spent, uint256 burned) = vault.buyAndBurn(0);
        assertEq(spent, 1 ether);
        assertEq(burned, 1 ether * 1000); // mock: 1000 tokens per wei
        assertEq(MockToken(token).totalBurned(), burned);
        assertEq(MockToken(token).balanceOf(address(vault)), 0);
        assertEq(address(vault).balance, 0);
        assertEq(MockCurve(curve).lastBuyer(), address(vault));
        assertEq(vault.totalBurned(), burned);
    }

    function test_vault_belowMinAndNoToken() public {
        (bool ok,) = address(vault).call{value: 0.001 ether}("");
        assertTrue(ok);
        vm.expectRevert(BuybackVault.NoToken.selector);
        vault.buyAndBurn(0);
        _launchMain();
        assertFalse(vault.ready());
        vm.expectRevert(BuybackVault.BelowMin.selector);
        vault.buyAndBurn(0);
    }

    function test_vault_graduatedNeedsRouter() public {
        (address token,) = _launchMain();
        pons.setPhase(token, 2);
        (bool ok,) = address(vault).call{value: 1 ether}("");
        assertTrue(ok);
        assertFalse(vault.ready());
        vm.expectRevert(BuybackVault.NeedsRouter.selector);
        vault.buyAndBurn(0);
    }

    function test_vault_tokenSetOnce() public {
        vault.setToken(address(1));
        vm.expectRevert(BuybackVault.AlreadySet.selector);
        vault.setToken(address(2));
    }

    // ------------------------------------------------------------------ end to end: platform coin → treasury → vault → burn

    function test_endToEnd_platformFeesBurnMain() public {
        (address mainTok,) = _launchMain();
        (address[] memory a, uint96[] memory w) = _one(kol);
        vm.prank(launcher);
        (address token, address curve,) = main.launch{value: FEE}(_input(a, w, "p3"));
        _tradeAndSweep(curve, 100 ether);
        main.sweepAndDistribute(token);
        treasury.distribute();
        assertGt(address(vault).balance, vault.minBuy());
        vault.buyAndBurn(0);
        assertGt(MockToken(mainTok).totalBurned(), 0, "platform fees burned $MAIN");
    }
}
