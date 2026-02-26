import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Feature: eth-test-faucet, Property 12: State Getters Return Current Values
// For any contract state, the public getter functions SHALL return the current values:
// getDripAmount() returns the current drip amount, getCooldownPeriod() returns the current cooldown period,
// getOwner() returns the owner address, and getBalance() returns the current contract ETH balance.
// Validates: Requirements 6.1, 6.2, 6.3, 6.4

describe("Property 12: State Getters Return Current Values", function () {
  let EthTestFaucet;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    EthTestFaucet = await ethers.getContractFactory("EthTestFaucet");
  });

  it("should return correct initial state values after deployment", async function () {
    // Deploy the contract
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();

    // Property: getDripAmount() returns the current drip amount
    const dripAmount = await faucet.getDripAmount();
    const expectedDripAmount = ethers.parseEther("0.1");
    expect(dripAmount).to.equal(expectedDripAmount);

    // Property: getCooldownPeriod() returns the current cooldown period
    const cooldownPeriod = await faucet.getCooldownPeriod();
    const expectedCooldownPeriod = 24n * 60n * 60n; // 24 hours in seconds
    expect(cooldownPeriod).to.equal(expectedCooldownPeriod);

    // Property: getOwner() returns the owner address
    const ownerAddress = await faucet.getOwner();
    expect(ownerAddress).to.equal(owner.address);

    // Property: getBalance() returns the current contract ETH balance
    const balance = await faucet.getBalance();
    expect(balance).to.equal(0n); // Initially zero
  });

  it("should return correct balance after receiving ETH (property test with multiple amounts)", async function () {
    // Run property test with 100+ iterations using different ETH amounts
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      // Deploy fresh contract for each iteration
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      
      // Generate pseudo-random ETH amount between 0.001 and 10 ETH
      const randomAmount = ethers.parseEther(
        (Math.random() * 9.999 + 0.001).toFixed(18)
      );
      
      // Send ETH to the contract
      await owner.sendTransaction({
        to: await faucet.getAddress(),
        value: randomAmount,
      });
      
      // Property: getBalance() SHALL return the current contract ETH balance
      const balance = await faucet.getBalance();
      expect(balance).to.equal(randomAmount);
      
      // Also verify using ethers provider
      const providerBalance = await ethers.provider.getBalance(
        await faucet.getAddress()
      );
      expect(balance).to.equal(providerBalance);
    }
  });

  it("should return correct state values across multiple deployments (property test)", async function () {
    // Run property test with 100 iterations
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      // Deploy fresh contract
      const faucet = await EthTestFaucet.deploy();
      await faucet.waitForDeployment();
      
      // Property: All getters return correct initial values
      const dripAmount = await faucet.getDripAmount();
      const cooldownPeriod = await faucet.getCooldownPeriod();
      const ownerAddress = await faucet.getOwner();
      const balance = await faucet.getBalance();
      
      // Verify all properties hold
      expect(dripAmount).to.equal(ethers.parseEther("0.1"));
      expect(cooldownPeriod).to.equal(24n * 60n * 60n);
      expect(ownerAddress).to.equal(owner.address);
      expect(balance).to.equal(0n);
    }
  });

  it("should return correct owner address regardless of deployer (property test)", async function () {
    // Test with different deployers to verify getOwner() always returns correct value
    const signers = await ethers.getSigners();
    const testSigners = signers.slice(0, Math.min(10, signers.length));
    
    for (const signer of testSigners) {
      // Deploy contract with different signer
      const FaucetFactory = await ethers.getContractFactory("EthTestFaucet", signer);
      const faucet = await FaucetFactory.deploy();
      await faucet.waitForDeployment();
      
      // Property: getOwner() SHALL return the deployer's address
      const ownerAddress = await faucet.getOwner();
      expect(ownerAddress).to.equal(signer.address);
    }
  });

  it("should maintain getter consistency after multiple balance changes (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    
    let expectedBalance = 0n;
    
    // Run 50 iterations of balance changes
    for (let i = 0; i < 50; i++) {
      // Generate random deposit amount
      const depositAmount = ethers.parseEther(
        (Math.random() * 0.5 + 0.01).toFixed(18)
      );
      
      // Send ETH to contract
      await owner.sendTransaction({
        to: await faucet.getAddress(),
        value: depositAmount,
      });
      
      expectedBalance += depositAmount;
      
      // Property: getBalance() SHALL always return current balance
      const balance = await faucet.getBalance();
      expect(balance).to.equal(expectedBalance);
      
      // Property: Other getters remain unchanged
      expect(await faucet.getDripAmount()).to.equal(ethers.parseEther("0.1"));
      expect(await faucet.getCooldownPeriod()).to.equal(24n * 60n * 60n);
      expect(await faucet.getOwner()).to.equal(owner.address);
    }
  });

  it("should return zero for lastClaimTime of addresses that never claimed (property test)", async function () {
    const faucet = await EthTestFaucet.deploy();
    await faucet.waitForDeployment();
    
    // Test with multiple random addresses
    const signers = await ethers.getSigners();
    const testAddresses = signers.slice(0, Math.min(20, signers.length));
    
    for (const signer of testAddresses) {
      // Property: getLastClaimTime() SHALL return 0 for addresses that never claimed
      const lastClaimTime = await faucet.getLastClaimTime(signer.address);
      expect(lastClaimTime).to.equal(0n);
    }
  });
});
