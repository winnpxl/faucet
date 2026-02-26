// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EthTestFaucet
 * @dev A faucet contract that distributes test ETH to users with rate limiting
 */
contract EthTestFaucet is Ownable, ReentrancyGuard {
    // State variables
    uint256 public dripAmount;
    uint256 public cooldownPeriod;
    mapping(address => uint256) public lastClaimTime;

    // Default values
    uint256 public constant DEFAULT_DRIP_AMOUNT = 0.1 ether;
    uint256 public constant DEFAULT_COOLDOWN_PERIOD = 24 hours;

    // Custom errors
    error InsufficientBalance(uint256 requested, uint256 available);
    error CooldownNotExpired(uint256 timeRemaining);
    error Unauthorized(address caller);
    error InvalidAmount(uint256 amount);
    error TransferFailed(address recipient, uint256 amount);

    // Events
    event Claim(address indexed requester, uint256 amount);
    event Deposit(address indexed sender, uint256 amount);
    event DripAmountUpdated(uint256 newAmount);
    event CooldownPeriodUpdated(uint256 newPeriod);
    event Withdrawal(address indexed owner, uint256 amount);

    /**
     * @dev Constructor sets default values for drip amount and cooldown period
     */
    constructor() Ownable(msg.sender) {
        dripAmount = DEFAULT_DRIP_AMOUNT;
        cooldownPeriod = DEFAULT_COOLDOWN_PERIOD;
    }

    /**
     * @dev Allows users to claim test ETH from the faucet
     * @notice Users must wait for the cooldown period between claims
     * Requirements:
     * - Caller must be past cooldown period
     * - Contract must have sufficient balance
     */
    function claim() external nonReentrant {
        // Checks: Verify cooldown period has expired
        uint256 lastClaim = lastClaimTime[msg.sender];
        if (lastClaim != 0 && block.timestamp < lastClaim + cooldownPeriod) {
            // Gas optimization: Use unchecked for safe arithmetic
            unchecked {
                uint256 timeRemaining = (lastClaim + cooldownPeriod) - block.timestamp;
                revert CooldownNotExpired(timeRemaining);
            }
        }

        // Checks: Verify contract has sufficient balance
        uint256 contractBalance = address(this).balance;
        if (contractBalance < dripAmount) {
            revert InsufficientBalance(dripAmount, contractBalance);
        }

        // Effects: Update state before external call
        lastClaimTime[msg.sender] = block.timestamp;

        // Interactions: Transfer ETH to requester
        (bool success, ) = msg.sender.call{value: dripAmount}("");
        if (!success) {
            revert TransferFailed(msg.sender, dripAmount);
        }

        // Emit event after successful transfer
        emit Claim(msg.sender, dripAmount);
    }

    /**
     * @dev Check if an address is eligible to claim
     * @param requester The address to check eligibility for
     * @return bool True if the address can claim, false otherwise
     * @notice Returns true if the requester has never claimed or if the cooldown period has expired
     */
    function canClaim(address requester) external view returns (bool) {
        uint256 lastClaim = lastClaimTime[requester];
        // Gas optimization: Use short-circuit evaluation instead of multiple returns
        return lastClaim == 0 || block.timestamp >= lastClaim + cooldownPeriod;
    }

    /**
     * @dev Receive function to accept ETH deposits
     */
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev Fallback function to accept ETH deposits
     */
    fallback() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev Allows the owner to update the drip amount
     * @param newAmount The new drip amount in wei
     * @notice Only the owner can call this function
     * Requirements:
     * - newAmount must be greater than 0
     */
    function setDripAmount(uint256 newAmount) external onlyOwner {
        // Validate input
        if (newAmount == 0) {
            revert InvalidAmount(newAmount);
        }

        // Update state
        dripAmount = newAmount;

        // Emit event
        emit DripAmountUpdated(newAmount);
    }

    /**
     * @dev Allows the owner to update the cooldown period
     * @param newPeriod The new cooldown period in seconds
     * @notice Only the owner can call this function
     * Requirements:
     * - newPeriod must be greater than 0
     */
    function setCooldownPeriod(uint256 newPeriod) external onlyOwner {
        // Validate input
        if (newPeriod == 0) {
            revert InvalidAmount(newPeriod);
        }

        // Update state
        cooldownPeriod = newPeriod;

        // Emit event
        emit CooldownPeriodUpdated(newPeriod);
    }

    /**
     * @dev Allows the owner to withdraw funds from the contract
     * @param amount The amount of ETH to withdraw in wei
     * @notice Only the owner can call this function
     * Requirements:
     * - amount must be less than or equal to contract balance
     */
    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        // Checks: Verify contract has sufficient balance
        uint256 contractBalance = address(this).balance;
        if (amount > contractBalance) {
            revert InsufficientBalance(amount, contractBalance);
        }

        // Interactions: Transfer ETH to owner
        (bool success, ) = owner().call{value: amount}("");
        if (!success) {
            revert TransferFailed(owner(), amount);
        }

        // Emit event after successful transfer
        emit Withdrawal(owner(), amount);
    }

    /**
     * @dev Returns the current drip amount
     * @return The amount of ETH distributed per claim
     */
    function getDripAmount() external view returns (uint256) {
        return dripAmount;
    }

    /**
     * @dev Returns the current cooldown period
     * @return The cooldown period in seconds
     */
    function getCooldownPeriod() external view returns (uint256) {
        return cooldownPeriod;
    }

    /**
     * @dev Returns the owner address
     * @return The address of the contract owner
     */
    function getOwner() external view returns (address) {
        return owner();
    }

    /**
     * @dev Returns the current contract balance
     * @return The ETH balance of the contract
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Returns the last claim time for a given address
     * @param requester The address to check
     * @return The timestamp of the last claim
     */
    function getLastClaimTime(address requester) external view returns (uint256) {
        return lastClaimTime[requester];
    }
}
