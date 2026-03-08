// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Faucet.sol";

contract DeployFaucet is Script {
    function run() external returns (Faucet) {
        vm.startBroadcast();

        Faucet faucet = new Faucet();

        console.log("Faucet deployed at:", address(faucet));
        console.log("Owner:", faucet.owner());

        vm.stopBroadcast();

        return faucet;
    }
}