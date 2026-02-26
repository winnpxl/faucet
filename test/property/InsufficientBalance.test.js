import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Feature: eth-test-faucet, Property 2: Insufficient Balance Causes Claim Revert
// For any requester address and contract state where the contract balance is less than
// the drip amount, calling claim() SHALL revert with an insufficient balance error.
// **Validates: Requirements 1.4**

describe("Property 2: Insufficient Balance Causes Claim Revert", function () {
  let EthTestFaucet;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    EthTestFaucet = await ethers.getContractFactory("EthTestFaucet");
  });

  it("should revert with InsufficientBalance when contract balance is less than drip amount (property test with 100+ iterations)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      // Deploy fresh contract for each iteration
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Get a random signer to act as requester
      const signers = await ethers.getSigners();
      const requesterIndex = (i % (signers.length - 1)) + 1; // Skip owner at index 0
      const requester = signers[requesterIndex];
      
      // Get drip amount from contract (default 0.1 ETH)
      const dripAmount = await faucet.getDripAmount();
      
      // Fund the faucet with insufficient balance (less than drip amount)
      // Generate random amount between 0 and (dripAmount - 1 wei)
      const maxInsufficient = dripAmount - 1n;
      const randomFactor = Math.random();
      const insufficientAmount = BigInt(Math.floor(Number(maxInsufficient) * randomFactor));
      
      if (insufficientAmount > 0n) {
        await owner.sendTransaction({
          to: faucetAddress,
          value: insufficientAmount,
        });
      }
      
      // Verify contract balance is less than drip amount
      const contractBalance = await ethers.provider.getBalance(faucetAddress);
      expect(contractBalance).to.be.lt(dripAmount);
      
      // Property: Calling claim() SHALL revert with InsufficientBalance error
      await expect(faucet.connect(requester).claim())
        .to.be.revertedWithCustomError(faucet, "InsufficientBalance")
        .withArgs(dripAmount, contractBalance);
    }
  });

  it("should revert with InsufficientBalance when contract has zero balance (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      // Deploy fresh contract with zero balance
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      
      // Get a random requester
      const signers = await ethers.getSigners();
      const requester = signers[(i % (signers.length - 1)) + 1];
      
      // Verify contract balance is zero
      const contractBalance = await faucet.getBalance();
      expect(contractBalance).to.equal(0n);
      
      const dripAmount = await faucet.getDripAmount();
      
      // Property: Claim should revert with InsufficientBalance
      await expect(faucet.connect(requester).claim())
        .to.be.revertedWithCustomError(faucet, "InsufficientBalance")
        .withArgs(dripAmount, 0n);
    }
  });

  it("should revert after contract balance becomes insufficient due to previous claims (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      const dripAmount = await faucet.getDripAmount();
      
      // Fund contract with exactly enough for one claim plus a small insufficient amount
      // This tests the boundary condition
      const randomExtra = BigInt(Math.floor(Math.random() * Number(dripAmount - 1n)));
      const fundAmount = dripAmount + randomExtra;
      
      await owner.sendTransaction({
        to: faucetAddress,
        value: fundAmount,
      });
      
      // Get two different requesters
      const signers = await ethers.getSigners();
      const requester1 = signers[1];
      const requester2 = signers[2];
      
      // First claim should succeed
      await faucet.connect(requester1).claim();
      
      // After first claim, balance should be insufficient for second claim
      const remainingBalance = await faucet.getBalance();
      expect(remainingBalance).to.be.lt(dripAmount);
      
      // Property: Second claim should revert with InsufficientBalance
      await expect(faucet.connect(requester2).claim())
        .to.be.revertedWithCustomError(faucet, "InsufficientBalance")
        .withArgs(dripAmount, remainingBalance);
    }
  });

  it("should revert with correct error parameters for various insufficient balances (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      const dripAmount = await faucet.getDripAmount();
      
      // Generate various insufficient amounts across the range
      const percentage = i / iterations; // 0 to ~1
      const insufficientAmount = BigInt(Math.floor(Number(dripAmount - 1n) * percentage));
      
      if (insufficientAmount > 0n) {
        await owner.sendTransaction({
          to: faucetAddress,
          value: insufficientAmount,
        });
      }
      
      const contractBalance = await faucet.getBalance();
      
      // Get requester
      const signers = await ethers.getSigners();
      const requester = signers[(i % (signers.length - 1)) + 1];
      
      // Property: Error should contain correct requested and available amounts
      await expect(faucet.connect(requester).claim())
        .to.be.revertedWithCustomError(faucet, "InsufficientBalance")
        .withArgs(dripAmount, contractBalance);
    }
  });

  it("should revert for any requester when balance is insufficient (property test)", async function () {
    // Deploy single contract with insufficient balance
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    
    const dripAmount = await faucet.getDripAmount();
    
    // Fund with half the drip amount
    const insufficientAmount = dripAmount / 2n;
    await owner.sendTransaction({
      to: faucetAddress,
      value: insufficientAmount,
    });
    
    const contractBalance = await faucet.getBalance();
    
    // Test with multiple different requesters
    const signers = await ethers.getSigners();
    const numRequesters = Math.min(20, signers.length - 1);
    
    for (let i = 0; i < numRequesters; i++) {
      const requester = signers[i + 1]; // Skip owner
      
      // Property: ALL requesters should be unable to claim when balance is insufficient
      await expect(faucet.connect(requester).claim())
        .to.be.revertedWithCustomError(faucet, "InsufficientBalance")
        .withArgs(dripAmount, contractBalance);
    }
  });

  it("should revert even for first-time claimers when balance is insufficient (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Get a unique requester
      const signers = await ethers.getSigners();
      const requester = signers[(i % (signers.length - 1)) + 1];
      
      // Verify requester has never claimed
      const lastClaimTime = await faucet.getLastClaimTime(requester.address);
      expect(lastClaimTime).to.equal(0n);
      
      const dripAmount = await faucet.getDripAmount();
      
      // Fund with insufficient amount
      const insufficientAmount = dripAmount - 1n - BigInt(i % Number(dripAmount - 1n));
      
      if (insufficientAmount > 0n) {
        await owner.sendTransaction({
          to: faucetAddress,
          value: insufficientAmount,
        });
      }
      
      const contractBalance = await faucet.getBalance();
      
      // Property: Even first-time claimers cannot claim with insufficient balance
      await expect(faucet.connect(requester).claim())
        .to.be.revertedWithCustomError(faucet, "InsufficientBalance")
        .withArgs(dripAmount, contractBalance);
    }
  });
});
