# Design Document: ETH Test Faucet

## Overview

The ETH Test Faucet is a Solidity smart contract that distributes test ETH to developers on Ethereum test networks. The system implements rate limiting through cooldown periods, administrative controls for configuration, and secure fund management.

### Key Design Decisions

1. **Solidity Version**: Use Solidity 0.8.x or higher for built-in overflow/underflow protection
2. **Access Control**: Implement Ownable pattern for administrative functions
3. **Reentrancy Protection**: Use checks-effects-interactions pattern and ReentrancyGuard for external calls
4. **Gas Optimization**: Use efficient storage patterns and minimize state changes
5. **Event Emission**: Emit events for all state-changing operations for off-chain tracking

### Technology Stack

- **Smart Contract Language**: Solidity ^0.8.0
- **Development Framework**: Hardhat or Foundry
- **Testing Framework**: Hardhat (with Waffle) or Forge (Foundry)
- **Property-Based Testing**: Foundry's fuzzing capabilities or Echidna
- **Test Networks**: Sepolia, Goerli, or local Hardhat network

## Architecture

### Contract Structure

The faucet follows a single-contract architecture with clear separation of concerns:

```
EthTestFaucet (Main Contract)
├── State Variables
│   ├── owner (address)
│   ├── dripAmount (uint256)
│   ├── cooldownPeriod (uint256)
│   └── lastClaimTime (mapping: address => uint256)
├── Events
│   ├── Claim(address indexed requester, uint256 amount)
│   ├── Deposit(address indexed sender, uint256 amount)
│   ├── DripAmountUpdated(uint256 newAmount)
│   ├── CooldownPeriodUpdated(uint256 newPeriod)
│   └── Withdrawal(address indexed owner, uint256 amount)
├── Modifiers
│   └── onlyOwner()
├── Public Functions
│   ├── claim()
│   ├── canClaim(address)
│   ├── receive() / fallback()
│   └── View functions (getDripAmount, getCooldownPeriod, etc.)
└── Administrative Functions
    ├── setDripAmount(uint256)
    ├── setCooldownPeriod(uint256)
    └── withdraw(uint256)
```

### Security Patterns

1. **Checks-Effects-Interactions**: All external calls (ETH transfers) occur after state updates
2. **Access Control**: Owner-only functions protected by `onlyOwner` modifier
3. **Reentrancy Protection**: Use OpenZeppelin's ReentrancyGuard or manual guards
4. **Input Validation**: Validate all parameters before state changes
5. **Safe Math**: Leverage Solidity 0.8+ automatic overflow checks

### Design Patterns

1. **Ownable Pattern**: Single owner with administrative privileges
2. **Pull over Push**: Users initiate claims rather than automatic distribution
3. **Circuit Breaker**: Owner can withdraw funds if needed (emergency stop capability)
4. **Rate Limiting**: Time-based cooldown using block timestamps

## Components and Interfaces

### State Variables

```solidity
address public owner;
uint256 public dripAmount;
uint256 public cooldownPeriod;
mapping(address => uint256) public lastClaimTime;
```

### Events

```solidity
event Claim(address indexed requester, uint256 amount);
event Deposit(address indexed sender, uint256 amount);
event DripAmountUpdated(uint256 newAmount);
event CooldownPeriodUpdated(uint256 newPeriod);
event Withdrawal(address indexed owner, uint256 amount);
```

### Core Functions

#### claim()
```solidity
function claim() external nonReentrant
```
- **Purpose**: Allows users to request test ETH
- **Preconditions**: 
  - Caller must be past cooldown period
  - Contract must have sufficient balance
- **Effects**: 
  - Updates lastClaimTime for caller
  - Transfers dripAmount to caller
  - Emits Claim event
- **Access**: Public, any address

#### canClaim(address requester)
```solidity
function canClaim(address requester) external view returns (bool)
```
- **Purpose**: Check if an address is eligible to claim
- **Returns**: true if eligible, false otherwise
- **Logic**: 
  - Returns true if never claimed OR (current time >= last claim time + cooldown period)
- **Access**: Public view function

#### receive() / fallback()
```solidity
receive() external payable
fallback() external payable
```
- **Purpose**: Accept ETH deposits
- **Effects**: Emits Deposit event
- **Access**: Public, payable

### Administrative Functions

