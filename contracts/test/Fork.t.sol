// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {MainLauncher} from "../src/MainLauncher.sol";
import {MainSplitter} from "../src/MainSplitter.sol";
import {IPonsV2LaunchFactory, IPonsV2BondingCurve} from "../src/interfaces/IPons.sol";

interface IERC20Min {
    function balanceOf(address) external view returns (uint256);
}

/// Runs against a fork of Robinhood Chain and the real Pons V2 factory.
/// forge test --match-contract Fork -vv
contract ForkTest is Test {
    IPonsV2LaunchFactory constant PONS = IPonsV2LaunchFactory(0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e);

    MainLauncher main;
    address treasury = makeAddr("treasury");
    address signer = makeAddr("signer");
    address launcher = makeAddr("launcher");
    address kol = makeAddr("kol");
    address trader = makeAddr("trader");

    function setUp() public {
        vm.createSelectFork("robinhood");
        main = new MainLauncher(
            PONS,
            treasury,
            signer,
            MainLauncher.Shares({kolBps: 2703, endorsedKolBps: 5405, launcherBps: 1351, creatorTaxBps: 300})
        );
        vm.deal(launcher, 5 ether);
        vm.deal(trader, 50 ether);
    }

    function test_fork_launchTradeSweepDistribute() public {
        assertTrue(PONS.canLaunch(address(main)), "pons launches must be open");
        uint256 fee = PONS.launchFee();

        address[] memory a = new address[](1);
        a[0] = kol;
        uint96[] memory w = new uint96[](1);
        w[0] = 1;
        MainLauncher.LaunchInput memory input = MainLauncher.LaunchInput({
            name: "MAIN fork test",
            symbol: "MAINT",
            logo: "",
            description: "fork test",
            socials: IPonsV2LaunchFactory.Socials("", "", "", "", ""),
            expectedEconomics: PONS.previewLaunchEconomics(0, address(0)),
            salt: keccak256(abi.encode("fork", block.number)),
            kind: MainLauncher.Kind.KOL,
            kolRef: "Proteus",
            kolAccounts: a,
            kolWeights: w,
            minTokensOut: 0
        });

        // launch with a 0.05 ETH first buy
        vm.prank(launcher);
        (address token, address curve, address splitter) = main.launch{value: fee + 0.05 ether}(input);
        console2.log("token", token);
        console2.log("curve", curve);
        console2.log("splitter", splitter);

        IPonsV2LaunchFactory.LaunchedToken memory l = PONS.getLaunchedToken(token);
        assertEq(l.creatorFeeRecipient, splitter);
        assertEq(l.creatorTaxBps, 300);
        assertEq(l.deployer, address(main));
        assertGt(IERC20Min(token).balanceOf(launcher), 0, "dev buy delivered to launcher");

        // someone trades, after the 15 s snipe-tax window has decayed
        vm.warp(block.timestamp + 60);
        vm.roll(block.number + 100);
        vm.prank(trader);
        IPonsV2BondingCurve(curve).buy{value: 2 ether}(2 ether, 0, trader);

        // sweep as deployer + distribute
        uint256 distributed = main.sweepAndDistribute(token);
        console2.log("distributed wei", distributed);
        assertGt(distributed, 0, "fees reached the splitter");
        assertGt(kol.balance, 0, "kol paid");
        assertGt(treasury.balance, 0, "treasury paid");

        // 1% of volume to the KOL: volume = 2.05 ETH gross; the tax base is the quote leg net of pons fee,
        // so allow a generous band and just print the ratio for inspection.
        uint256 volume = 2.05 ether;
        console2.log("kol bps of volume", kol.balance * 10_000 / volume);
        assertGt(kol.balance * 10_000 / volume, 60); // > 0.6%
        assertLt(kol.balance * 10_000 / volume, 140); // < 1.4%

        // endorse, trade again, KOL share doubles
        vm.prank(signer);
        main.setEndorsed(token, true);
        uint256 before = kol.balance;
        vm.prank(trader);
        IPonsV2BondingCurve(curve).buy{value: 2 ether}(2 ether, 0, trader);
        main.sweepAndDistribute(token);
        uint256 second = kol.balance - before;
        console2.log("kol first round", before, "second round", second);
        assertGt(second, before * 15 / 10, "endorsed round pays clearly more");
    }
}
