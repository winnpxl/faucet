import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("Withdraw Function - Unit Tests", function () {
    let faucet;
    let owner;
    let nonOwner;

    beforeEach(async function () {
        [owner, nonOwner] = await ethers.getSigners();
        
        const EthTestFaucet = await ethers.getContractFactory("EthTestFaucet");
        faucet = await EthTestFaucet.deploy();
        await faucet.waitForDeployment();
    });

    describe("Successful withdraw calls", function () {
        it("should allow owner to withdraw funds", async function () {
            // Fund the contract
            const depositAmount = ethers.parseEther("1.0");
            await owner.sendTransaction({
                to: await faucet.getAddress(),
                value: depositAmount
            });

            // Verify contract has funds
            expect(await faucet.getBalance()).to.equal(depositAmount);

            // Withdraw half the funds
            const withdrawAmount = ethers.parseEther("0.5");
            const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
            
            const tx = await faucet.withdraw(withdrawAmount);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            // Check owner balance increased (minus gas)
            const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
            expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + withdrawAmount - gasUsed);

            // Check contract balance decreased
            expect(await faucet.getBalance()).to.equal(depositAmount - withdrawAmount);
        });

        it("should emit Withdrawal event", async function () {
            // Fund the contract
            const depositAmount = ethers.parseEther("1.0");
            await owner.sendTransaction({
                to: await faucet.getAddress(),
                value: depositAmount
            });

            const withdrawAmount = ethers.parseEther("0.3");
            
            await expect(faucet.withdraw(withdrawAmount))
                .to.emit(faucet, "Withdrawal")
                .withArgs(owner.address, withdrawAmount);
        });

        it("should allow withdrawing entire balance", async function () {
            // Fund the contract
            const depositAmount = ethers.parseEther("2.0");
            await owner.sendTransaction({
                to: await faucet.getAddress(),
                value: depositAmount
            });

            // Withdraw entire balance
            await faucet.withdraw(depositAmount);
            
            // Contract should have zero balance
            expect(await faucet.getBalance()).to.equal(0);
        });
    });

    describe("Failed withdraw calls", function () {
        it("should revert when non-owner tries to withdraw", async function () {
            // Fund the contract
            const depositAmount = ethers.parseEther("1.0");
            await owner.sendTransaction({
                to: await faucet.getAddress(),
                value: depositAmount
            });

            const withdrawAmount = ethers.parseEther("0.5");
            
            await expect(faucet.connect(nonOwner).withdraw(withdrawAmount))
                .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
                .withArgs(nonOwner.address);
        });

        it("should revert when withdrawing more than balance", async function () {
            // Fund the contract with 1 ETH
            const depositAmount = ethers.parseEther("1.0");
            await owner.sendTransaction({
                to: await faucet.getAddress(),
                value: depositAmount
            });

            // Try to withdraw 2 ETH
            const withdrawAmount = ethers.parseEther("2.0");
            
            await expect(faucet.withdraw(withdrawAmount))
                .to.be.revertedWithCustomError(faucet, "InsufficientBalance")
                .withArgs(withdrawAmount, depositAmount);
        });

        it("should revert when withdrawing from empty contract", async function () {
            const withdrawAmount = ethers.parseEther("0.1");
            
            await expect(faucet.withdraw(withdrawAmount))
                .to.be.revertedWithCustomError(faucet, "InsufficientBalance")
                .withArgs(withdrawAmount, 0);
        });
    });

    describe("Edge cases", function () {
        it("should handle zero withdrawal amount", async function () {
            // Fund the contract
            const depositAmount = ethers.parseEther("1.0");
            await owner.sendTransaction({
                to: await faucet.getAddress(),
                value: depositAmount
            });

            // Withdraw zero amount (should succeed but do nothing)
            await expect(faucet.withdraw(0))
                .to.emit(faucet, "Withdrawal")
                .withArgs(owner.address, 0);
            
            // Balance should remain unchanged
            expect(await faucet.getBalance()).to.equal(depositAmount);
        });
    });
});