import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Feature: eth-test-faucet, Property 5: Deposit Increases Balance and Emits Event
// For any sender address and positive ETH amount, when ETH is sent to the contract,
// the contract balance SHALL increase by exactly that amount AND a Deposit event
// SHALL be emitted with the sender address and amount.
// **Validates: Requirements 3.1, 3.2**

describe("Property 5: Deposit Increases Balance and Emits Event", function () {
  let EthTestFaucet;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    EthTestFaucet = await ethers.getContractFactory("EthTestFaucet");
  });

  it("should increase contract balance by exact deposit amount and emit Deposit event (property test with 100+ iterations)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      // Deploy fresh contract for each iteration
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Get a random signer to act as depositor
      const signers = await ethers.getSigners();
      const depositorIndex = i % signers.length;
      const depositor = signers[depositorIndex];
      
      // Generate pseudo-random ETH amount between 0.001 and 10 ETH
      const depositAmount = ethers.parseEther(
        (Math.random() * 9.999 + 0.001).toFixed(18)
      );
      
      // Record contract balance before deposit
      const balanceBefore = await ethers.provider.getBalance(faucetAddress);
      
      // Property: When ETH is sent to contract, balance increases by exact amount
      const tx = await depositor.sendTransaction({
        to: faucetAddress,
        value: depositAmount,
      });
      await tx.wait();
      
      // Get contract balance after deposit
      const balanceAfter = await ethers.provider.getBalance(faucetAddress);
      
      // Property verification: Balance increased by exactly deposit amount
      expect(balanceAfter).to.equal(balanceBefore + depositAmount);
      
      // Property verification: Deposit event emitted with correct parameters
      await expect(tx)
        .to.emit(faucet, "Deposit")
        .withArgs(depositor.address, depositAmount);
    }
  });

  it("should handle multiple deposits to same contract (property test)", async function () {
    // Deploy single contract
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    
    let expectedBalance = 0n;
    const signers = await ethers.getSigners();
    
    // Perform 50 deposits from various addresses
    for (let i = 0; i < 50; i++) {
      const depositor = signers[i % signers.length];
      
      // Generate random deposit amount
      const depositAmount = ethers.parseEther(
        (Math.random() * 1 + 0.01).toFixed(18)
      );
      
      // Record balance before
      const balanceBefore = await ethers.provider.getBalance(faucetAddress);
      
      // Execute deposit
      const tx = await depositor.sendTransaction({
        to: faucetAddress,
        value: depositAmount,
      });
      await tx.wait();
      
      // Update expected balance
      expectedBalance = balanceBefore + depositAmount;
      
      // Property: Balance increases by exact deposit amount
      const balanceAfter = await ethers.provider.getBalance(faucetAddress);
      expect(balanceAfter).to.equal(expectedBalance);
      
      // Property: Event emitted with correct data
      await expect(tx)
        .to.emit(faucet, "Deposit")
        .withArgs(depositor.address, depositAmount);
    }
  });

  it("should emit Deposit event for any sender address (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Get different sender for each iteration
      const signers = await ethers.getSigners();
      const sender = signers[i % signers.length];
      
      // Use varying deposit amounts
      const depositAmount = ethers.parseEther(
        (Math.random() * 5 + 0.001).toFixed(18)
      );
      
      // Property: Deposit event SHALL be emitted with sender address and amount
      const tx = await sender.sendTransaction({
        to: faucetAddress,
        value: depositAmount,
      });
      
      await expect(tx)
        .to.emit(faucet, "Deposit")
        .withArgs(sender.address, depositAmount);
    }
  });

  it("should maintain balance consistency across sequential deposits (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    
    const signers = await ethers.getSigners();
    let cumulativeBalance = 0n;
    
    // Test with 100 sequential deposits
    for (let i = 0; i < 100; i++) {
      const depositor = signers[i % signers.length];
      
      // Generate random deposit amount
      const depositAmount = ethers.parseEther(
        (Math.random() * 0.5 + 0.001).toFixed(18)
      );
      
      // Execute deposit
      await depositor.sendTransaction({
        to: faucetAddress,
        value: depositAmount,
      });
      
      // Update cumulative balance
      cumulativeBalance += depositAmount;
      
      // Property: Contract balance equals sum of all deposits
      const actualBalance = await ethers.provider.getBalance(faucetAddress);
      expect(actualBalance).to.equal(cumulativeBalance);
    }
  });

  it("should handle deposits of varying sizes (property test)", async function () {
    const iterations = 100;
    
    // Test with different deposit size ranges
    const testRanges = [
      { min: 0.001, max: 0.01 },   // Small deposits
      { min: 0.01, max: 0.1 },     // Medium deposits
      { min: 0.1, max: 1 },        // Large deposits
      { min: 1, max: 10 },         // Very large deposits
    ];
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Select a random range
      const range = testRanges[i % testRanges.length];
      
      // Generate deposit amount within range
      const depositAmount = ethers.parseEther(
        (Math.random() * (range.max - range.min) + range.min).toFixed(18)
      );
      
      const signers = await ethers.getSigners();
      const depositor = signers[i % signers.length];
      
      const balanceBefore = await ethers.provider.getBalance(faucetAddress);
      
      // Execute deposit
      const tx = await depositor.sendTransaction({
        to: faucetAddress,
        value: depositAmount,
      });
      await tx.wait();
      
      const balanceAfter = await ethers.provider.getBalance(faucetAddress);
      
      // Property: Balance increases by exact amount regardless of deposit size
      expect(balanceAfter).to.equal(balanceBefore + depositAmount);
      
      // Property: Event emitted correctly
      await expect(tx)
        .to.emit(faucet, "Deposit")
        .withArgs(depositor.address, depositAmount);
    }
  });

  it("should handle deposits from owner and non-owner addresses (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    
    const signers = await ethers.getSigners();
    const ownerAddress = await faucet.getOwner();
    
    // Test 50 deposits from various addresses including owner
    for (let i = 0; i < 50; i++) {
      const depositor = signers[i % signers.length];
      
      const depositAmount = ethers.parseEther(
        (Math.random() * 1 + 0.01).toFixed(18)
      );
      
      const balanceBefore = await ethers.provider.getBalance(faucetAddress);
      
      // Property: Both owner and non-owner can deposit
      const tx = await depositor.sendTransaction({
        to: faucetAddress,
        value: depositAmount,
      });
      await tx.wait();
      
      const balanceAfter = await ethers.provider.getBalance(faucetAddress);
      
      // Property: Balance increases correctly regardless of depositor
      expect(balanceAfter).to.equal(balanceBefore + depositAmount);
      
      // Property: Event emitted with correct depositor address
      await expect(tx)
        .to.emit(faucet, "Deposit")
        .withArgs(depositor.address, depositAmount);
    }
  });

  it("should verify getBalance() returns correct value after deposits (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      const signers = await ethers.getSigners();
      const depositor = signers[i % signers.length];
      
      const depositAmount = ethers.parseEther(
        (Math.random() * 5 + 0.001).toFixed(18)
      );
      
      // Execute deposit
      await depositor.sendTransaction({
        to: faucetAddress,
        value: depositAmount,
      });
      
      // Property: getBalance() returns exact contract balance
      const contractBalance = await faucet.getBalance();
      const providerBalance = await ethers.provider.getBalance(faucetAddress);
      
      expect(contractBalance).to.equal(depositAmount);
      expect(contractBalance).to.equal(providerBalance);
    }
  });
});
