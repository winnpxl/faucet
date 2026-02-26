# ETH Test Faucet

A smart contract system that distributes test ETH to users on Ethereum test networks with rate limiting and administrative controls.

## Features

- **ETH Distribution**: Users can claim a fixed amount of test ETH
- **Rate Limiting**: 24-hour cooldown period between claims per address
- **Administrative Controls**: Owner can configure drip amount, cooldown period, and withdraw funds
- **Fund Management**: Anyone can deposit ETH to keep the faucet operational
- **Eligibility Queries**: Check if an address can claim before attempting

## Technology Stack

- Solidity ^0.8.0
- Hardhat development environment
- OpenZeppelin contracts (Ownable, ReentrancyGuard)
- Hardhat testing framework

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your:
- RPC URLs for test networks (Sepolia, Goerli)
- Private key for deployment
- Etherscan API key for contract verification

## Usage

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Deploy

Deploy to local Hardhat network:
```bash
npm run deploy:local
```

Deploy to Sepolia testnet:
```bash
npm run deploy:sepolia
```

Deploy to Goerli testnet:
```bash
npm run deploy:goerli
```

## Contract Interface

### User Functions

- `claim()`: Request test ETH from the faucet
- `canClaim(address)`: Check if an address is eligible to claim
- `receive()`: Deposit ETH to the faucet

### Administrative Functions (Owner Only)

- `setDripAmount(uint256)`: Update the amount distributed per claim
- `setCooldownPeriod(uint256)`: Update the cooldown period between claims
- `withdraw(uint256)`: Withdraw funds from the faucet

### View Functions

- `getDripAmount()`: Get current drip amount
- `getCooldownPeriod()`: Get current cooldown period
- `getOwner()`: Get owner address
- `getBalance()`: Get contract ETH balance
- `getLastClaimTime(address)`: Get last claim timestamp for an address

## Default Configuration

- **Drip Amount**: 0.1 ETH
- **Cooldown Period**: 24 hours (86400 seconds)

## Security

The contract implements:
- OpenZeppelin's Ownable for access control
- OpenZeppelin's ReentrancyGuard for reentrancy protection
- Checks-effects-interactions pattern
- Solidity 0.8+ automatic overflow/underflow protection

## License

ISC
