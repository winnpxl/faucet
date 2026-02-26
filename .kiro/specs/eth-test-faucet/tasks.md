# Implementation Plan: ETH Test Faucet

## Overview

This implementation plan breaks down the ETH Test Faucet smart contract into discrete coding tasks. The contract will be built using Solidity ^0.8.0 with Hardhat or Foundry as the development framework. Tasks are organized to build incrementally, starting with core infrastructure, then implementing main functionality, and finally adding administrative controls and testing.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Initialize Hardhat or Foundry project
  - Install OpenZeppelin contracts for Ownable and ReentrancyGuard
  - Configure Solidity compiler version (^0.8.0)
  - Set up test network configuration (Sepolia/Goerli/local)
  - Create directory structure for contracts and tests
  - _Requirements: All (infrastructure)_

- [ ] 2. Implement core contract structure and state variables
  - [x] 2.1 Create EthTestFaucet.sol with basic structure
    - Define contract with Ownable and ReentrancyGuard inheritance
    - Declare state variables: owner, dripAmount, cooldownPeriod, lastClaimTime mapping
    - Set default values: 0.1 ETH for dripAmount, 24 hours for cooldownPeriod
    - Define custom errors: InsufficientBalance, CooldownNotExpired, Unauthorized, InvalidAmount, TransferFailed
    - Define events: Claim, Deposit, DripAmountUpdated, CooldownPeriodUpdated, Withdrawal
    - _Requirements: 1.3, 2.1, 4.1, 4.2, 6.1, 6.2, 6.3_
  
  - [x] 2.2 Write property test for state initialization
    - **Property 12: State Getters Return Current Values**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [ ] 3. Implement claim functionality
  - [x] 3.1 Implement claim() function
    - Add nonReentrant modifier
    - Check cooldown period eligibility (revert if within cooldown)
    - Check contract balance >= dripAmount (revert if insufficient)
    - Update lastClaimTime[msg.sender] to block.timestamp
    - Transfer dripAmount to msg.sender using call
    - Emit Claim event with requester address and amount
    - _Requirements: 1.1, 1.2, 1.4, 2.2, 2.3_
  
  - [x] 3.2 Write property test for successful claim
    - **Property 1: Successful Claim Transfers Drip Amount and Emits Event**
    - **Validates: Requirements 1.1, 1.2**
  
  - [x] 3.3 Write property test for insufficient balance
    - **Property 2: Insufficient Balance Causes Claim Revert**
    - **Validates: Requirements 1.4**
  
  - [x] 3.4 Write property test for cooldown enforcement
    - **Property 3: Claim Within Cooldown Period Reverts**
    - **Validates: Requirements 2.2**
  
  - [x] 3.5 Write property test for timestamp recording
    - **Property 13: Claim Records Timestamp**
    - **Validates: Requirements 2.3**

- [ ] 4. Implement eligibility checking
  - [x] 4.1 Implement canClaim(address) view function
    - Return true if lastClaimTime[requester] == 0 (never claimed)
    - Return true if block.timestamp >= lastClaimTime[requester] + cooldownPeriod
    - Return false otherwise
    - _Requirements: 2.4, 5.1, 5.2, 5.3, 5.4_
  
  - [x] 4.2 Write property test for eligibility check
    - **Property 4: Eligibility Check Reflects Cooldown Status**
    - **Validates: Requirements 2.4, 5.3, 5.4**

- [ ] 5. Checkpoint - Ensure core claim functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement fund management
  - [x] 6.1 Implement receive() and fallback() functions
    - Mark as external payable
    - Emit Deposit event with msg.sender and msg.value
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 6.2 Write property test for deposits
    - **Property 5: Deposit Increases Balance and Emits Event**
    - **Validates: Requirements 3.1, 3.2**
  
  - [x] 6.3 Write property test for deposit accessibility
    - **Property 6: Any Address Can Deposit**
    - **Validates: Requirements 3.3**