#### setDripAmount(uint256 newAmount)
```solidity
function setDripAmount(uint256 newAmount) external onlyOwner
```
- **Purpose**: Update the amount distributed per claim
- **Validation**: newAmount > 0
- **Effects**: Updates dripAmount, emits DripAmountUpdated event
- **Access**: Owner only

#### setCooldownPeriod(uint256 newPeriod)
```solidity
function setCooldownPeriod(uint256 newPeriod) external onlyOwner
```
- **Purpose**: Update the cooldown period between claims
- **Validation**: newPeriod > 0
- **Effects**: Updates cooldownPeriod, emits CooldownPeriodUpdated event
- **Access**: Owner only

#### withdraw(uint256 amount)
```solidity
function withdraw(uint256 amount) external onlyOwner nonReentrant
```
- **Purpose**: Allow owner to withdraw funds
- **Validation**: amount <= contract balance
- **Effects**: Transfers amount to owner, emits Withdrawal event
- **Access**: Owner only

### View Functions

```solidity
function getDripAmount() external view returns (uint256)
function getCooldownPeriod() external view returns (uint256)
function getOwner() external view returns (address)
function getBalance() external view returns (uint256)
function getLastClaimTime(address requester) external view returns (uint256)
```

## Data Models

### Claim Tracking

```solidity
mapping(address => uint256) public lastClaimTime;
```
- **Key**: Requester address
- **Value**: Block timestamp of last successful claim
- **Default**: 0 (indicates never claimed)

### Configuration Parameters

```solidity
struct FaucetConfig {
    uint256 dripAmount;      // Amount per claim (default: 0.1 ETH = 100000000000000000 wei)
    uint256 cooldownPeriod;  // Seconds between claims (default: 86400 = 24 hours)
}
```

Note: While we could use a struct, storing as separate state variables is more gas-efficient for individual updates.

### Constants

```solidity
uint256 public constant DEFAULT_DRIP_AMOUNT = 0.1 ether;
uint256 public constant DEFAULT_COOLDOWN_PERIOD = 24 hours;
```

## Error Handling

### Custom Errors (Gas-Efficient)

```solidity
error InsufficientBalance(uint256 requested, uint256 available);
error CooldownNotExpired(uint256 timeRemaining);
error Unauthorized(address caller);
error InvalidAmount(uint256 amount);
error TransferFailed(address recipient, uint256 amount);
```

### Error Conditions

1. **Insufficient Balance**: Thrown when contract balance < dripAmount during claim
2. **Cooldown Not Expired**: Thrown when user attempts to claim before cooldown expires
3. **Unauthorized**: Thrown when non-owner calls administrative functions
4. **Invalid Amount**: Thrown when setting dripAmount or cooldownPeriod to 0
5. **Transfer Failed**: Thrown when ETH transfer fails

### Error Recovery

- All errors revert the transaction, maintaining contract state integrity
- Users can query `canClaim()` before attempting to claim
- Owner can withdraw funds if contract needs to be deprecated
- Events provide audit trail for debugging

## Testing Strategy

### Dual Testing Approach

The testing strategy combines unit tests for specific scenarios and property-based tests for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and error conditions
- Specific claim scenarios with known addresses and amounts
- Boundary conditions (exact cooldown expiry, zero balance)
- Error cases (unauthorized access, insufficient funds)
- Event emission verification
- Integration between functions

**Property-Based Tests**: Verify universal properties across all inputs
- Use Foundry's built-in fuzzing or Echidna for property testing
- Generate random addresses, amounts, and time values
- Verify invariants hold across all valid inputs
- Each test runs minimum 100 iterations

### Property-Based Testing Configuration

- **Framework**: Foundry (Forge) with built-in fuzzing support
- **Iterations**: Minimum 100 runs per property test
- **Tagging**: Each property test includes a comment referencing the design property
- **Format**: `// Feature: eth-test-faucet, Property {number}: {property_text}`

### Test Coverage Areas

1. **Claim Functionality**: Successful claims, cooldown enforcement, balance checks
2. **Rate Limiting**: Cooldown period enforcement across multiple claims
3. **Administrative Controls**: Owner-only access, parameter updates
4. **Fund Management**: Deposits, withdrawals, balance tracking
5. **State Queries**: View function accuracy
6. **Edge Cases**: Zero balance, exact cooldown expiry, first-time claimers
7. **Security**: Reentrancy attempts, unauthorized access, integer boundaries

### Testing Tools

