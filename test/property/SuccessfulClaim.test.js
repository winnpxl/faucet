import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Feature: eth-test-faucet, Property 1: Successful Claim Transfers Drip Amount and Emits Event
// For any eligible requester address and contract state with sufficient balance,
// when the requester calls claim(), the requester's balance SHALL increase by exactly
// the drip amount AND a Claim event SHALL be emitted with the requester address and drip amount.
// **Validates: Requirements 1.1, 1.2**

describe("Property 1: Successful Claim Transfers Drip Amount and Emits Event", function () {
  let EthTestFaucet;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    EthTestFaucet = await ethers.getContractFactory("EthTestFaucet");
  });

  it("should transfer exact drip amount and emit Claim event for eligible requesters (property test with 100+ iterations)", async function () {
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
      // Use varying amounts to test property holds regardless of contract balance
      const fundAmount = ethers.parseEther((Math.random() * 5 + 0.5).toFixed(18));
      await owner.sendTransaction({
        to: faucetAddress,
        value: fundAmount,
      });
      
      // Get drip amount from contract
      const dripAmount = await faucet.getDripAmount();
      
      // Record requester's balance before claim
      const balanceBefore = await ethers.provider.getBalance(requester.address);
      
      // Property: When eligible requester calls claim(), balance increases by drip amount
      const tx = await faucet.connect(requester).claim();
      const receipt = await tx.wait();
      
      // Calculate gas cost
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      // Get requester's balance after claim
      const balanceAfter = await ethers.provider.getBalance(requester.address);
      
      // Property verification: Balance increased by exactly drip amount (minus gas)
      const expectedBalance = balanceBefore + dripAmount - gasUsed;
      expect(balanceAfter).to.equal(expectedBalance);
      
      // Property verification: Claim event emitted with correct parameters
      const claimEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === "Claim"
      );
      expect(claimEvent).to.not.be.undefined;
      expect(claimEvent.args[0]).to.equal(requester.address);
      expect(claimEvent.args[1]).to.equal(dripAmount);
    }
  });

  it("should maintain property across different drip amounts (property test)", async function () {
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
      
      // Get the drip amount (should be default 0.1 ETH)
      const dripAmount = await faucet.getDripAmount();
      
      // Record balance before
      const balanceBefore = await ethers.provider.getBalance(requester.address);
      
      // Execute claim
      const tx = await faucet.connect(requester).claim();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      // Record balance after
      const balanceAfter = await ethers.provider.getBalance(requester.address);
      
      // Property: Balance increase equals drip amount exactly
      expect(balanceAfter).to.equal(balanceBefore + dripAmount - gasUsed);
      
      // Property: Event emitted with correct data
      await expect(tx)
        .to.emit(faucet, "Claim")
        .withArgs(requester.address, dripAmount);
    }
  });

  it("should handle first-time claimers correctly (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Get a unique requester for each iteration
      const signers = await ethers.getSigners();
      const requester = signers[(i % (signers.length - 1)) + 1];
      
      // Verify requester has never claimed (lastClaimTime should be 0)
      const lastClaimTime = await faucet.getLastClaimTime(requester.address);
      expect(lastClaimTime).to.equal(0n);
      
      // Fund the faucet
      await owner.sendTransaction({
        to: faucetAddress,
        value: ethers.parseEther("1"),
      });
      
      const dripAmount = await faucet.getDripAmount();
      const balanceBefore = await ethers.provider.getBalance(requester.address);
      
      // Property: First-time claimers should successfully claim
      const tx = await faucet.connect(requester).claim();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const balanceAfter = await ethers.provider.getBalance(requester.address);
      
      // Verify balance increased by drip amount
      expect(balanceAfter).to.equal(balanceBefore + dripAmount - gasUsed);
      
      // Verify event emitted
      await expect(tx)
        .to.emit(faucet, "Claim")
        .withArgs(requester.address, dripAmount);
      
      // Verify lastClaimTime was updated
      const newLastClaimTime = await faucet.getLastClaimTime(requester.address);
      expect(newLastClaimTime).to.be.gt(0n);
    }
  });

  it("should handle multiple different requesters claiming from same contract (property test)", async function () {
    // Deploy single contract
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    
    // Fund generously
    await owner.sendTransaction({
      to: faucetAddress,
      value: ethers.parseEther("100"),
    });
    
    const dripAmount = await faucet.getDripAmount();
    const signers = await ethers.getSigners();
    
    // Test with up to 20 different requesters
    const numRequesters = Math.min(20, signers.length - 1);
    
    for (let i = 0; i < numRequesters; i++) {
      const requester = signers[i + 1]; // Skip owner
      
      const balanceBefore = await ethers.provider.getBalance(requester.address);
      
      // Property: Each requester should successfully claim
      const tx = await faucet.connect(requester).claim();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const balanceAfter = await ethers.provider.getBalance(requester.address);
      
      // Verify balance increased correctly
      expect(balanceAfter).to.equal(balanceBefore + dripAmount - gasUsed);
      
      // Verify event emitted for each claim
      await expect(tx)
        .to.emit(faucet, "Claim")
        .withArgs(requester.address, dripAmount);
    }
  });

  it("should maintain contract balance consistency after claims (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund with random amount
      const fundAmount = ethers.parseEther((Math.random() * 10 + 1).toFixed(18));
      await owner.sendTransaction({
        to: faucetAddress,
        value: fundAmount,
      });
      
      const dripAmount = await faucet.getDripAmount();
      const contractBalanceBefore = await ethers.provider.getBalance(faucetAddress);
      
      // Get requester
      const signers = await ethers.getSigners();
      const requester = signers[(i % (signers.length - 1)) + 1];
      
      // Execute claim
      await faucet.connect(requester).claim();
      
      // Property: Contract balance should decrease by exactly drip amount
      const contractBalanceAfter = await ethers.provider.getBalance(faucetAddress);
      expect(contractBalanceAfter).to.equal(contractBalanceBefore - dripAmount);
    }
  });
});
