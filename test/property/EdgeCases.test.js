import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Feature: eth-test-faucet, Property Edge Cases: Comprehensive Edge Case Testing
// Test first-time claimers, exact cooldown expiry timing, zero contract balance scenarios,
// maximum uint256 values for administrative functions, and concurrent claims in same block.
// **Validates: Requirements 5.2, 1.4, 4.1, 4.2, 1.1**

describe("Property Edge Cases: Comprehensive Edge Case Testing", function () {
  let EthTestFaucet;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    EthTestFaucet = await ethers.getContractFactory("EthTestFaucet");
  });

  describe("First-time claimers (never claimed before)", function () {
    it("should allow first-time claimers to claim successfully regardless of address type (property test with 100+ iterations)", async function () {
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        const faucet = await EthTestFaucet.deploy();
        await faucet.waitForDeployment();
        const faucetAddres