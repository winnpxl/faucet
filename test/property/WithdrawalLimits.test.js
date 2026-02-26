import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Feature: eth-test-faucet, Property 11: Withdrawal Exceeding Balance Reverts
// For any amount greater than the contract balance, when the owner calls withdraw() with that amount,
// the transaction SHALL revert with an insufficient balance error.
// **Validates: Requirements 4.5**

describe("Property 11: Withdrawal Exceeding Balance Reverts", function () {
  let EthTestFaucet;
  let owner;
  let nonOwner;

  beforeEach(async function () {
    [owner, nonOwner] = await ethers.getSigners();
    EthTestFaucet = await ethers.getContractFactory("EthTestFaucet");
  });

  it("should revert with InsufficientBalance when withdrawal amount exceeds contract balance (property test with 100+ iterations)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      // Deploy fresh contract for each iteration
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Generate random contract funding amount (0 to 10 ETH)
      const fundAmount = ethers.parseEther((Math.random() * 10).toFixed(18));
      
      // Fund the contract (may be zero for some iterations)
      if (fundAmount > 0n) {
        await owner.sendTransaction({
          to: faucetAddress,
          value: fundAmount,
        });
      }
      
      // Get current contract balance
      const contractBalance = await ethers.provider.getBalance(faucetAddress);
      
      // Generate withdrawal amount that exceeds balance
      // Add random amount between 1 wei and 10 ETH to the current balance
      const excessAmount = ethers.parseEther((Math.random() * 10 + 0.000000000000000001).toFixed(18));
      const withdrawAmount = contractBalance + excessAmount;
      
      // Property: When owner calls withdraw() with amount > contract balance,
      // transaction SHALL revert with InsufficientBalance error
      await expect(faucet.connect(owner).withdraw(withdrawAmount))
        .to.be.revertedWithCustomError(faucet, "InsufficientBalance")
        .withArgs(withdrawAmount, contractBalance);
    }
  });

  it("should revert when attempting to withdraw from empty contract (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      // Deploy fresh contract with zero balance
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      
      // Verify contract balance is zero
      const contractBalance = await faucet.getBalance();
      expect(contractBalance).to.equal(0n);
      
      // Generate random positive withdrawal amount
      const withdrawAmount = ethers.parseEther((Math.random() * 5 + 0.000000000000000001).toFixed(18));
      
      // Property: Any positive withdrawal from empty contract should revert
      await expect(faucet.connect(owner).withdraw(withdrawAmount))
        .to.be.revertedWithCustomError(faucet, "InsufficientBalance")
        .withArgs(withdrawAmount, 0n);
    }
  });

  it("should revert with correct error parameters for various excess amounts (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund contract with random amount
      const fundAmount = ethers.parseEther((Math.random() * 5 + 1).toFixed(18));
      await owner.sendTransaction({
        to: faucetAddress,
        value: fundAmount,
      });
      
      const contractBalance = await faucet.getBalance();
      
      // Generate various excess amounts
      const excessMultiplier = Math.random() * 10 + 1.1; // 1.1x to 11.1x the balance
      const withdrawAmount = (contractBalance * BigInt(Math.floor(excessMultiplier * 1000))) / 1000n;
      
      // Ensure withdrawal amount actually exceeds balance
      expect(withdrawAmount).to.be.gt(contractBalance);
      
      // Property: Error should contain correct requested and available amounts
      await expect(faucet.connect(owner).withdraw(withdrawAmount))
        .to.be.revertedWithCustomError(faucet, "InsufficientBalance")
        .withArgs(withdrawAmount, contractBalance);
    }
  });

  it("should revert when withdrawal exceeds balance by exactly 1 wei (boundary test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund contract with random amount
      const fundAmount = ethers.parseEther((Math.random() * 3 + 1).toFixed(18));
      await owner.sendTransaction({
        to: faucetAddress,
        value: fundAmount,
      });
      
      const contractBalance = await faucet.getBalance();
      
      // Attempt to withdraw exactly 1 wei more than balance
      const withdrawAmount = contractBalance + 1n;
      
      // Property: Even 1 wei excess should cause revert
      await expect(faucet.connect(owner).withdraw(withdrawAmount))
        .to.be.revertedWithCustomError(faucet, "InsufficientBalance")
        .withArgs(withdrawAmount, contractBalance);
    }
  });

  it("should revert after partial withdrawals when attempting to exceed remaining balance (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund contract with substantial amount
      const initialFundAmount = ethers.parseEther((Math.random() * 10 + 5).toFixed(18));
      await owner.sendTransaction({
        to: faucetAddress,
        value: initialFundAmount,
      });
      
      // Perform a successful partial withdrawal
      const partialWithdrawAmount = initialFundAmount / 3n; // Withdraw 1/3
      await faucet.connect(owner).withdraw(partialWithdrawAmount);
      
      // Get remaining balance after partial withdrawal
      const remainingBalance = await faucet.getBalance();
      expect(remainingBalance).to.equal(initialFundAmount - partialWithdrawAmount);
      
      // Generate withdrawal amount that exceeds remaining balance
      const excessAmount = ethers.parseEther((Math.random() * 5 + 0.000000000000000001).toFixed(18));
      const excessiveWithdrawAmount = remainingBalance + excessAmount;
      
      // Property: Withdrawal exceeding remaining balance should revert
      await expect(faucet.connect(owner).withdraw(excessiveWithdrawAmount))
        .to.be.revertedWithCustomError(faucet, "InsufficientBalance")
        .withArgs(excessiveWithdrawAmount, remainingBalance);
    }
  });

  it("should revert when attempting to withdraw more than balance after claims reduce contract funds (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund contract with amount sufficient for multiple claims
      const dripAmount = await faucet.getDripAmount();
      const numClaims = Math.floor(Math.random() * 5) + 2; // 2-6 claims
      const fundAmount = dripAmount * BigInt(numClaims) + ethers.parseEther("1"); // Extra 1 ETH
      
      await owner.sendTransaction({
        to: faucetAddress,
        value: fundAmount,
      });
      
      // Perform some claims to reduce contract balance
      const signers = await ethers.getSigners();
      const claimsToPerform = Math.floor(Math.random() * numClaims) + 1;
      
      for (let j = 0; j < claimsToPerform; j++) {
        const claimer = signers[j + 1]; // Skip owner
        await faucet.connect(claimer).claim();
      }
      
      // Get remaining balance after claims
      const remainingBalance = await faucet.getBalance();
      
      // Generate withdrawal amount that exceeds remaining balance
      const excessAmount = ethers.parseEther((Math.random() * 3 + 0.1).toFixed(18));
      const withdrawAmount = remainingBalance + excessAmount;
      
      // Property: Withdrawal exceeding balance after claims should revert
      await expect(faucet.connect(owner).withdraw(withdrawAmount))
        .to.be.revertedWithCustomError(faucet, "InsufficientBalance")
        .withArgs(withdrawAmount, remainingBalance);
    }
  });

  it("should revert with maximum uint256 withdrawal amount (edge case test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    
    // Fund contract with reasonable amount
    const fundAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: faucetAddress,
      value: fundAmount,
    });
    
    const contractBalance = await faucet.getBalance();
    
    // Attempt to withdraw maximum uint256 value
    const maxUint256 = ethers.MaxUint256;
    
    // Property: Maximum uint256 withdrawal should revert with InsufficientBalance
    await expect(faucet.connect(owner).withdraw(maxUint256))
      .to.be.revertedWithCustomError(faucet, "InsufficientBalance")
      .withArgs(maxUint256, contractBalance);
  });

  it("should revert consistently across multiple contract state changes (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund contract
      const fundAmount = ethers.parseEther((Math.random() * 5 + 2).toFixed(18));
      await owner.sendTransaction({
        to: faucetAddress,
        value: fundAmount,
      });
      
      // Perform various state changes
      const newDripAmount = ethers.parseEther((Math.random() * 1 + 0.1).toFixed(18));
      const newCooldownPeriod = BigInt(Math.floor(Math.random() * 86400) + 3600);
      
      await faucet.connect(owner).setDripAmount(newDripAmount);
      await faucet.connect(owner).setCooldownPeriod(newCooldownPeriod);
      
      // Get current balance
      const contractBalance = await faucet.getBalance();
      
      // Generate excessive withdrawal amount
      const withdrawAmount = contractBalance + ethers.parseEther((Math.random() * 2 + 1).toFixed(18));
      
      // Property: Withdrawal limits should work regardless of other state changes
      await expect(faucet.connect(owner).withdraw(withdrawAmount))
        .to.be.revertedWithCustomError(faucet, "InsufficientBalance")
        .withArgs(withdrawAmount, contractBalance);
      
      // Property: Other state should remain unchanged after failed withdrawal
      expect(await faucet.getDripAmount()).to.equal(newDripAmount);
      expect(await faucet.getCooldownPeriod()).to.equal(newCooldownPeriod);
      expect(await faucet.getBalance()).to.equal(contractBalance);
    }
  });

  it("should revert when non-owner attempts excessive withdrawal (access control + limit test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    
    // Fund contract
    const fundAmount = ethers.parseEther("5");
    await owner.sendTransaction({
      to: faucetAddress,
      value: fundAmount,
    });
    
    const contractBalance = await faucet.getBalance();
    const excessiveAmount = contractBalance + ethers.parseEther("1");
    
    // Property: Non-owner should be rejected before balance check
    // Note: This tests that access control is checked first
    await expect(faucet.connect(nonOwner).withdraw(excessiveAmount))
      .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
      .withArgs(nonOwner.address);
  });

  it("should handle precision edge cases with wei-level excess amounts (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund with precise amount
      const fundAmount = ethers.parseEther("1.234567890123456789");
      await owner.sendTransaction({
        to: faucetAddress,
        value: fundAmount,
      });
      
      const contractBalance = await faucet.getBalance();
      
      // Generate small excess amounts (1 to 1000 wei)
      const smallExcess = BigInt(Math.floor(Math.random() * 1000) + 1);
      const withdrawAmount = contractBalance + smallExcess;
      
      // Property: Even tiny excess amounts should cause revert
      await expect(faucet.connect(owner).withdraw(withdrawAmount))
        .to.be.revertedWithCustomError(faucet, "InsufficientBalance")
        .withArgs(withdrawAmount, contractBalance);
    }
  });

  it("should revert after deposits and withdrawals create complex balance scenarios (property test)", async function () {
    const iterations = 30;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Perform complex sequence of deposits and withdrawals
      let expectedBalance = 0n;
      
      // Multiple deposits from different sources
      const signers = await ethers.getSigners();
      for (let j = 0; j < 3; j++) {
        const depositor = signers[j];
        const depositAmount = ethers.parseEther((Math.random() * 2 + 0.5).toFixed(18));
        await depositor.sendTransaction({
          to: faucetAddress,
          value: depositAmount,
        });
        expectedBalance += depositAmount;
      }
      
      // Perform some withdrawals
      const numWithdrawals = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < numWithdrawals; j++) {
        const withdrawAmount = expectedBalance / BigInt(numWithdrawals + 1); // Safe amount
        if (withdrawAmount > 0n) {
          await faucet.connect(owner).withdraw(withdrawAmount);
          expectedBalance -= withdrawAmount;
        }
      }
      
      // Verify our tracking matches actual balance
      const actualBalance = await faucet.getBalance();
      expect(actualBalance).to.equal(expectedBalance);
      
      // Now attempt excessive withdrawal
      const excessAmount = ethers.parseEther((Math.random() * 5 + 1).toFixed(18));
      const withdrawAmount = actualBalance + excessAmount;
      
      // Property: Withdrawal should revert with correct balance information
      await expect(faucet.connect(owner).withdraw(withdrawAmount))
        .to.be.revertedWithCustomError(faucet, "InsufficientBalance")
        .withArgs(withdrawAmount, actualBalance);
    }
  });
});