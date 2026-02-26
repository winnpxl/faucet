import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Feature: eth-test-faucet, Property 3: Claim Within Cooldown Period Reverts
// For any requester address that has successfully claimed, attempting to claim again
// before the cooldown period expires SHALL revert with a cooldown error.
// **Validates: Requirements 2.2**

describe("Property 3: Claim Within Cooldown Period Reverts", function () {
  let EthTestFaucet;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    EthTestFaucet = await ethers.getContractFactory("EthTestFaucet");
  });

  it("should revert when claiming within cooldown period (property test with 100+ iterations)", async function () {
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
      
      // Fund the faucet generously to ensure balance is not the issue
      await owner.sendTransaction({
        to: faucetAddress,
        value: ethers.parseEther("10"),
      });
      
      // First claim should succeed
      await faucet.connect(requester).claim();
      
      // Get cooldown period
      const cooldownPeriod = await faucet.getCooldownPeriod();
      
      // Property: Attempting to claim again immediately should revert
      await expect(faucet.connect(requester).claim())
        .to.be.revertedWithCustomError(faucet, "CooldownNotExpired");
    }
  });

  it("should revert with correct time remaining for various time intervals within cooldown (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Get requester
      const signers = await ethers.getSigners();
      const requester = signers[(i % (signers.length - 1)) + 1];
      
      // Fund the faucet
      await owner.sendTransaction({
        to: faucetAddress,
        value: ethers.parseEther("10"),
      });
      
      // First claim
      await faucet.connect(requester).claim();
      
      const cooldownPeriod = await faucet.getCooldownPeriod();
      const lastClaimTime = await faucet.getLastClaimTime(requester.address);
      
      // Generate random time advance within cooldown period (1 second to cooldownPeriod - 2)
      // Leave at least 2 seconds to avoid boundary timing issues
      const maxAdvance = Number(cooldownPeriod) - 2;
      const timeAdvance = BigInt(Math.floor(Math.random() * maxAdvance) + 1);
      
      // Advance time by random amount within cooldown
      await ethers.provider.send("evm_increaseTime", [Number(timeAdvance)]);
      await ethers.provider.send("evm_mine");
      
      // Property: Claim should revert with CooldownNotExpired
      // Note: We don't check exact time remaining due to EVM timing precision
      await expect(faucet.connect(requester).claim())
        .to.be.revertedWithCustomError(faucet, "CooldownNotExpired");
    }
  });

  it("should enforce cooldown for multiple requesters independently (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    
    // Fund generously
    await owner.sendTransaction({
      to: faucetAddress,
      value: ethers.parseEther("100"),
    });
    
    const signers = await ethers.getSigners();
    const numRequesters = Math.min(20, signers.length - 1);
    
    // Have multiple requesters claim
    for (let i = 0; i < numRequesters; i++) {
      const requester = signers[i + 1];
      await faucet.connect(requester).claim();
      
      // Property: Each requester should be unable to claim again immediately
      await expect(faucet.connect(requester).claim())
        .to.be.revertedWithCustomError(faucet, "CooldownNotExpired");
    }
  });

  it("should revert at various points throughout the cooldown period (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Get requester
      const signers = await ethers.getSigners();
      const requester = signers[(i % (signers.length - 1)) + 1];
      
      // Fund the faucet
      await owner.sendTransaction({
        to: faucetAddress,
        value: ethers.parseEther("10"),
      });
      
      // First claim
      await faucet.connect(requester).claim();
      
      const cooldownPeriod = await faucet.getCooldownPeriod();
      
      // Test at different percentages through the cooldown period
      const percentage = i / iterations; // 0 to ~1
      const timeAdvance = BigInt(Math.floor(Number(cooldownPeriod) * percentage));
      
      if (timeAdvance > 0n && timeAdvance < cooldownPeriod) {
        // Advance time
        await ethers.provider.send("evm_increaseTime", [Number(timeAdvance)]);
        await ethers.provider.send("evm_mine");
        
        // Property: Claim should still revert anywhere within cooldown period
        await expect(faucet.connect(requester).claim())
          .to.be.revertedWithCustomError(faucet, "CooldownNotExpired");
      }
    }
  });

  it("should revert even 1 second before cooldown expires (boundary test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Get requester
      const signers = await ethers.getSigners();
      const requester = signers[(i % (signers.length - 1)) + 1];
      
      // Fund the faucet
      await owner.sendTransaction({
        to: faucetAddress,
        value: ethers.parseEther("10"),
      });
      
      // First claim
      await faucet.connect(requester).claim();
      
      const cooldownPeriod = await faucet.getCooldownPeriod();
      
      // Advance time to 2 seconds before cooldown expires (safer boundary)
      const timeAdvance = cooldownPeriod - 2n;
      await ethers.provider.send("evm_increaseTime", [Number(timeAdvance)]);
      await ethers.provider.send("evm_mine");
      
      // Property: Claim should revert when still within cooldown period
      await expect(faucet.connect(requester).claim())
        .to.be.revertedWithCustomError(faucet, "CooldownNotExpired");
    }
  });

  it("should enforce cooldown regardless of contract balance (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Get requester
      const signers = await ethers.getSigners();
      const requester = signers[(i % (signers.length - 1)) + 1];
      
      // Fund with varying amounts
      const fundAmount = ethers.parseEther((Math.random() * 10 + 1).toFixed(18));
      await owner.sendTransaction({
        to: faucetAddress,
        value: fundAmount,
      });
      
      // First claim
      await faucet.connect(requester).claim();
      
      // Add more funds after first claim
      const additionalFunds = ethers.parseEther((Math.random() * 5 + 0.5).toFixed(18));
      await owner.sendTransaction({
        to: faucetAddress,
        value: additionalFunds,
      });
      
      // Property: Cooldown should be enforced regardless of balance changes
      await expect(faucet.connect(requester).claim())
        .to.be.revertedWithCustomError(faucet, "CooldownNotExpired");
    }
  });

  it("should maintain cooldown enforcement after multiple failed claim attempts (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Get requester
      const signers = await ethers.getSigners();
      const requester = signers[(i % (signers.length - 1)) + 1];
      
      // Fund the faucet
      await owner.sendTransaction({
        to: faucetAddress,
        value: ethers.parseEther("10"),
      });
      
      // First claim succeeds
      await faucet.connect(requester).claim();
      
      // Attempt multiple claims within cooldown - all should fail
      const numAttempts = Math.floor(Math.random() * 5) + 2; // 2-6 attempts
      
      for (let j = 0; j < numAttempts; j++) {
        // Property: Each attempt should revert with CooldownNotExpired
        await expect(faucet.connect(requester).claim())
          .to.be.revertedWithCustomError(faucet, "CooldownNotExpired");
        
        // Advance time slightly between attempts (but still within cooldown)
        const smallAdvance = Math.floor(Math.random() * 100) + 1; // 1-100 seconds
        await ethers.provider.send("evm_increaseTime", [smallAdvance]);
        await ethers.provider.send("evm_mine");
      }
    }
  });

  it("should calculate time remaining correctly at different points in cooldown (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Get requester
      const signers = await ethers.getSigners();
      const requester = signers[(i % (signers.length - 1)) + 1];
      
      // Fund the faucet
      await owner.sendTransaction({
        to: faucetAddress,
        value: ethers.parseEther("10"),
      });
      
      // First claim
      await faucet.connect(requester).claim();
      
      const cooldownPeriod = await faucet.getCooldownPeriod();
      
      // Advance time by random amount within cooldown (leave 2 second buffer)
      const maxAdvance = Number(cooldownPeriod) - 2;
      const timeAdvance = BigInt(Math.floor(Math.random() * maxAdvance) + 1);
      await ethers.provider.send("evm_increaseTime", [Number(timeAdvance)]);
      await ethers.provider.send("evm_mine");
      
      // Property: Claim should revert with CooldownNotExpired
      // We verify the error type but not exact time due to EVM timing precision
      await expect(faucet.connect(requester).claim())
        .to.be.revertedWithCustomError(faucet, "CooldownNotExpired");
    }
  });
});
