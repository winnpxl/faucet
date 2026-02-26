import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Feature: eth-test-faucet, Property 4: Eligibility Check Reflects Cooldown Status
// For any requester address, canClaim() SHALL return true if and only if either
// (a) the requester has never claimed, OR (b) the current block timestamp is greater
// than or equal to the requester's last claim timestamp plus the cooldown period.
// **Validates: Requirements 2.4, 5.3, 5.4**

describe("Property 4: Eligibility Check Reflects Cooldown Status", function () {
  let EthTestFaucet;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    EthTestFaucet = await ethers.getContractFactory("EthTestFaucet");
  });

  it("should return true for addresses that have never claimed (property test with 100+ iterations)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      // Deploy fresh contract for each iteration
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      
      // Get a random signer to act as requester
      const signers = await ethers.getSigners();
      const requesterIndex = (i % (signers.length - 1)) + 1; // Skip owner at index 0
      const requester = signers[requesterIndex];
      
      // Verify requester has never claimed
      const lastClaimTime = await faucet.getLastClaimTime(requester.address);
      expect(lastClaimTime).to.equal(0n);
      
      // Property: canClaim() SHALL return true for addresses that have never claimed
      const canClaim = await faucet.canClaim(requester.address);
      expect(canClaim).to.be.true;
    }
  });

  it("should return false when within cooldown period (property test with 100+ iterations)", async function () {
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
      
      // Property: canClaim() SHALL return false immediately after claiming
      const canClaimImmediately = await faucet.canClaim(requester.address);
      expect(canClaimImmediately).to.be.false;
      
      // Advance time by random amount within cooldown period
      const cooldownPeriod = await faucet.getCooldownPeriod();
      const maxAdvance = Number(cooldownPeriod) - 2; // Leave 2 second buffer
      const timeAdvance = BigInt(Math.floor(Math.random() * maxAdvance) + 1);
      
      await ethers.provider.send("evm_increaseTime", [Number(timeAdvance)]);
      await ethers.provider.send("evm_mine");
      
      // Property: canClaim() SHALL return false at any point within cooldown period
      const canClaimDuringCooldown = await faucet.canClaim(requester.address);
      expect(canClaimDuringCooldown).to.be.false;
    }
  });

  it("should return true when cooldown period has expired (property test with 100+ iterations)", async function () {
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
      
      // Verify canClaim is false immediately after
      const canClaimBefore = await faucet.canClaim(requester.address);
      expect(canClaimBefore).to.be.false;
      
      // Advance time past cooldown period
      const cooldownPeriod = await faucet.getCooldownPeriod();
      // Add random extra time beyond cooldown (0 to 1000 seconds)
      const extraTime = BigInt(Math.floor(Math.random() * 1000));
      const timeAdvance = cooldownPeriod + extraTime;
      
      await ethers.provider.send("evm_increaseTime", [Number(timeAdvance)]);
      await ethers.provider.send("evm_mine");
      
      // Property: canClaim() SHALL return true when cooldown period has expired
      const canClaimAfter = await faucet.canClaim(requester.address);
      expect(canClaimAfter).to.be.true;
    }
  });

  it("should return true at exact cooldown expiry (boundary test with 100+ iterations)", async function () {
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
      
      // Advance time to exactly cooldown period
      const cooldownPeriod = await faucet.getCooldownPeriod();
      await ethers.provider.send("evm_increaseTime", [Number(cooldownPeriod)]);
      await ethers.provider.send("evm_mine");
      
      // Property: canClaim() SHALL return true when block.timestamp >= lastClaimTime + cooldownPeriod
      const canClaim = await faucet.canClaim(requester.address);
      expect(canClaim).to.be.true;
    }
  });

  it("should maintain independent eligibility status for multiple requesters (property test)", async function () {
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
    const requesters = [];
    
    // Have multiple requesters claim at different times
    for (let i = 0; i < numRequesters; i++) {
      const requester = signers[i + 1];
      requesters.push(requester);
      
      // Property: Before claiming, canClaim should return true
      const canClaimBefore = await faucet.canClaim(requester.address);
      expect(canClaimBefore).to.be.true;
      
      await faucet.connect(requester).claim();
      
      // Property: After claiming, canClaim should return false
      const canClaimAfter = await faucet.canClaim(requester.address);
      expect(canClaimAfter).to.be.false;
      
      // Advance time slightly between claims
      const timeAdvance = Math.floor(Math.random() * 100) + 1;
      await ethers.provider.send("evm_increaseTime", [timeAdvance]);
      await ethers.provider.send("evm_mine");
    }
    
    // Verify all requesters still cannot claim (within cooldown)
    for (const requester of requesters) {
      const canClaim = await faucet.canClaim(requester.address);
      expect(canClaim).to.be.false;
    }
  });

  it("should correctly reflect eligibility across claim lifecycle (property test)", async function () {
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
      
      // Property: Initially, canClaim should return true (never claimed)
      const canClaimInitial = await faucet.canClaim(requester.address);
      expect(canClaimInitial).to.be.true;
      
      // First claim
      await faucet.connect(requester).claim();
      
      // Property: After claiming, canClaim should return false
      const canClaimAfterFirst = await faucet.canClaim(requester.address);
      expect(canClaimAfterFirst).to.be.false;
      
      // Advance time past cooldown
      const cooldownPeriod = await faucet.getCooldownPeriod();
      await ethers.provider.send("evm_increaseTime", [Number(cooldownPeriod) + 1]);
      await ethers.provider.send("evm_mine");
      
      // Property: After cooldown expires, canClaim should return true again
      const canClaimAfterCooldown = await faucet.canClaim(requester.address);
      expect(canClaimAfterCooldown).to.be.true;
    }
  });

  it("should return consistent results when called multiple times without state change (property test)", async function () {
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
      
      // Property: Multiple calls to canClaim should return same result
      const result1 = await faucet.canClaim(requester.address);
      const result2 = await faucet.canClaim(requester.address);
      const result3 = await faucet.canClaim(requester.address);
      
      expect(result1).to.equal(result2);
      expect(result2).to.equal(result3);
      expect(result1).to.be.false; // Should be false since within cooldown
    }
  });

  it("should work correctly for any address including non-EOA addresses (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      
      // Generate random address (could be EOA or contract address)
      const randomAddress = ethers.Wallet.createRandom().address;
      
      // Property: canClaim should return true for any address that has never claimed
      const canClaim = await faucet.canClaim(randomAddress);
      expect(canClaim).to.be.true;
      
      // Verify lastClaimTime is 0
      const lastClaimTime = await faucet.getLastClaimTime(randomAddress);
      expect(lastClaimTime).to.equal(0n);
    }
  });

  it("should reflect eligibility changes immediately after time advances (property test)", async function () {
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
      const claimTx = await faucet.connect(requester).claim();
      await claimTx.wait();
      
      const cooldownPeriod = await faucet.getCooldownPeriod();
      const lastClaimTime = await faucet.getLastClaimTime(requester.address);
      
      // Check eligibility at various points
      const checkPoints = [
        cooldownPeriod / 4n,
        cooldownPeriod / 2n,
        (cooldownPeriod * 3n) / 4n,
        cooldownPeriod - 2n, // Leave buffer for timing precision
        cooldownPeriod + 1n,
        cooldownPeriod + 10n,
      ];
      
      let cumulativeTime = 0n;
      
      for (const checkpoint of checkPoints) {
        const timeToAdvance = checkpoint - cumulativeTime;
        
        if (timeToAdvance > 0n) {
          await ethers.provider.send("evm_increaseTime", [Number(timeToAdvance)]);
          await ethers.provider.send("evm_mine");
          cumulativeTime = checkpoint;
        }
        
        const canClaim = await faucet.canClaim(requester.address);
        
        // Property: canClaim should be false before cooldown expires, true after
        // Use cooldownPeriod (not cooldownPeriod - 1) as the boundary
        if (checkpoint < cooldownPeriod) {
          expect(canClaim).to.be.false;
        } else {
          expect(canClaim).to.be.true;
        }
      }
    }
  });

  it("should maintain correct eligibility status across multiple claim cycles (property test)", async function () {
    const iterations = 20;
    
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
        value: ethers.parseEther("50"),
      });
      
      const cooldownPeriod = await faucet.getCooldownPeriod();
      const numCycles = 3; // Test 3 claim cycles
      
      for (let cycle = 0; cycle < numCycles; cycle++) {
        // Property: Before claiming, canClaim should return true
        const canClaimBefore = await faucet.canClaim(requester.address);
        expect(canClaimBefore).to.be.true;
        
        // Claim
        await faucet.connect(requester).claim();
        
        // Property: After claiming, canClaim should return false
        const canClaimAfter = await faucet.canClaim(requester.address);
        expect(canClaimAfter).to.be.false;
        
        // Advance time past cooldown for next cycle
        await ethers.provider.send("evm_increaseTime", [Number(cooldownPeriod) + 1]);
        await ethers.provider.send("evm_mine");
      }
    }
  });
});