- **Hardhat**: For unit tests and integration tests
- **Foundry (Forge)**: For property-based testing and fuzzing
- **Echidna** (optional): Advanced property-based testing tool
- **Slither**: Static analysis for security vulnerabilities
- **Coverage**: Track test coverage with forge coverage or hardhat-coverage



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Successful Claim Transfers Drip Amount and Emits Event

*For any* eligible requester address and contract state with sufficient balance, when the requester calls claim(), the requester's balance SHALL increase by exactly the drip amount AND a Claim event SHALL be emitted with the requester address and drip amount.

**Validates: Requirements 1.1, 1.2**

### Property 2: Insufficient Balance Causes Claim Revert

*For any* requester address and contract state where the contract balance is less than the drip amount, calling claim() SHALL revert with an insufficient balance error.

**Validates: Requirements 1.4**

### Property 3: Claim Within Cooldown Period Reverts

*For any* requester address that has successfully claimed, attempting to claim again before the cooldown period expires SHALL revert with a cooldown error.

**Validates: Requirements 2.2**

### Property 4: Eligibility Check Reflects Cooldown Status

*For any* requester address, canClaim() SHALL return true if and only if either (a) the requester has never claimed, OR (b) the current block timestamp is greater than or equal to the requester's last claim timestamp plus the cooldown period.

**Validates: Requirements 2.4, 5.3, 5.4**

### Property 5: Deposit Increases Balance and Emits Event

*For any* sender address and positive ETH amount, when ETH is sent to the contract, the contract balance SHALL increase by exactly that amount AND a Deposit event SHALL be emitted with the sender address and amount.

**Validates: Requirements 3.1, 3.2**

### Property 6: Any Address Can Deposit

*For any* Ethereum address and positive ETH amount, that address SHALL be able to successfully send ETH to the contract without revert.

**Validates: Requirements 3.3**

### Property 7: Owner Can Update Drip Amount

*For any* positive uint256 value, when the owner calls setDripAmount() with that value, the drip amount SHALL be updated to that value AND a DripAmountUpdated event SHALL be emitted.

**Validates: Requirements 4.1**

### Property 8: Owner Can Update Cooldown Period

*For any* positive uint256 value, when the owner calls setCooldownPeriod() with that value, the cooldown period SHALL be updated to that value AND a CooldownPeriodUpdated event SHALL be emitted.

**Validates: Requirements 4.2**

### Property 9: Non-Owner Cannot Call Administrative Functions

*For any* address that is not the owner, calling setDripAmount(), setCooldownPeriod(), or withdraw() SHALL revert with an unauthorized error.

**Validates: Requirements 4.3**

### Property 10: Owner Withdrawal Transfers Funds

*For any* amount less than or equal to the contract balance, when the owner calls withdraw() with that amount, the owner's balance SHALL increase by that amount, the contract balance SHALL decrease by that amount, AND a Withdrawal event SHALL be emitted.

**Validates: Requirements 4.4**

### Property 11: Withdrawal Exceeding Balance Reverts

*For any* amount greater than the contract balance, when the owner calls withdraw() with that amount, the transaction SHALL revert with an insufficient balance error.

**Validates: Requirements 4.5**

### Property 12: State Getters Return Current Values

*For any* contract state, the public getter functions SHALL return the current values: getDripAmount() returns the current drip amount, getCooldownPeriod() returns the current cooldown period, getOwner() returns the owner address, and getBalance() returns the current contract ETH balance.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 13: Claim Records Timestamp

*For any* eligible requester who successfully claims, the lastClaimTime for that requester SHALL be set to the current block timestamp.

**Validates: Requirements 2.3**

### Property 14: Multiple Claims Maintain Invariants

*For any* sequence of valid claims by different requesters, the sum of all drip amounts transferred SHALL equal the decrease in contract balance, AND the number of Claim events emitted SHALL equal the number of successful claims.

**Validates: Requirements 1.1, 1.2 (invariant property)**

### Edge Cases

The following edge cases will be explicitly tested in property-based tests through appropriate input generation:

1. **First-time claimers** (Requirement 5.2): Requesters who have never claimed should always be eligible
2. **Exact cooldown expiry**: Claims at the exact moment cooldown expires should succeed
3. **Zero contract balance**: Claims should revert when contract has no funds
4. **Maximum uint256 values**: Administrative functions should handle large values correctly
5. **Concurrent claims**: Multiple requesters claiming in the same block should all succeed if funds available