- [ ] 7. Implement administrative controls
  - [x] 7.1 Implement setDripAmount(uint256) function
    - Add onlyOwner modifier
    - Validate newAmount > 0 (revert with InvalidAmount if not)
    - Update dripAmount state variable
    - Emit DripAmountUpdated event
    - _Requirements: 4.1_
  
  - [x] 7.2 Implement setCooldownPeriod(uint256) function
    - Add onlyOwner modifier
    - Validate newPeriod > 0 (revert with InvalidAmount if not)
    - Update cooldownPeriod state variable
    - Emit CooldownPeriodUpdated event
    - _Requirements: 4.2_
  
  - [x] 7.3 Implement withdraw(uint256) function
    - Add onlyOwner and nonReentrant modifiers
    - Validate amount <= address(this).balance (revert with InsufficientBalance if not)
    - Transfer amount to owner using call
    - Emit Withdrawal event
    - _Requirements: 4.4, 4.5_
  
  - [x] 7.4 Write property test for drip amount updates
    - **Property 7: Owner Can Update Drip Amount**
    - **Validates: Requirements 4.1**
  
  - [x] 7.5 Write property test for cooldown period updates
    - **Property 8: Owner Can Update Cooldown Period**
    - **Validates: Requirements 4.2**
  
  - [x] 7.6 Write property test for access control
    - **Property 9: Non-Owner Cannot Call Administrative Functions**
    - **Validates: Requirements 4.3**
  
  - [x] 7.7 Write property test for owner withdrawal
    - **Property 10: Owner Withdrawal Transfers Funds**
    - **Validates: Requirements 4.4**
  
  - [x] 7.8 Write property test for withdrawal limits
    - **Property 11: Withdrawal Exceeding Balance Reverts**
    - **Validates: Requirements 4.5**

- [ ] 8. Implement view functions
  - [x] 8.1 Implement public getter functions
    - getDripAmount() returns dripAmount
    - getCooldownPeriod() returns cooldownPeriod
    - getOwner() returns owner
    - getBalance() returns address(this).balance
    - getLastClaimTime(address) returns lastClaimTime[address]
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 9. Checkpoint - Ensure all core functionality is complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Write comprehensive property tests for invariants
  - [x] 10.1 Write property test for multiple claims invariant
    - **Property 14: Multiple Claims Maintain Invariants**
    - **Validates: Requirements 1.1, 1.2**
  
  - [x] 10.2 Write property test for edge cases
    - Test first-time claimers (never claimed before)
    - Test exact cooldown expiry timing
    - Test zero contract balance scenarios
    - Test maximum uint256 values for administrative functions
    - Test concurrent claims in same block
    - _Requirements: 5.2, 1.4, 4.1, 4.2, 1.1_

- [ ] 11. Run security analysis and optimization
  - [x] 11.1 Run Slither static analysis
    - Fix any high or medium severity issues found
    - Document any false positives
  
  - [x] 11.2 Optimize gas usage
    - Review storage patterns
    - Minimize state changes
    - Optimize function ordering
  
  - [x] 11.3 Test reentrancy protection
    - Create malicious contract attempting reentrancy on claim()
    - Create malicious contract attempting reentrancy on withdraw()
    - Verify both attacks fail

- [ ] 12. Create deployment script
  - [-] 12.1 Write deployment script
    - Deploy EthTestFaucet contract
    - Set initial owner
    - Verify deployment on test network
    - Log contract address and configuration
    - _Requirements: All (deployment)_
  
  - [ ] 12.2 Write deployment tests
    - Test deployment with different initial parameters
    - Verify owner is set correctly
    - Verify default values are correct

- [ ] 13. Final checkpoint - Complete testing and verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use Foundry's fuzzing with minimum 100 iterations per test
- The contract uses OpenZeppelin's Ownable and ReentrancyGuard for security
- All ETH transfers use the call pattern for security
- Custom errors are used for gas efficiency (Solidity 0.8+)
- Checkpoints ensure incremental validation throughout development
