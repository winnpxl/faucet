# Sepolia Faucet

[![Solidity](https://img.shields.io/badge/Solidity-0.8.33-363636?logo=solidity)](https://soliditylang.org/)
[![Foundry](https://img.shields.io/badge/Built%20with-Foundry-FFDB1C)](https://getfoundry.sh/)
[![Tests](https://img.shields.io/badge/Tests-16%20passing-brightgreen)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**[Live Demo →](https://faucetgenerator-8hu0f5sve-titanwinner6-1334s-projects.vercel.app)**

A Web3 faucet application that lets users claim free Sepolia testnet ETH.
Built with Solidity, Foundry, and React.


# Sepolia Faucet

A Web3 faucet application that lets users claim free Sepolia testnet ETH. Built with Solidity, Foundry, and React.

## Live Contract

- **Network:** Ethereum Sepolia Testnet
- **Address:** `0x40aEed9B7Caa4C302a9f34fd76cd60681bdAC66A`
- **Verified on Etherscan:** https://sepolia.etherscan.io/address/0x40aEed9B7Caa4C302a9f34fd76cd60681bdAC66A

## Features

- Users can connect their wallet and claim 0.01 Sepolia ETH
- 1 minute cooldown per wallet address
- Owner controls: update drip amount, cooldown, and withdraw funds
- Fully tested with 16 passing tests
- Contract verified on Etherscan

## Tech Stack

- **Smart Contract:** Solidity 0.8.33
- **Development Framework:** Foundry (forge, anvil, cast)
- **Frontend:** React + TypeScript + Vite
- **Web3:** wagmi v2 + viem + RainbowKit
- **Network:** Ethereum Sepolia Testnet

## Project Structure
```
faucet/
├── faucet-contract/
│   ├── src/
│   │   └── Faucet.sol        # Main contract
│   ├── test/
│   │   └── Faucet.t.sol      # 16 unit tests
│   └── script/
│       └── DeployFaucet.s.sol # Deployment script
└── faucet-frontend/
    └── src/
        ├── App.tsx            # Main UI
        ├── faucetConfig.ts    # Contract address + ABI
        └── main.tsx           # Wagmi + RainbowKit setup
```

## Getting Started

### Contract
```bash
cd faucet-contract
forge build
forge test
```

### Frontend
```bash
cd faucet-frontend
npm install
npm run dev
```

Add a `.env` file in `faucet-contract/` with:
```
SEPOLIA_RPC_URL=your_alchemy_sepolia_url
PRIVATE_KEY=0xyour_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Contract Overview
```solidity
function claim() external          // Claim 0.01 ETH (1 min cooldown)
function getBalance() external     // Check faucet balance
function getTimeUntilNextClaim()   // Check your cooldown
function setDripAmount()           // Owner: update drip amount
function setCooldown()             // Owner: update cooldown
function withdraw()                // Owner: withdraw all funds
```