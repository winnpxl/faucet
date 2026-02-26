import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Feature: eth-test-faucet, Property 7: Owner Can Update Drip Amount
// For any positive uint256 value, when the owner calls setDripAmount() with that value,
// the drip amount SHALL be updated to that value AND a DripAmountUpdated event SHALL be emitted.
// **Validates: Requirements 4.1**

describe("Property 7: Owner Can Update Drip Amount", function () {
  let EthTestFaucet;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    EthTestFaucet = await ethers.getContractFactory("EthTestFaucet");
  });

  it("should update drip amount to any positive value and emit DripAmountUpdated event (property test with 100+ iterations)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      // Deploy fresh contract for each iteration
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      
      // Generate pseudo-random positive uint256 value
      // Use different ranges to test various magnitudes
      let newDripAmount;
      const range = i % 4;
      
      switch (range) {
        case 0: // Small amounts (1 wei to 0.001 ETH)
          newDripAmount = BigInt(Math.floor(Math.random() * 1000000000000000) + 1);
          break;
        case 1: // Medium amounts (0.001 ETH to 1 ETH)
          newDripAmount = ethers.parseEther((Math.random() * 0.999 + 0.001).toFixed(18));
          break;
        case 2: // Large amounts (1 ETH to 100 ETH)
          newDripAmount = ethers.parseEther((Math.random() * 99 + 1).toFixed(18));
          break;
        case 3: // Very large amounts (100 ETH to 10000 ETH)
          newDripAmount = ethers.parseEther((Math.random() * 9900 + 100).toFixed(18));
          break;
      }
      
      // Verify initial drip amount is default (0.1 ETH)
      const initialDripAmount = await faucet.getDripAmount();
      expect(initialDripAmount).to.equal(ethers.parseEther("0.1"));
      
      // Property: When owner calls setDripAmount() with positive value, drip amount is updated
      const tx = await faucet.connect(owner).setDripAmount(newDripAmount);
      await tx.wait();
      
      // Property verification: Drip amount updated to new value
      const updatedDripAmount = await faucet.getDripAmount();
      expect(updatedDripAmount).to.equal(newDripAmount);
      
      // Property verification: DripAmountUpdated event emitted with correct value
      await expect(tx)
        .to.emit(faucet, "DripAmountUpdated")
        .withArgs(newDripAmount);
    }
  });

  it("should handle edge case values correctly (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    
    // Test edge case values
    const edgeCases = [
      1n, // Minimum positive value (1 wei)
      ethers.parseEther("0.000000000000000001"), // 1 wei in parseEther format
      ethers.parseEther("1"), // 1 ETH
      ethers.parseEther("1000"), // 1000 ETH
      BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935"), // Max uint256
    ];
    
    for (const testValue of edgeCases) {
      // Update drip amount
      const tx = await faucet.connect(owner).setDripAmount(testValue);
      await tx.wait();
      
      // Property: Drip amount updated correctly
      const updatedAmount = await faucet.getDripAmount();
      expect(updatedAmount).to.equal(testValue);
      
      // Property: Event emitted correctly
      await expect(tx)
        .to.emit(faucet, "DripAmountUpdated")
        .withArgs(testValue);
    }
  });

  it("should maintain property across multiple updates (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    
    // Perform 50 sequential updates
    for (let i = 0; i < 50; i++) {
      // Generate random positive amount
      const newAmount = ethers.parseEther((Math.random() * 10 + 0.001).toFixed(18));
      
      // Update drip amount
      const tx = await faucet.connect(owner).setDripAmount(newAmount);
      await tx.wait();
      
      // Property: Each update sets the correct value
      const currentAmount = await faucet.getDripAmount();
      expect(currentAmount).to.equal(newAmount);
      
      // Property: Event emitted for each update
      await expect(tx)
        .to.emit(faucet, "DripAmountUpdated")
        .withArgs(newAmount);
    }
  });

  it("should reject zero value and maintain previous drip amount (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      
      // Set a random initial drip amount
      const initialAmount = ethers.parseEther((Math.random() * 5 + 0.1).toFixed(18));
      await faucet.connect(owner).setDripAmount(initialAmount);
      
      // Verify the amount was set
      expect(await faucet.getDripAmount()).to.equal(initialAmount);
      
      // Property: Setting drip amount to 0 should revert with InvalidAmount error
      await expect(faucet.connect(owner).setDripAmount(0))
        .to.be.revertedWithCustomError(faucet, "InvalidAmount")
        .withArgs(0);
      
      // Property: Drip amount should remain unchanged after failed update
      const amountAfterFailure = await faucet.getDripAmount();
      expect(amountAfterFailure).to.equal(initialAmount);
    }
  });

  it("should only allow owner to update drip amount (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      
      // Get a non-owner signer
      const signers = await ethers.getSigners();
      const nonOwner = signers[(i % (signers.length - 1)) + 1]; // Skip owner at index 0
      
      // Generate random positive amount
      const newAmount = ethers.parseEther((Math.random() * 10 + 0.001).toFixed(18));
      
      // Property: Non-owner calling setDripAmount should revert
      await expect(faucet.connect(nonOwner).setDripAmount(newAmount))
        .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
      
      // Property: Drip amount should remain at default value
      const currentAmount = await faucet.getDripAmount();
      expect(currentAmount).to.equal(ethers.parseEther("0.1"));
    }
  });

  it("should update drip amount and affect subsequent claims (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund the faucet generously
      await owner.sendTransaction({
        to: faucetAddress,
        value: ethers.parseEther("100"),
      });
      
      // Generate random new drip amount
      const newDripAmount = ethers.parseEther((Math.random() * 5 + 0.01).toFixed(18));
      
      // Update drip amount
      await faucet.connect(owner).setDripAmount(newDripAmount);
      
      // Verify drip amount was updated
      expect(await faucet.getDripAmount()).to.equal(newDripAmount);
      
      // Get a claimer
      const signers = await ethers.getSigners();
      const claimer = signers[(i % (signers.length - 1)) + 1];
      
      // Record claimer balance before claim
      const balanceBefore = await ethers.provider.getBalance(claimer.address);
      
      // Property: Claim should use the updated drip amount
      const tx = await faucet.connect(claimer).claim();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const balanceAfter = await ethers.provider.getBalance(claimer.address);
      
      // Verify claimer received the new drip amount
      expect(balanceAfter).to.equal(balanceBefore + newDripAmount - gasUsed);
      
      // Verify Claim event emitted with new drip amount
      await expect(tx)
        .to.emit(faucet, "Claim")
        .withArgs(claimer.address, newDripAmount);
    }
  });

  it("should handle rapid successive updates correctly (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    
    // Perform 20 rapid updates in sequence
    for (let i = 0; i < 20; i++) {
      const newAmount = ethers.parseEther((i + 1).toString());
      
      // Update drip amount
      const tx = await faucet.connect(owner).setDripAmount(newAmount);
      await tx.wait();
      
      // Property: Each update should be reflected immediately
      const currentAmount = await faucet.getDripAmount();
      expect(currentAmount).to.equal(newAmount);
      
      // Property: Event emitted for each update
      await expect(tx)
        .to.emit(faucet, "DripAmountUpdated")
        .withArgs(newAmount);
    }
    
    // Final verification: Should have the last set value
    const finalAmount = await faucet.getDripAmount();
    expect(finalAmount).to.equal(ethers.parseEther("20"));
  });

  it("should preserve other contract state when updating drip amount (property test)", async function () {
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
      const initialCooldown = await faucet.getCooldownPeriod();
      const initialOwner = await faucet.getOwner();
      const initialBalance = await faucet.getBalance();
      
      // Update drip amount
      const newDripAmount = ethers.parseEther((Math.random() * 2 + 0.1).toFixed(18));
      await faucet.connect(owner).setDripAmount(newDripAmount);
      
      // Property: Other state should remain unchanged
      expect(await faucet.getCooldownPeriod()).to.equal(initialCooldown);
      expect(await faucet.getOwner()).to.equal(initialOwner);
      expect(await faucet.getBalance()).to.equal(initialBalance);
      
      // Property: Only drip amount should change
      expect(await faucet.getDripAmount()).to.equal(newDripAmount);
    }
  });
});