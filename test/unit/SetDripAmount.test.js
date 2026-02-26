import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("setDripAmount Function - Unit Tests", function () {
    let faucet;
    let owner;
    let nonOwner;

    beforeEach(async function () {
        [owner, nonOwner] = await ethers.getSigners();
        
        const EthTestFaucet = await ethers.getContractFactory("EthTestFaucet");
        faucet = await EthTestFaucet.deploy();
    });

    describe("Successful setDripAmount calls", function () {
        it("should allow owner to set drip amount", async function () {
            const newAmount = ethers.parseEther("0.2");
            
            await expect(faucet.connect(owner).setDripAmount(newAmount))
                .to.emit(faucet, "DripAmountUpdated")
                .withArgs(newAmount);
            
            expect(await faucet.getDripAmount()).to.equal(newAmount);
        });

        it("should allow owner to set drip amount to 1 wei", async function () {
            const newAmount = 1n;
            
            await expect(faucet.connect(owner).setDripAmount(newAmount))
                .to.emit(faucet, "DripAmountUpdated")
                .withArgs(newAmount);
            
            expect(await faucet.getDripAmount()).to.equal(newAmount);
        });

        it("should allow owner to set drip amount multiple times", async function () {
            const firstAmount = ethers.parseEther("0.2");
            const secondAmount = ethers.parseEther("0.5");
            
            await faucet.connect(owner).setDripAmount(firstAmount);
            expect(await faucet.getDripAmount()).to.equal(firstAmount);
            
            await faucet.connect(owner).setDripAmount(secondAmount);
            expect(await faucet.getDripAmount()).to.equal(secondAmount);
        });
    });

    describe("Access control", function () {
        it("should revert when non-owner tries to set drip amount", async function () {
            const newAmount = ethers.parseEther("0.2");
            
            await expect(faucet.connect(nonOwner).setDripAmount(newAmount))
                .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
                .withArgs(nonOwner.address);
        });
    });

    describe("Input validation", function () {
        it("should revert when setting drip amount to 0", async function () {
            await expect(faucet.connect(owner).setDripAmount(0))
                .to.be.revertedWithCustomError(faucet, "InvalidAmount")
                .withArgs(0);
        });
    });

    describe("Event emission", function () {
        it("should emit DripAmountUpdated event with correct parameters", async function () {
            const newAmount = ethers.parseEther("0.3");
            
            await expect(faucet.connect(owner).setDripAmount(newAmount))
                .to.emit(faucet, "DripAmountUpdated")
                .withArgs(newAmount);
        });
    });
});