import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Feature: eth-test-faucet, Property 6: Any Address Can Deposit
// For any Ethereum address and positive ETH amount, that address SHALL be able to
// successfully send ETH to the contract without revert.
// **Validates: Requirements 3.3**

describe("Property 6: Any Address Can Deposit", function () {
  let EthTestFaucet;

  beforeEach(async function () {
    EthTestFaucet = await ethers.getContractFactory("EthTestFaucet");
  });

  it("should allow any address to deposit ETH without revert (property test with 100+ iterations)", async function () {
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
      
      // Generate pseudo-random positive ETH amount between 0.001 and 5 ETH
      const depositAmount = ethers.parseEther(
        (Math.random() * 4.999 + 0.001).toFixed(18)
      );
      
      // Property: Any address SHALL be able to send ETH without revert
      const tx = depositor.sendTransaction({
        to: faucetAddress,
        value: depositAmount,
      });
      
      // Verify transaction does not revert
      await expect(tx).to.not.be.reverted;
      
      // Verify deposit was successful by checking balance
      const balance = await ethers.provider.getBalance(faucetAddress);
      expect(balance).to.equal(depositAmount);
    }
  });

  it("should allow deposits from any address including owner and non-owners (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    
    const signers = await ethers.getSigners();
    const ownerAddress = await faucet.getOwner();
    
    // Test 100 deposits from various addresses
    for (let i = 0; i < 100; i++) {
      const depositor = signers[i % signers.length];
      
      // Generate random positive deposit amount
      const depositAmount = ethers.parseEther(
        (Math.random() * 1 + 0.001).toFixed(18)
      );
      
      // Property: Both owner and non-owner addresses can deposit
      const tx = depositor.sendTransaction({
        to: faucetAddress,
        value: depositAmount,
      });
      
      // Verify no revert occurs
      await expect(tx).to.not.be.reverted;
      
      // Verify deposit was accepted
      const receipt = await (await tx).wait();
      expect(receipt.status).to.equal(1); // Transaction successful
    }
  });

  it("should accept deposits of varying positive amounts from any address (property test)", async function () {
    const iterations = 100;
    
    // Test with different deposit size ranges
    const testRanges = [
      { min: 0.001, max: 0.01 },   // Very small deposits
      { min: 0.01, max: 0.1 },     // Small deposits
      { min: 0.1, max: 1 },        // Medium deposits
      { min: 1, max: 10 },         // Large deposits
    ];
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Select a random range
      const range = testRanges[i % testRanges.length];
      
      // Generate positive deposit amount within range
      const depositAmount = ethers.parseEther(
        (Math.random() * (range.max - range.min) + range.min).toFixed(18)
      );
      
      const signers = await ethers.getSigners();
      const depositor = signers[i % signers.length];
      
      // Property: Any positive amount can be deposited without revert
      const tx = depositor.sendTransaction({
        to: faucetAddress,
        value: depositAmount,
      });
      
      await expect(tx).to.not.be.reverted;
      
      // Verify deposit succeeded
      const balance = await ethers.provider.getBalance(faucetAddress);
      expect(balance).to.equal(depositAmount);
    }
  });

  it("should allow sequential deposits from different addresses (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    
    const signers = await ethers.getSigners();
    
    // Test 100 sequential deposits from various addresses
    for (let i = 0; i < 100; i++) {
      const depositor = signers[i % signers.length];
      
      // Generate random positive deposit amount
      const depositAmount = ethers.parseEther(
        (Math.random() * 0.5 + 0.001).toFixed(18)
      );
      
      // Property: Any address can deposit at any time
      const tx = depositor.sendTransaction({
        to: faucetAddress,
        value: depositAmount,
      });
      
      await expect(tx).to.not.be.reverted;
    }
  });

  it("should allow the same address to deposit multiple times (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    
    const signers = await ethers.getSigners();
    
    // Test multiple deposits from same addresses
    for (let i = 0; i < 100; i++) {
      // Use only first 5 signers, so they deposit multiple times
      const depositor = signers[i % 5];
      
      // Generate random positive deposit amount
      const depositAmount = ethers.parseEther(
        (Math.random() * 0.3 + 0.001).toFixed(18)
      );
      
      // Property: Same address can deposit multiple times without restriction
      const tx = depositor.sendTransaction({
        to: faucetAddress,
        value: depositAmount,
      });
      
      await expect(tx).to.not.be.reverted;
    }
  });

  it("should accept deposits via both receive and fallback functions (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      const signers = await ethers.getSigners();
      const depositor = signers[i % signers.length];
      
      // Generate random positive deposit amount
      const depositAmount = ethers.parseEther(
        (Math.random() * 2 + 0.001).toFixed(18)
      );
      
      // Alternate between sending with no data (receive) and with data (fallback)
      const txData = i % 2 === 0 ? undefined : "0x1234";
      
      // Property: Deposits work via both receive and fallback
      const tx = depositor.sendTransaction({
        to: faucetAddress,
        value: depositAmount,
        data: txData,
      });
      
      await expect(tx).to.not.be.reverted;
      
      // Verify deposit was accepted
      const balance = await ethers.provider.getBalance(faucetAddress);
      expect(balance).to.equal(depositAmount);
    }
  });

  it("should allow deposits from addresses with varying balances (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    
    const signers = await ethers.getSigners();
    
    // Test 100 deposits from addresses with different balances
    for (let i = 0; i < 100; i++) {
      const depositor = signers[i % signers.length];
      
      // Get depositor's current balance
      const depositorBalance = await ethers.provider.getBalance(depositor.address);
      
      // Generate deposit amount that's a small fraction of their balance
      // to ensure they can afford it
      const maxDeposit = depositorBalance / 100n; // 1% of balance
      const depositAmount = maxDeposit > ethers.parseEther("0.001") 
        ? ethers.parseEther((Math.random() * 0.1 + 0.001).toFixed(18))
        : ethers.parseEther("0.001");
      
      // Property: Any address with sufficient balance can deposit
      const tx = depositor.sendTransaction({
        to: faucetAddress,
        value: depositAmount,
      });
      
      await expect(tx).to.not.be.reverted;
    }
  });
});
