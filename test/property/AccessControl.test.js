import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Feature: eth-test-faucet, Property 9: Non-Owner Cannot Call Administrative Functions
// For any address that is not the owner, calling setDripAmount(), setCooldownPeriod(), or withdraw() 
// SHALL revert with an unauthorized error
// **Validates: Requirements 4.3**

describe("Property 9: Non-Owner Cannot Call Administrative Functions", function () {
  let EthTestFaucet;
  let owner;
  let nonOwners;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    nonOwners = signers.slice(1); // All signers except the owner
    EthTestFaucet = await ethers.getContractFactory("EthTestFaucet");
  });

  it("should prevent non-owners from calling setDripAmount (property test with 100+ iterations)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      // Deploy fresh contract for each iteration
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      
      // Select a random non-owner address
      const nonOwner = nonOwners[i % nonOwners.length];
      
      // Generate random positive drip amount
      const newDripAmount = ethers.parseEther((Math.random() * 10 + 0.001).toFixed(18));
      
      // Property: Non-owner calling setDripAmount should revert with OwnableUnauthorizedAccount
      await expect(faucet.connect(nonOwner).setDripAmount(newDripAmount))
        .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
      
      // Property: Drip amount should remain unchanged at default value
      const currentDripAmount = await faucet.getDripAmount();
      expect(currentDripAmount).to.equal(ethers.parseEther("0.1"));
    }
  });

  it("should prevent non-owners from calling setCooldownPeriod (property test with 100+ iterations)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      // Deploy fresh contract for each iteration
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      
      // Select a random non-owner address
      const nonOwner = nonOwners[i % nonOwners.length];
      
      // Generate random positive cooldown period (1 hour to 30 days)
      const newCooldownPeriod = BigInt(Math.floor(Math.random() * 2592000) + 3600);
      
      // Property: Non-owner calling setCooldownPeriod should revert with OwnableUnauthorizedAccount
      await expect(faucet.connect(nonOwner).setCooldownPeriod(newCooldownPeriod))
        .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
      
      // Property: Cooldown period should remain unchanged at default value (24 hours)
      const currentCooldownPeriod = await faucet.getCooldownPeriod();
      expect(currentCooldownPeriod).to.equal(24n * 60n * 60n); // 24 hours in seconds
    }
  });

  it("should prevent non-owners from calling withdraw (property test with 100+ iterations)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      // Deploy fresh contract for each iteration
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund the contract with random amount
      const fundAmount = ethers.parseEther((Math.random() * 5 + 1).toFixed(18));
      await owner.sendTransaction({
        to: faucetAddress,
        value: fundAmount,
      });
      
      // Select a random non-owner address
      const nonOwner = nonOwners[i % nonOwners.length];
      
      // Generate random withdrawal amount (within contract balance)
      const withdrawAmount = fundAmount / 2n; // Withdraw half of the balance
      
      // Property: Non-owner calling withdraw should revert with OwnableUnauthorizedAccount
      await expect(faucet.connect(nonOwner).withdraw(withdrawAmount))
        .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
      
      // Property: Contract balance should remain unchanged
      const currentBalance = await faucet.getBalance();
      expect(currentBalance).to.equal(fundAmount);
    }
  });

  it("should test all administrative functions with the same non-owner address (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund the contract
      const fundAmount = ethers.parseEther("2");
      await owner.sendTransaction({
        to: faucetAddress,
        value: fundAmount,
      });
      
      // Select a random non-owner address
      const nonOwner = nonOwners[i % nonOwners.length];
      
      // Generate test parameters
      const newDripAmount = ethers.parseEther((Math.random() * 2 + 0.1).toFixed(18));
      const newCooldownPeriod = BigInt(Math.floor(Math.random() * 86400) + 3600); // 1 hour to 1 day
      const withdrawAmount = ethers.parseEther("1");
      
      // Property: All administrative functions should revert for non-owner
      await expect(faucet.connect(nonOwner).setDripAmount(newDripAmount))
        .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
      
      await expect(faucet.connect(nonOwner).setCooldownPeriod(newCooldownPeriod))
        .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
      
      await expect(faucet.connect(nonOwner).withdraw(withdrawAmount))
        .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
      
      // Property: Contract state should remain unchanged
      expect(await faucet.getDripAmount()).to.equal(ethers.parseEther("0.1"));
      expect(await faucet.getCooldownPeriod()).to.equal(24n * 60n * 60n);
      expect(await faucet.getBalance()).to.equal(fundAmount);
    }
  });

  it("should verify owner can still call administrative functions while non-owners cannot (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund the contract
      const fundAmount = ethers.parseEther("5");
      await owner.sendTransaction({
        to: faucetAddress,
        value: fundAmount,
      });
      
      // Select a random non-owner address
      const nonOwner = nonOwners[i % nonOwners.length];
      
      // Generate test parameters
      const newDripAmount = ethers.parseEther((Math.random() * 2 + 0.1).toFixed(18));
      const newCooldownPeriod = BigInt(Math.floor(Math.random() * 86400) + 3600);
      const withdrawAmount = ethers.parseEther("1");
      
      // Property: Owner should be able to call administrative functions
      await expect(faucet.connect(owner).setDripAmount(newDripAmount))
        .to.emit(faucet, "DripAmountUpdated")
        .withArgs(newDripAmount);
      
      await expect(faucet.connect(owner).setCooldownPeriod(newCooldownPeriod))
        .to.emit(faucet, "CooldownPeriodUpdated")
        .withArgs(newCooldownPeriod);
      
      await expect(faucet.connect(owner).withdraw(withdrawAmount))
        .to.emit(faucet, "Withdrawal")
        .withArgs(owner.address, withdrawAmount);
      
      // Property: Non-owner should still be unable to call administrative functions
      await expect(faucet.connect(nonOwner).setDripAmount(ethers.parseEther("1")))
        .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
      
      await expect(faucet.connect(nonOwner).setCooldownPeriod(3600n))
        .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
      
      await expect(faucet.connect(nonOwner).withdraw(ethers.parseEther("0.1")))
        .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
    }
  });

  it("should test access control with edge case parameters (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    
    // Fund the contract with maximum reasonable amount
    const maxFundAmount = ethers.parseEther("1000");
    await owner.sendTransaction({
      to: faucetAddress,
      value: maxFundAmount,
    });
    
    // Test edge case values with different non-owner addresses
    const edgeCases = [
      {
        dripAmount: 1n, // Minimum positive value
        cooldownPeriod: 1n, // Minimum positive value
        withdrawAmount: 1n, // Minimum positive value
      },
      {
        dripAmount: ethers.parseEther("1000"), // Large amount
        cooldownPeriod: BigInt(365 * 24 * 60 * 60), // 1 year
        withdrawAmount: maxFundAmount, // Full balance
      },
      {
        dripAmount: ethers.parseEther("0.000000000000000001"), // Very small amount
        cooldownPeriod: BigInt(60), // 1 minute
        withdrawAmount: ethers.parseEther("0.000000000000000001"), // Very small withdrawal
      },
    ];
    
    for (let i = 0; i < edgeCases.length; i++) {
      const testCase = edgeCases[i];
      const nonOwner = nonOwners[i % nonOwners.length];
      
      // Property: Non-owner cannot call administrative functions with edge case values
      await expect(faucet.connect(nonOwner).setDripAmount(testCase.dripAmount))
        .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
      
      await expect(faucet.connect(nonOwner).setCooldownPeriod(testCase.cooldownPeriod))
        .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
      
      await expect(faucet.connect(nonOwner).withdraw(testCase.withdrawAmount))
        .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
    }
  });

  it("should maintain access control after ownership operations (property test)", async function () {
    const iterations = 30;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund the contract
      await owner.sendTransaction({
        to: faucetAddress,
        value: ethers.parseEther("3"),
      });
      
      // Select a random non-owner address
      const nonOwner = nonOwners[i % nonOwners.length];
      
      // Owner performs some administrative operations
      const randomDripAmount = ethers.parseEther((Math.random() * 1 + 0.1).toFixed(18));
      const randomCooldownPeriod = BigInt(Math.floor(Math.random() * 86400) + 3600);
      
      await faucet.connect(owner).setDripAmount(randomDripAmount);
      await faucet.connect(owner).setCooldownPeriod(randomCooldownPeriod);
      
      // Property: After owner operations, non-owner should still be unable to call administrative functions
      await expect(faucet.connect(nonOwner).setDripAmount(ethers.parseEther("2")))
        .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
      
      await expect(faucet.connect(nonOwner).setCooldownPeriod(7200n))
        .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
      
      await expect(faucet.connect(nonOwner).withdraw(ethers.parseEther("0.5")))
        .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
      
      // Property: Owner should still be able to call administrative functions
      await expect(faucet.connect(owner).withdraw(ethers.parseEther("0.1")))
        .to.emit(faucet, "Withdrawal")
        .withArgs(owner.address, ethers.parseEther("0.1"));
    }
  });

  it("should test access control with multiple non-owner addresses simultaneously (property test)", async function () {
    const iterations = 20;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund the contract
      await owner.sendTransaction({
        to: faucetAddress,
        value: ethers.parseEther("10"),
      });
      
      // Test with multiple non-owner addresses in the same iteration
      const testAddresses = nonOwners.slice(0, Math.min(5, nonOwners.length));
      
      for (const nonOwner of testAddresses) {
        // Generate random parameters for each address
        const dripAmount = ethers.parseEther((Math.random() * 3 + 0.1).toFixed(18));
        const cooldownPeriod = BigInt(Math.floor(Math.random() * 172800) + 3600); // 1 hour to 2 days
        const withdrawAmount = ethers.parseEther((Math.random() * 2 + 0.1).toFixed(18));
        
        // Property: Each non-owner address should be unable to call administrative functions
        await expect(faucet.connect(nonOwner).setDripAmount(dripAmount))
          .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
          .withArgs(nonOwner.address);
        
        await expect(faucet.connect(nonOwner).setCooldownPeriod(cooldownPeriod))
          .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
          .withArgs(nonOwner.address);
        
        await expect(faucet.connect(nonOwner).withdraw(withdrawAmount))
          .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
          .withArgs(nonOwner.address);
      }
      
      // Property: Contract state should remain unchanged after all failed attempts
      expect(await faucet.getDripAmount()).to.equal(ethers.parseEther("0.1"));
      expect(await faucet.getCooldownPeriod()).to.equal(24n * 60n * 60n);
      expect(await faucet.getBalance()).to.equal(ethers.parseEther("10"));
    }
  });
});