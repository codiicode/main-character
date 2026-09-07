// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {MainLauncher} from "../src/MainLauncher.sol";
import {IPonsV2LaunchFactory} from "../src/interfaces/IPons.sol";

/**
 * Deploys MainLauncher (and its MainSplitter implementation) to Robinhood Chain.
 *
 *   cd contracts
 *   export DEPLOYER_PK=0x...          # wallet with ~0.01 ETH on Robinhood Chain
 *   export TREASURY=0x...            # where MAIN's share goes
 *   export SIGNER=0x...              # backend key that sets endorsements / KOL wallets
 *   forge script script/Deploy.s.sol --rpc-url robinhood --broadcast --verify \
 *     --verifier blockscout --verifier-url https://robinhoodchain.blockscout.com/api
 */
contract Deploy is Script {
    IPonsV2LaunchFactory constant PONS = IPonsV2LaunchFactory(0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e);

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        address treasury = vm.envAddress("TREASURY");
        address signer = vm.envAddress("SIGNER");

        vm.startBroadcast(pk);
        MainLauncher main = new MainLauncher(
            PONS,
            treasury,
            signer,
            MainLauncher.Shares({kolBps: 2703, endorsedKolBps: 5405, launcherBps: 1351, creatorTaxBps: 300})
        );
        vm.stopBroadcast();

        console2.log("MainLauncher", address(main));
        console2.log("MainSplitter impl", main.splitterImplementation());
        console2.log("treasury", treasury);
        console2.log("signer", signer);
    }
}
