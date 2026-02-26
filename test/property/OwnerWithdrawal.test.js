import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Feature: eth-test-faucet, Property 10: Owner Withdrawal Transfers Funds
// For any amount less than or equal to the contract balance, when the owner calls withdraw() with that amount,
// the owner's balance SHALL increase by that amount, the contract balance SHALL decrease by that amount,
// AND a Withdrawal event SHALL be emitted.
// **Validates: Requirements 4.4**

describe("Property 10: Owner Withdrawal Transfers Funds", function () {
  let EthTestFaucet;
  let owner;
  let nonOwner;

  beforeEach(async function () {
    [owner, nonOwner] = await ethers.getSigners();
    EthTestFaucet = await ethers.getContractFactory("EthTestFaucet");
  });

  it("should transfer exact withdrawal amount to owner and decrease contract balance (property test with 100+ iterations)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      // Deploy fresh contract for each iteration
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Generate random contract funding amount (1 to 10 ETH)
      const fundAmount = ethers.parseEther((Math.random() * 9 + 1).toFixed(18));
      
      // Fund the contract
      await owner.sendTransaction({
        to: faucetAddress,
        value: fundAmount,
      });
      
      // Generate random withdrawal amount (between 1% and 100% of contract balance)
      const withdrawalPercentage = Math.random() * 0.99 + 0.01; // 1% to 100%
      const withdrawAmount = (fundAmount * BigInt(Math.floor(withdrawalPercentage * 1000))) / 1000n;
      
      // Record balances before withdrawal
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const contractBalanceBefore = await ethers.provider.getBalance(faucetAddress);
      
      // Property: When owner calls withdraw() with amount <= contract balance,
      // owner's balance increases by that amount and contract balance decreases by that amount
      const tx = await faucet.connect(owner).withdraw(withdrawAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      // Get balances after withdrawal
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const contractBalanceAfter = await ethers.provider.getBalance(faucetAddress);
      
      // Property verification: Owner's balance increased by withdrawal amount (minus gas)
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + withdrawAmount - gasUsed);
      
      // Property verification: Contract balance decreased by exact withdrawal amount
      expect(contractBalanceAfter).to.equal(contractBalanceBefore - withdrawAmount);
      
      // Property verification: Withdrawal event emitted with correct parameters
      await expect(tx)
        .to.emit(faucet, "Withdrawal")
        .withArgs(owner.address, withdrawAmount);
    }
  });

  it("should handle edge case withdrawal amounts (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    
    // Fund the contract with a substantial amount
    const fundAmount = ethers.parseEther("100");
    await owner.sendTransaction({
      to: faucetAddress,
      value: fundAmount,
    });
    
    // Test edge case withdrawal amounts
    const edgeCases = [
      1n, // Minimum positive value (1 wei)
      ethers.parseEther("0.000000000000000001"), // 1 wei in parseEther format
      fundAmount / 2n, // Exactly half the balance
      fundAmount - 1n, // Almost full balance (leave 1 wei)
      fundAmount, // Exact full balance
    ];
    
    let currentBalance = fundAmount;
    
    for (const withdrawAmount of edgeCases) {
      // Skip if withdrawal amount exceeds current balance
      if (withdrawAmount > currentBalance) continue;
      
      // Record balances before withdrawal
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const contractBalanceBefore = await ethers.provider.getBalance(faucetAddress);
      
      // Execute withdrawal
      const tx = await faucet.connect(owner).withdraw(withdrawAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      // Get balances after withdrawal
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const contractBalanceAfter = await ethers.provider.getBalance(faucetAddress);
      
      // Property: Owner balance increases by withdrawal amount (minus gas)
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + withdrawAmount - gasUsed);
      
      // Property: Contract balance decreases by exact withdrawal amount
      expect(contractBalanceAfter).to.equal(contractBalanceBefore - withdrawAmount);
      
      // Property: Event emitted correctly
      await expect(tx)
        .to.emit(faucet, "Withdrawal")
        .withArgs(owner.address, withdrawAmount);
      
      // Update current balance for next iteration
      currentBalance = contractBalanceAfter;
    }
  });

  it("should handle zero withdrawal amount correctly (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund the contract with random amount
      const fundAmount = ethers.parseEther((Math.random() * 5 + 1).toFixed(18));
      await owner.sendTransaction({
        to: faucetAddress,
        value: fundAmount,
      });
      
      // Record balances before zero withdrawal
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const contractBalanceBefore = await ethers.provider.getBalance(faucetAddress);
      
      // Property: Zero withdrawal should succeed but not transfer any funds
      const tx = await faucet.connect(owner).withdraw(0);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      // Get balances after withdrawal
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const contractBalanceAfter = await ethers.provider.getBalance(faucetAddress);
      
      // Property: Owner balance decreases only by gas (no withdrawal amount)
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore - gasUsed);
      
      // Property: Contract balance remains unchanged
      expect(contractBalanceAfter).to.equal(contractBalanceBefore);
      
      // Property: Event still emitted with zero amount
      await expect(tx)
        .to.emit(faucet, "Withdrawal")
        .withArgs(owner.address, 0);
    }
  });

  it("should handle multiple sequential withdrawals correctly (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    
    // Fund the contract with substantial amount
    const initialFundAmount = ethers.parseEther("50");
    await owner.sendTransaction({
      to: faucetAddress,
      value: initialFundAmount,
    });
    
    let remainingBalance = initialFundAmount;
    let totalWithdrawn = 0n;
    
    // Perform 20 sequential withdrawals
    for (let i = 0; i < 20; i++) {
      // Generate withdrawal amount (5% to 25% of remaining balance)
      const withdrawalPercentage = Math.random() * 0.2 + 0.05; // 5% to 25%
      const withdrawAmount = (remainingBalance * BigInt(Math.floor(withdrawalPercentage * 1000))) / 1000n;
      
      // Skip if withdrawal would be zero
      if (withdrawAmount === 0n) continue;
      
      // Record balances before withdrawal
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const contractBalanceBefore = await ethers.provider.getBalance(faucetAddress);
      
      // Execute withdrawal
      const tx = await faucet.connect(owner).withdraw(withdrawAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      // Get balances after withdrawal
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const contractBalanceAfter = await ethers.provider.getBalance(faucetAddress);
      
      // Property: Each withdrawal transfers exact amount
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + withdrawAmount - gasUsed);
      expect(contractBalanceAfter).to.equal(contractBalanceBefore - withdrawAmount);
      
      // Property: Event emitted for each withdrawal
      await expect(tx)
        .to.emit(faucet, "Withdrawal")
        .withArgs(owner.address, withdrawAmount);
      
      // Update tracking variables
      remainingBalance = contractBalanceAfter;
      totalWithdrawn += withdrawAmount;
      
      // Property: Total withdrawn plus remaining balance equals initial funding
      expect(totalWithdrawn + remainingBalance).to.equal(initialFundAmount);
    }
  });

  it("should maintain withdrawal functionality after contract state changes (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund the contract
      const fundAmount = ethers.parseEther((Math.random() * 10 + 2).toFixed(18));
      await owner.sendTransaction({
        to: faucetAddress,
        value: fundAmount,
      });
      
      // Perform some state-changing operations
      const newDripAmount = ethers.parseEther((Math.random() * 2 + 0.1).toFixed(18));
      const newCooldownPeriod = BigInt(Math.floor(Math.random() * 86400) + 3600);
      
      await faucet.connect(owner).setDripAmount(newDripAmount);
      await faucet.connect(owner).setCooldownPeriod(newCooldownPeriod);
      
      // Generate withdrawal amount
      const withdrawAmount = fundAmount / 3n; // Withdraw 1/3 of balance
      
      // Record balances before withdrawal
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const contractBalanceBefore = await ethers.provider.getBalance(faucetAddress);
      
      // Property: Withdrawal should work correctly after state changes
      const tx = await faucet.connect(owner).withdraw(withdrawAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      // Get balances after withdrawal
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const contractBalanceAfter = await ethers.provider.getBalance(faucetAddress);
      
      // Property verification: Withdrawal transfers correct amounts
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + withdrawAmount - gasUsed);
      expect(contractBalanceAfter).to.equal(contractBalanceBefore - withdrawAmount);
      
      // Property verification: Event emitted correctly
      await expect(tx)
        .to.emit(faucet, "Withdrawal")
        .withArgs(owner.address, withdrawAmount);
      
      // Property: Other state should remain unchanged
      expect(await faucet.getDripAmount()).to.equal(newDripAmount);
      expect(await faucet.getCooldownPeriod()).to.equal(newCooldownPeriod);
    }
  });

  it("should handle withdrawals with varying contract funding patterns (property test)", async function () {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Create varying funding patterns
      const fundingPattern = i % 4;
      let totalFunded = 0n;
      
      switch (fundingPattern) {
        case 0: // Single large deposit
          const singleAmount = ethers.parseEther((Math.random() * 10 + 1).toFixed(18));
          await owner.sendTransaction({ to: faucetAddress, value: singleAmount });
          totalFunded = singleAmount;
          break;
          
        case 1: // Multiple small deposits
          for (let j = 0; j < 5; j++) {
            const smallAmount = ethers.parseEther((Math.random() * 1 + 0.1).toFixed(18));
            await owner.sendTransaction({ to: faucetAddress, value: smallAmount });
            totalFunded += smallAmount;
          }
          break;
          
        case 2: // Mixed deposit sizes
          const amounts = [
            ethers.parseEther("0.01"),
            ethers.parseEther("1"),
            ethers.parseEther("0.5"),
            ethers.parseEther("2"),
          ];
          for (const amount of amounts) {
            await owner.sendTransaction({ to: faucetAddress, value: amount });
            totalFunded += amount;
          }
          break;
          
        case 3: // Deposits from different addresses
          const signers = await ethers.getSigners();
          for (let j = 0; j < 3; j++) {
            const depositor = signers[j + 1]; // Skip owner
            const amount = ethers.parseEther((Math.random() * 2 + 0.5).toFixed(18));
            await depositor.sendTransaction({ to: faucetAddress, value: amount });
            totalFunded += amount;
          }
          break;
      }
      
      // Generate withdrawal amount (10% to 90% of total funded)
      const withdrawalPercentage = Math.random() * 0.8 + 0.1; // 10% to 90%
      const withdrawAmount = (totalFunded * BigInt(Math.floor(withdrawalPercentage * 1000))) / 1000n;
      
      // Record balances before withdrawal
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const contractBalanceBefore = await ethers.provider.getBalance(faucetAddress);
      
      // Property: Withdrawal should work regardless of funding pattern
      const tx = await faucet.connect(owner).withdraw(withdrawAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      // Get balances after withdrawal
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const contractBalanceAfter = await ethers.provider.getBalance(faucetAddress);
      
      // Property verification: Correct fund transfer
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + withdrawAmount - gasUsed);
      expect(contractBalanceAfter).to.equal(contractBalanceBefore - withdrawAmount);
      
      // Property verification: Event emitted
      await expect(tx)
        .to.emit(faucet, "Withdrawal")
        .withArgs(owner.address, withdrawAmount);
      
      // Property: Contract balance should equal total funded minus withdrawn
      expect(contractBalanceAfter).to.equal(totalFunded - withdrawAmount);
    }
  });

  it("should verify getBalance() accuracy after withdrawals (property test)", async function () {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      const faucetAddress = await faucet.getAddress();
      
      // Fund the contract
      const fundAmount = ethers.parseEther((Math.random() * 5 + 1).toFixed(18));
      await owner.sendTransaction({
        to: faucetAddress,
        value: fundAmount,
      });
      
      // Generate withdrawal amount
      const withdrawAmount = fundAmount / 2n; // Withdraw half
      
      // Execute withdrawal
      await faucet.connect(owner).withdraw(withdrawAmount);
      
      // Property: getBalance() should return accurate contract balance
      const contractBalance = await faucet.getBalance();
      const providerBalance = await ethers.provider.getBalance(faucetAddress);
      const expectedBalance = fundAmount - withdrawAmount;
      
      expect(contractBalance).to.equal(expectedBalance);
      expect(contractBalance).to.equal(providerBalance);
    }
  });

  it("should handle withdrawal with maximum precision amounts (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    
    // Fund with precise amount
    const fundAmount = ethers.parseEther("3.141592653589793238");
    await owner.sendTransaction({
      to: faucetAddress,
      value: fundAmount,
    });
    
    // Test withdrawals with high precision amounts
    const preciseAmounts = [
      ethers.parseEther("0.000000000000000001"), // 1 wei
      ethers.parseEther("1.234567890123456789"), // High precision
      ethers.parseEther("0.999999999999999999"), // Almost 1 ETH
      ethers.parseEther("2.718281828459045235"), // e (mathematical constant)
    ];
    
    let remainingBalance = fundAmount;
    
    for (const withdrawAmount of preciseAmounts) {
      // Skip if withdrawal exceeds remaining balance
      if (withdrawAmount > remainingBalance) continue;
      
      // Record balances before withdrawal
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const contractBalanceBefore = await ethers.provider.getBalance(faucetAddress);
      
      // Execute withdrawal
      const tx = await faucet.connect(owner).withdraw(withdrawAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      // Get balances after withdrawal
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const contractBalanceAfter = await ethers.provider.getBalance(faucetAddress);
      
      // Property: Precise amounts should be transferred exactly
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + withdrawAmount - gasUsed);
      expect(contractBalanceAfter).to.equal(contractBalanceBefore - withdrawAmount);
      
      // Property: Event emitted with precise amount
      await expect(tx)
        .to.emit(faucet, "Withdrawal")
        .withArgs(owner.address, withdrawAmount);
      
      // Update remaining balance
      remainingBalance = contractBalanceAfter;
    }
  });
});