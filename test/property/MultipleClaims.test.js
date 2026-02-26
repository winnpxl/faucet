import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Feature: eth-test-faucet, Property 14: Multiple Claims Maintain Invariants
// For any sequence of valid claims by different requesters, the sum of all drip amounts
// transferred SHALL equal the decrease in contract balance, AND the number of Claim events
// emitted SHALL equal the number of successful claims.
// **Validates: Requirements 1.1, 1.2**

describe("Property 14: Multiple Claims Maintain Invariants", function () {
  let EthTestFaucet;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    EthTestFaucet = await ethers.getContractFactory("EthTestFaucet");
  });

  it("should maintain balance and event invariants across multiple claims by different requesters (property test with 100+ iterations)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      // Deploy fresh contract for each iteration
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund the faucet generously
      const initialFunding = ethers.parseEther("50");
      await owner.sendTransaction({
        to: faucetAddress,
        value: initialFunding,
      });
      
      const initialBalance = await ethers.provider.getBalance(faucetAddress);
      const dripAmount = await faucet.getDripAmount();
      
      // Generate random number of different requesters (2-15, limited by funding)
      const signers = await ethers.getSigners();
      const maxPossibleClaims = Math.floor(Number(initialFunding / dripAmount));
      const maxRequesters = Math.min(15, signers.length - 1, maxPossibleClaims); // Exclude owner and limit by funding
      const numRequesters = Math.floor(Math.random() * (maxRequesters - 1)) + 2; // 2-maxRequesters
      
      let totalDripAmountTransferred = 0n;
      let totalClaimEvents = 0;
      const claimTxs = [];
      
      // Have different requesters claim sequentially
      for (let j = 0; j < numRequesters; j++) {
        const requester = signers[j + 1]; // Skip owner at index 0
        
        // Execute claim
        const tx = await faucet.connect(requester).claim();
        const receipt = await tx.wait();
        claimTxs.push(receipt);
        
        // Track transferred amount
        totalDripAmountTransferred += dripAmount;
        
        // Count Claim events
        const claimEvents = receipt.logs.filter(
          log => log.fragment && log.fragment.name === "Claim"
        );
        totalClaimEvents += claimEvents.length;
      }
      
      // Get final contract balance
      const finalBalance = await ethers.provider.getBalance(faucetAddress);
      
      // Property 1: Sum of drip amounts equals decrease in contract balance
      const balanceDecrease = initialBalance - finalBalance;
      expect(totalDripAmountTransferred).to.equal(balanceDecrease);
      
      // Property 2: Number of Claim events equals number of successful claims
      expect(totalClaimEvents).to.equal(numRequesters);
      
      // Additional verification: Each claim event has correct parameters
      let eventCount = 0;
      for (let j = 0; j < claimTxs.length; j++) {
        const receipt = claimTxs[j];
        const requester = signers[j + 1];
        
        const claimEvent = receipt.logs.find(
          log => log.fragment && log.fragment.name === "Claim"
        );
        
        expect(claimEvent).to.not.be.undefined;
        expect(claimEvent.args[0]).to.equal(requester.address);
        expect(claimEvent.args[1]).to.equal(dripAmount);
        eventCount++;
      }
      
      expect(eventCount).to.equal(numRequesters);
    }
  });

  it("should maintain invariants with varying drip amounts (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Set random drip amount (0.01 to 1 ETH)
      const newDripAmount = ethers.parseEther((Math.random() * 0.99 + 0.01).toFixed(18));
      await faucet.setDripAmount(newDripAmount);
      
      // Fund generously based on drip amount
      const fundingMultiplier = BigInt(Math.floor(Math.random() * 20) + 10); // 10-30x drip amount
      const initialFunding = newDripAmount * fundingMultiplier;
      await owner.sendTransaction({
        to: faucetAddress,
        value: initialFunding,
      });
      
      const initialBalance = await ethers.provider.getBalance(faucetAddress);
      
      // Generate random number of requesters (limited by funding)
      const signers = await ethers.getSigners();
      const maxPossibleClaims = Math.floor(Number(initialFunding / newDripAmount));
      const maxRequesters = Math.min(10, signers.length - 1, maxPossibleClaims);
      const numRequesters = Math.floor(Math.random() * (maxRequesters - 1)) + 2;
      
      let totalTransferred = 0n;
      let eventCount = 0;
      
      // Execute claims
      for (let j = 0; j < numRequesters; j++) {
        const requester = signers[j + 1];
        
        const tx = await faucet.connect(requester).claim();
        const receipt = await tx.wait();
        
        totalTransferred += newDripAmount;
        
        // Count events
        const claimEvents = receipt.logs.filter(
          log => log.fragment && log.fragment.name === "Claim"
        );
        eventCount += claimEvents.length;
      }
      
      const finalBalance = await ethers.provider.getBalance(faucetAddress);
      const balanceDecrease = initialBalance - finalBalance;
      
      // Property: Invariants hold regardless of drip amount
      expect(totalTransferred).to.equal(balanceDecrease);
      expect(eventCount).to.equal(numRequesters);
    }
  });

  it("should maintain invariants when claims are interspersed with deposits (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Initial funding
      await owner.sendTransaction({
        to: faucetAddress,
        value: ethers.parseEther("20"),
      });
      
      const dripAmount = await faucet.getDripAmount();
      const signers = await ethers.getSigners();
      
      let totalClaimsTransferred = 0n;
      let totalClaimEvents = 0;
      let totalDeposits = 0n;
      
      // Track initial balance after funding
      let trackingBalance = await ethers.provider.getBalance(faucetAddress);
      
      // Perform sequence of claims and deposits with unique requesters
      const numClaims = Math.min(5, signers.length - 1); // Limit to available signers
      const numDeposits = Math.floor(Math.random() * 3) + 1; // 1-3 deposits
      
      // First do all claims with different requesters
      for (let j = 0; j < numClaims; j++) {
        const requester = signers[j + 1]; // Skip owner
        
        const contractBalance = await ethers.provider.getBalance(faucetAddress);
        if (contractBalance >= dripAmount) {
          try {
            const tx = await faucet.connect(requester).claim();
            const receipt = await tx.wait();
            
            totalClaimsTransferred += dripAmount;
            
            const claimEvents = receipt.logs.filter(
              log => log.fragment && log.fragment.name === "Claim"
            );
            totalClaimEvents += claimEvents.length;
          } catch (error) {
            // Claim might fail, that's ok for this test
          }
        }
      }
      
      // Then do deposits
      for (let j = 0; j < numDeposits; j++) {
        const depositor = signers[j % signers.length];
        const depositAmount = ethers.parseEther((Math.random() * 2 + 0.1).toFixed(18));
        
        await depositor.sendTransaction({
          to: faucetAddress,
          value: depositAmount,
        });
        
        totalDeposits += depositAmount;
      }
      
      // Final balance check
      const finalBalance = await ethers.provider.getBalance(faucetAddress);
      const expectedBalance = trackingBalance + totalDeposits - totalClaimsTransferred;
      
      // Property: Balance changes equal deposits minus claims
      expect(finalBalance).to.equal(expectedBalance);
      
      // Property: Claim events equal successful claims (deposits don't affect this)
      if (totalClaimEvents > 0) {
        expect(BigInt(totalClaimEvents) * dripAmount).to.equal(totalClaimsTransferred);
      }
    }
  });

  it("should maintain invariants across maximum possible claims (boundary test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      const dripAmount = await faucet.getDripAmount();
      const signers = await ethers.getSigners();
      
      // Calculate maximum possible claims based on available signers
      const maxPossibleClaims = signers.length - 1; // Exclude owner
      
      // Fund exactly enough for all possible claims plus small buffer
      const exactFunding = dripAmount * BigInt(maxPossibleClaims) + ethers.parseEther("0.01");
      await owner.sendTransaction({
        to: faucetAddress,
        value: exactFunding,
      });
      
      const initialBalance = await ethers.provider.getBalance(faucetAddress);
      
      let totalTransferred = 0n;
      let eventCount = 0;
      let successfulClaims = 0;
      
      // Have all available requesters claim
      for (let j = 1; j < signers.length; j++) { // Start from 1 to skip owner
        const requester = signers[j];
        
        try {
          const tx = await faucet.connect(requester).claim();
          const receipt = await tx.wait();
          
          totalTransferred += dripAmount;
          successfulClaims++;
          
          const claimEvents = receipt.logs.filter(
            log => log.fragment && log.fragment.name === "Claim"
          );
          eventCount += claimEvents.length;
        } catch (error) {
          // Expected to fail when balance is insufficient
          expect(error.message).to.include("InsufficientBalance");
        }
      }
      
      const finalBalance = await ethers.provider.getBalance(faucetAddress);
      const balanceDecrease = initialBalance - finalBalance;
      
      // Property: Balance decrease equals total transferred
      expect(totalTransferred).to.equal(balanceDecrease);
      
      // Property: Event count equals successful claims
      expect(eventCount).to.equal(successfulClaims);
      
      // Property: All transfers were of drip amount
      if (successfulClaims > 0) {
        expect(totalTransferred).to.equal(dripAmount * BigInt(successfulClaims));
      }
    }
  });

  it("should maintain invariants when some claims fail due to insufficient balance (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      const dripAmount = await faucet.getDripAmount();
      
      // Fund for only a random number of claims (1-10)
      const maxClaims = Math.floor(Math.random() * 10) + 1;
      const limitedFunding = dripAmount * BigInt(maxClaims);
      await owner.sendTransaction({
        to: faucetAddress,
        value: limitedFunding,
      });
      
      const initialBalance = await ethers.provider.getBalance(faucetAddress);
      const signers = await ethers.getSigners();
      
      let totalTransferred = 0n;
      let eventCount = 0;
      let successfulClaims = 0;
      let failedClaims = 0;
      
      // Attempt more claims than funding allows
      const attemptedClaims = Math.min(maxClaims + 5, signers.length - 1);
      
      for (let j = 0; j < attemptedClaims; j++) {
        const requester = signers[j + 1]; // Skip owner
        
        try {
          const tx = await faucet.connect(requester).claim();
          const receipt = await tx.wait();
          
          totalTransferred += dripAmount;
          successfulClaims++;
          
          const claimEvents = receipt.logs.filter(
            log => log.fragment && log.fragment.name === "Claim"
          );
          eventCount += claimEvents.length;
        } catch (error) {
          failedClaims++;
          // Should fail with InsufficientBalance when funds run out
          expect(error.message).to.include("InsufficientBalance");
        }
      }
      
      const finalBalance = await ethers.provider.getBalance(faucetAddress);
      const balanceDecrease = initialBalance - finalBalance;
      
      // Property: Only successful claims affect balance and events
      expect(totalTransferred).to.equal(balanceDecrease);
      expect(eventCount).to.equal(successfulClaims);
      
      // Property: Failed claims don't affect invariants
      expect(successfulClaims + failedClaims).to.equal(attemptedClaims);
      
      // Property: Successful claims should equal expected maximum
      expect(successfulClaims).to.equal(maxClaims);
    }
  });

  it("should maintain precise accounting across large sequences of claims (stress test)", async function () {
    const iterations = 20; // Fewer iterations due to complexity
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund very generously
      await owner.sendTransaction({
        to: faucetAddress,
        value: ethers.parseEther("100"),
      });
      
      const dripAmount = await faucet.getDripAmount();
      const signers = await ethers.getSigners();
      
      // Use all available signers except owner
      const requesters = signers.slice(1);
      
      let cumulativeTransferred = 0n;
      let cumulativeEvents = 0;
      
      // Track balance at each step
      let previousBalance = await ethers.provider.getBalance(faucetAddress);
      
      for (let j = 0; j < requesters.length; j++) {
        const requester = requesters[j];
        
        const tx = await faucet.connect(requester).claim();
        const receipt = await tx.wait();
        
        // Update cumulative tracking
        cumulativeTransferred += dripAmount;
        
        const claimEvents = receipt.logs.filter(
          log => log.fragment && log.fragment.name === "Claim"
        );
        cumulativeEvents += claimEvents.length;
        
        // Verify balance decreased by exactly drip amount
        const currentBalance = await ethers.provider.getBalance(faucetAddress);
        expect(previousBalance - currentBalance).to.equal(dripAmount);
        
        // Verify cumulative invariants hold at each step
        const totalDecrease = await ethers.provider.getBalance(faucetAddress);
        const initialBalance = ethers.parseEther("100");
        expect(cumulativeTransferred).to.equal(initialBalance - totalDecrease);
        expect(cumulativeEvents).to.equal(j + 1);
        
        previousBalance = currentBalance;
      }
      
      // Final verification
      const finalBalance = await ethers.provider.getBalance(faucetAddress);
      const totalDecrease = ethers.parseEther("100") - finalBalance;
      
      expect(cumulativeTransferred).to.equal(totalDecrease);
      expect(cumulativeEvents).to.equal(requesters.length);
    }
  });
});