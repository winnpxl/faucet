import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Feature: eth-test-faucet, Property 13: Claim Records Timestamp
// For any eligible requester who successfully claims, the lastClaimTime for that requester
// SHALL be set to the current block timestamp.
// **Validates: Requirements 2.3**

describe("Property 13: Claim Records Timestamp", function () {
  let EthTestFaucet;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    EthTestFaucet = await ethers.getContractFactory("EthTestFaucet");
  });

  it("should record block timestamp for successful claims (property test with 100+ iterations)", async function () {
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
      
      // Fund the faucet with sufficient balance
      await owner.sendTransaction({
        to: faucetAddress,
        value: ethers.parseEther("1"),
      });
      
      // Verify lastClaimTime is 0 before claim
      const lastClaimTimeBefore = await faucet.getLastClaimTime(requester.address);
      expect(lastClaimTimeBefore).to.equal(0n);
      
      // Execute claim
      const tx = await faucet.connect(requester).claim();
      const receipt = await tx.wait();
      
      // Get the block timestamp from the transaction
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const blockTimestamp = BigInt(block.timestamp);
      
      // Property: lastClaimTime SHALL be set to the current block timestamp
      const lastClaimTimeAfter = await faucet.getLastClaimTime(requester.address);
      expect(lastClaimTimeAfter).to.equal(blockTimestamp);
    }
  });

  it("should update timestamp on subsequent claims after cooldown expires (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Get requester
      const signers = await ethers.getSigners();
      const requester = signers[(i % (signers.length - 1)) + 1];
      
      // Fund the faucet generously
      await owner.sendTransaction({
        to: faucetAddress,
        value: ethers.parseEther("10"),
      });
      
      // First claim
      const tx1 = await faucet.connect(requester).claim();
      const receipt1 = await tx1.wait();
      const block1 = await ethers.provider.getBlock(receipt1.blockNumber);
      const timestamp1 = BigInt(block1.timestamp);
      
      // Verify first timestamp recorded
      const lastClaimTime1 = await faucet.getLastClaimTime(requester.address);
      expect(lastClaimTime1).to.equal(timestamp1);
      
      // Advance time past cooldown period
      const cooldownPeriod = await faucet.getCooldownPeriod();
      await ethers.provider.send("evm_increaseTime", [Number(cooldownPeriod) + 1]);
      await ethers.provider.send("evm_mine");
      
      // Second claim
      const tx2 = await faucet.connect(requester).claim();
      const receipt2 = await tx2.wait();
      const block2 = await ethers.provider.getBlock(receipt2.blockNumber);
      const timestamp2 = BigInt(block2.timestamp);
      
      // Property: lastClaimTime SHALL be updated to new block timestamp
      const lastClaimTime2 = await faucet.getLastClaimTime(requester.address);
      expect(lastClaimTime2).to.equal(timestamp2);
      
      // Verify timestamp was actually updated (not same as first)
      expect(lastClaimTime2).to.be.gt(lastClaimTime1);
    }
  });

  it("should record different timestamps for different requesters (property test)", async function () {
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
    const timestamps = [];
    
    for (let i = 0; i < numRequesters; i++) {
      const requester = signers[i + 1];
      
      // Execute claim
      const tx = await faucet.connect(requester).claim();
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const blockTimestamp = BigInt(block.timestamp);
      
      // Property: Each requester's lastClaimTime SHALL match their claim block timestamp
      const lastClaimTime = await faucet.getLastClaimTime(requester.address);
      expect(lastClaimTime).to.equal(blockTimestamp);
      
      timestamps.push(lastClaimTime);
      
      // Advance time slightly between claims to ensure different timestamps
      await ethers.provider.send("evm_increaseTime", [1]);
      await ethers.provider.send("evm_mine");
    }
    
    // Verify all timestamps were recorded independently
    for (let i = 0; i < numRequesters; i++) {
      const requester = signers[i + 1];
      const lastClaimTime = await faucet.getLastClaimTime(requester.address);
      expect(lastClaimTime).to.equal(timestamps[i]);
    }
  });

  it("should maintain timestamp accuracy across varying time intervals (property test)", async function () {
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
        value: ethers.parseEther("1"),
      });
      
      // Advance time by random amount before claim
      const randomTimeAdvance = Math.floor(Math.random() * 10000) + 1;
      await ethers.provider.send("evm_increaseTime", [randomTimeAdvance]);
      await ethers.provider.send("evm_mine");
      
      // Execute claim
      const tx = await faucet.connect(requester).claim();
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const blockTimestamp = BigInt(block.timestamp);
      
      // Property: lastClaimTime SHALL equal block timestamp regardless of when claim occurs
      const lastClaimTime = await faucet.getLastClaimTime(requester.address);
      expect(lastClaimTime).to.equal(blockTimestamp);
    }
  });

  it("should record timestamp even when contract balance is near drip amount (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Get requester
      const signers = await ethers.getSigners();
      const requester = signers[(i % (signers.length - 1)) + 1];
      
      // Get drip amount
      const dripAmount = await faucet.getDripAmount();
      
      // Fund with exactly drip amount or slightly more
      const fundAmount = dripAmount + BigInt(Math.floor(Math.random() * 1000000000000000)); // Add 0-0.001 ETH
      await owner.sendTransaction({
        to: faucetAddress,
        value: fundAmount,
      });
      
      // Execute claim
      const tx = await faucet.connect(requester).claim();
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const blockTimestamp = BigInt(block.timestamp);
      
      // Property: Timestamp SHALL be recorded even with minimal balance
      const lastClaimTime = await faucet.getLastClaimTime(requester.address);
      expect(lastClaimTime).to.equal(blockTimestamp);
    }
  });

  it("should not modify timestamps of other requesters when one claims (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    
    // Fund generously
    await owner.sendTransaction({
      to: faucetAddress,
      value: ethers.parseEther("100"),
    });
    
    const signers = await ethers.getSigners();
    const numRequesters = Math.min(15, signers.length - 1);
    
    // Have multiple requesters claim
    const recordedTimestamps = new Map();
    
    for (let i = 0; i < numRequesters; i++) {
      const requester = signers[i + 1];
      
      const tx = await faucet.connect(requester).claim();
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const blockTimestamp = BigInt(block.timestamp);
      
      recordedTimestamps.set(requester.address, blockTimestamp);
      
      // Advance time between claims
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");
    }
    
    // Property: Each requester's timestamp SHALL remain unchanged by other claims
    for (let i = 0; i < numRequesters; i++) {
      const requester = signers[i + 1];
      const lastClaimTime = await faucet.getLastClaimTime(requester.address);
      expect(lastClaimTime).to.equal(recordedTimestamps.get(requester.address));
    }
  });

  it("should record timestamp that enables cooldown calculation (property test)", async function () {
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
      
      // Execute claim
      const tx = await faucet.connect(requester).claim();
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const blockTimestamp = BigInt(block.timestamp);
      
      // Get recorded timestamp
      const lastClaimTime = await faucet.getLastClaimTime(requester.address);
      expect(lastClaimTime).to.equal(blockTimestamp);
      
      // Get cooldown period
      const cooldownPeriod = await faucet.getCooldownPeriod();
      
      // Property: Recorded timestamp SHALL enable accurate cooldown enforcement
      // Verify second claim immediately after first claim reverts
      await expect(faucet.connect(requester).claim())
        .to.be.revertedWithCustomError(faucet, "CooldownNotExpired");
      
      // Advance time past cooldown
      await ethers.provider.send("evm_increaseTime", [Number(cooldownPeriod) + 1]);
      await ethers.provider.send("evm_mine");
      
      // Verify second claim succeeds after cooldown
      const tx2 = await faucet.connect(requester).claim();
      const receipt2 = await tx2.wait();
      const block2 = await ethers.provider.getBlock(receipt2.blockNumber);
      const newTimestamp = BigInt(block2.timestamp);
      
      // Verify timestamp was updated to new claim time
      const newLastClaimTime = await faucet.getLastClaimTime(requester.address);
      expect(newLastClaimTime).to.equal(newTimestamp);
      expect(newLastClaimTime).to.be.gt(lastClaimTime);
    }
  });

  it("should record timestamp atomically with balance transfer (property test)", async function () {
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
        value: ethers.parseEther("1"),
      });
      
      const dripAmount = await faucet.getDripAmount();
      const balanceBefore = await ethers.provider.getBalance(requester.address);
      
      // Execute claim
      const tx = await faucet.connect(requester).claim();
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const blockTimestamp = BigInt(block.timestamp);
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const balanceAfter = await ethers.provider.getBalance(requester.address);
      const lastClaimTime = await faucet.getLastClaimTime(requester.address);
      
      // Property: Both balance transfer and timestamp recording SHALL succeed together
      expect(balanceAfter).to.equal(balanceBefore + dripAmount - gasUsed);
      expect(lastClaimTime).to.equal(blockTimestamp);
    }
  });

  it("should record timestamp for first-time claimers (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Get a unique requester
      const signers = await ethers.getSigners();
      const requester = signers[(i % (signers.length - 1)) + 1];
      
      // Fund the faucet
      await owner.sendTransaction({
        to: faucetAddress,
        value: ethers.parseEther("1"),
      });
      
      // Verify requester has never claimed (timestamp is 0)
      const lastClaimTimeBefore = await faucet.getLastClaimTime(requester.address);
      expect(lastClaimTimeBefore).to.equal(0n);
      
      // Execute first claim
      const tx = await faucet.connect(requester).claim();
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const blockTimestamp = BigInt(block.timestamp);
      
      // Property: First-time claimers SHALL have timestamp recorded
      const lastClaimTimeAfter = await faucet.getLastClaimTime(requester.address);
      expect(lastClaimTimeAfter).to.equal(blockTimestamp);
      expect(lastClaimTimeAfter).to.be.gt(0n);
    }
  });

  it("should maintain timestamp precision across multiple claim cycles (property test)", async function () {
    const iterations = 25;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Get requester
      const signers = await ethers.getSigners();
      const requester = signers[(i % (signers.length - 1)) + 1];
      
      // Fund generously for multiple claims
      await owner.sendTransaction({
        to: faucetAddress,
        value: ethers.parseEther("10"),
      });
      
      const cooldownPeriod = await faucet.getCooldownPeriod();
      const numCycles = 3;
      
      for (let cycle = 0; cycle < numCycles; cycle++) {
        // Execute claim
        const tx = await faucet.connect(requester).claim();
        const receipt = await tx.wait();
        const block = await ethers.provider.getBlock(receipt.blockNumber);
        const blockTimestamp = BigInt(block.timestamp);
        
        // Property: Timestamp SHALL be accurate for each claim cycle
        const lastClaimTime = await faucet.getLastClaimTime(requester.address);
        expect(lastClaimTime).to.equal(blockTimestamp);
        
        // Advance past cooldown for next cycle
        if (cycle < numCycles - 1) {
          await ethers.provider.send("evm_increaseTime", [Number(cooldownPeriod) + 1]);
          await ethers.provider.send("evm_mine");
        }
      }
    }
  });
});
