import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Feature: eth-test-faucet, Property 8: Owner Can Update Cooldown Period
// For any positive uint256 value, when the owner calls setCooldownPeriod() with that value,
// the cooldown period SHALL be updated to that value AND a CooldownPeriodUpdated event SHALL be emitted.
// **Validates: Requirements 4.2**

describe("Property 8: Owner Can Update Cooldown Period", function () {
  let EthTestFaucet;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    EthTestFaucet = await ethers.getContractFactory("EthTestFaucet");
  });

  it("should update cooldown period to any positive value and emit CooldownPeriodUpdated event (property test with 100+ iterations)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      // Deploy fresh contract for each iteration
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      
      // Generate pseudo-random positive uint256 value
      // Use different ranges to test various time periods
      let newCooldownPeriod;
      const range = i % 4;
      
      switch (range) {
        case 0: // Very short periods (1 second to 1 minute)
          newCooldownPeriod = BigInt(Math.floor(Math.random() * 60) + 1);
          break;
        case 1: // Short to medium periods (1 minute to 1 hour)
          newCooldownPeriod = BigInt(Math.floor(Math.random() * 3540) + 60);
          break;
        case 2: // Medium to long periods (1 hour to 7 days)
          newCooldownPeriod = BigInt(Math.floor(Math.random() * 604740) + 3600);
          break;
        case 3: // Very long periods (7 days to 365 days)
          newCooldownPeriod = BigInt(Math.floor(Math.random() * 31449600) + 604800);
          break;
      }
      
      // Verify initial cooldown period is default (24 hours = 86400 seconds)
      const initialCooldownPeriod = await faucet.getCooldownPeriod();
      expect(initialCooldownPeriod).to.equal(86400n);
      
      // Property: When owner calls setCooldownPeriod() with positive value, cooldown period is updated
      const tx = await faucet.connect(owner).setCooldownPeriod(newCooldownPeriod);
      await tx.wait();
      
      // Property verification: Cooldown period updated to new value
      const updatedCooldownPeriod = await faucet.getCooldownPeriod();
      expect(updatedCooldownPeriod).to.equal(newCooldownPeriod);
      
      // Property verification: CooldownPeriodUpdated event emitted with correct value
      await expect(tx)
        .to.emit(faucet, "CooldownPeriodUpdated")
        .withArgs(newCooldownPeriod);
    }
  });

  it("should handle edge case values correctly (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    
    // Test edge case values
    const edgeCases = [
      1n, // Minimum positive value (1 second)
      60n, // 1 minute
      3600n, // 1 hour
      86400n, // 1 day (default)
      604800n, // 1 week
      2592000n, // 30 days
      31536000n, // 1 year
      BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935"), // Max uint256
    ];
    
    for (const testValue of edgeCases) {
      // Update cooldown period
      const tx = await faucet.connect(owner).setCooldownPeriod(testValue);
      await tx.wait();
      
      // Property: Cooldown period updated correctly
      const updatedPeriod = await faucet.getCooldownPeriod();
      expect(updatedPeriod).to.equal(testValue);
      
      // Property: Event emitted correctly
      await expect(tx)
        .to.emit(faucet, "CooldownPeriodUpdated")
        .withArgs(testValue);
    }
  });

  it("should maintain property across multiple updates (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    
    // Perform 50 sequential updates
    for (let i = 0; i < 50; i++) {
      // Generate random positive period (1 second to 7 days)
      const newPeriod = BigInt(Math.floor(Math.random() * 604799) + 1);
      
      // Update cooldown period
      const tx = await faucet.connect(owner).setCooldownPeriod(newPeriod);
      await tx.wait();
      
      // Property: Each update sets the correct value
      const currentPeriod = await faucet.getCooldownPeriod();
      expect(currentPeriod).to.equal(newPeriod);
      
      // Property: Event emitted for each update
      await expect(tx)
        .to.emit(faucet, "CooldownPeriodUpdated")
        .withArgs(newPeriod);
    }
  });

  it("should reject zero value and maintain previous cooldown period (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      
      // Set a random initial cooldown period
      const initialPeriod = BigInt(Math.floor(Math.random() * 86400) + 3600);
      await faucet.connect(owner).setCooldownPeriod(initialPeriod);
      
      // Verify the period was set
      expect(await faucet.getCooldownPeriod()).to.equal(initialPeriod);
      
      // Property: Setting cooldown period to 0 should revert with InvalidAmount error
      await expect(faucet.connect(owner).setCooldownPeriod(0))
        .to.be.revertedWithCustomError(faucet, "InvalidAmount")
        .withArgs(0);
      
      // Property: Cooldown period should remain unchanged after failed update
      const periodAfterFailure = await faucet.getCooldownPeriod();
      expect(periodAfterFailure).to.equal(initialPeriod);
    }
  });

  it("should only allow owner to update cooldown period (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      
      // Get a non-owner signer
      const signers = await ethers.getSigners();
      const nonOwner = signers[(i % (signers.length - 1)) + 1]; // Skip owner at index 0
      
      // Generate random positive period
      const newPeriod = BigInt(Math.floor(Math.random() * 86400) + 1);
      
      // Property: Non-owner calling setCooldownPeriod should revert
      await expect(faucet.connect(nonOwner).setCooldownPeriod(newPeriod))
        .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
      
      // Property: Cooldown period should remain at default value (24 hours)
      const currentPeriod = await faucet.getCooldownPeriod();
      expect(currentPeriod).to.equal(86400n);
    }
  });

  it("should update cooldown period and affect subsequent claim eligibility (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund the faucet
      await owner.sendTransaction({
        to: faucetAddress,
        value: ethers.parseEther("10"),
      });
      
      // Get a claimer
      const signers = await ethers.getSigners();
      const claimer = signers[(i % (signers.length - 1)) + 1];
      
      // Make initial claim
      await faucet.connect(claimer).claim();
      
      // Verify claimer cannot claim immediately (default 24 hour cooldown)
      expect(await faucet.canClaim(claimer.address)).to.equal(false);
      
      // Generate random short cooldown period (1 to 10 seconds)
      const newCooldownPeriod = BigInt(Math.floor(Math.random() * 10) + 1);
      
      // Update cooldown period
      await faucet.connect(owner).setCooldownPeriod(newCooldownPeriod);
      
      // Verify cooldown period was updated
      expect(await faucet.getCooldownPeriod()).to.equal(newCooldownPeriod);
      
      // Wait for the new cooldown period to expire
      await ethers.provider.send("evm_increaseTime", [Number(newCooldownPeriod)]);
      await ethers.provider.send("evm_mine");
      
      // Property: Claimer should now be eligible with the new cooldown period
      expect(await faucet.canClaim(claimer.address)).to.equal(true);
      
      // Property: Claimer should be able to claim again
      await expect(faucet.connect(claimer).claim())
        .to.emit(faucet, "Claim")
        .withArgs(claimer.address, await faucet.getDripAmount());
    }
  });

  it("should handle rapid successive updates correctly (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    
    // Perform 20 rapid updates in sequence
    for (let i = 0; i < 20; i++) {
      const newPeriod = BigInt((i + 1) * 3600); // Increment by 1 hour each time
      
      // Update cooldown period
      const tx = await faucet.connect(owner).setCooldownPeriod(newPeriod);
      await tx.wait();
      
      // Property: Each update should be reflected immediately
      const currentPeriod = await faucet.getCooldownPeriod();
      expect(currentPeriod).to.equal(newPeriod);
      
      // Property: Event emitted for each update
      await expect(tx)
        .to.emit(faucet, "CooldownPeriodUpdated")
        .withArgs(newPeriod);
    }
    
    // Final verification: Should have the last set value
    const finalPeriod = await faucet.getCooldownPeriod();
    expect(finalPeriod).to.equal(BigInt(20 * 3600));
  });

  it("should preserve other contract state when updating cooldown period (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Set up some contract state
      const depositAmount = ethers.parseEther((Math.random() * 5 + 1).toFixed(18));
      await owner.sendTransaction({
        to: faucetAddress,
        value: depositAmount,
      });
      
      // Record initial state
      const initialDripAmount = await faucet.getDripAmount();
      const initialOwner = await faucet.getOwner();
      const initialBalance = await faucet.getBalance();
      
      // Update cooldown period
      const newCooldownPeriod = BigInt(Math.floor(Math.random() * 86400) + 1);
      await faucet.connect(owner).setCooldownPeriod(newCooldownPeriod);
      
      // Property: Other state should remain unchanged
      expect(await faucet.getDripAmount()).to.equal(initialDripAmount);
      expect(await faucet.getOwner()).to.equal(initialOwner);
      expect(await faucet.getBalance()).to.equal(initialBalance);
      
      // Property: Only cooldown period should change
      expect(await faucet.getCooldownPeriod()).to.equal(newCooldownPeriod);
    }
  });
});
