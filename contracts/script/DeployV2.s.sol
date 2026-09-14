// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {MainLauncher} from "../src/MainLauncher.sol";
import {TreasurySplit} from "../src/TreasurySplit.sol";
import {BuybackVault} from "../src/BuybackVault.sol";
import {IPonsV2LaunchFactory} from "../src/interfaces/IPons.sol";

/**
 * Production fee model, 2026-09-14:
 *   platform coins 3.5%: KOL 1.0, launcher 0.5, buyback&burn 0.5, founder 1.2, Pons 0.3
 *   $MAIN 3.6%:          team 1.0, founder 1.8, buyback&burn 0.5, Pons 0.3  (via launchWithShares)
 *
 *   cd contracts
 *   $env:DEPLOYER_PK = Read-Host "Privat nyckel"     (PowerShell)
 *   forge script script/DeployV2.s.sol --rpc-url robinhood --broadcast
 */
contract DeployV2 is Script {
    IPonsV2LaunchFactory constant PONS = IPonsV2LaunchFactory(0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e);
    address constant FOUNDER = 0x5Bc6884BAb4f2Ae87A2F18c3180C8B4E2Bfbb070;
    address constant SIGNER = 0x5332A888A09b128Bf84e2ce75634CCb60026CF62;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        address owner = vm.addr(pk);

        vm.startBroadcast(pk);
        BuybackVault vault = new BuybackVault(owner, PONS);

        address[] memory a = new address[](2);
        a[0] = address(vault);
        a[1] = FOUNDER;
        uint96[] memory w = new uint96[](2);
        w[0] = 5; // 0.5%
        w[1] = 12; // 1.2%
        TreasurySplit treasury = new TreasurySplit(owner, a, w);

        MainLauncher main = new MainLauncher(
            PONS,
            address(treasury),
            SIGNER,
            MainLauncher.Shares({kolBps: 3125, endorsedKolBps: 3125, launcherBps: 1563, creatorTaxBps: 250})
        );
        vm.stopBroadcast();

        console2.log("MainLauncher  ", address(main));
        console2.log("TreasurySplit ", address(treasury));
        console2.log("BuybackVault  ", address(vault));
        console2.log("Splitter impl ", main.splitterImplementation());
        console2.log("owner         ", owner);
    }
}
