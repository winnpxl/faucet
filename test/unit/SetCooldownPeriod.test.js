import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("setCooldownPeriod Function - Unit Tests", function () {
    let faucet;
    let owner;
    let nonOwner;

    beforeEach(async function () {
        [owner, nonOwner] = await ethers.getSigners();
        
        const EthTestFaucet = await ethers.getContractFactory("EthTestFaucet");
        faucet = await EthTestFaucet.deploy();
    });

    describe("Successful setCooldownPeriod calls", function () {
        it("should allow owner to set cooldown period", async function () {
            const newPeriod = 3600; // 1 hour
            
            await expect(faucet.setCooldownPeriod(newPeriod))
                .to.emit(faucet, "CooldownPeriodUpdated")
                .withArgs(newPeriod);
            
            expect(await faucet.getCooldownPeriod()).to.equal(newPeriod);
        });

        it("should allow setting different cooldown periods", async function () {
            const periods = [1, 3600, 86400, 604800]; // 1 sec, 1 hour, 1 day, 1 week
            
            for (const period of periods) {
                await faucet.setCooldownPeriod(period);
                expect(await faucet.getCooldownPeriod()).to.equal(period);
            }
        });

        it("should emit CooldownPeriodUpdated event with correct parameters", async function () {
            const newPeriod = 7200; // 2 hours
            
            const tx = await faucet.setCooldownPeriod(newPeriod);
            const receipt = await tx.wait();
            
            const event = receipt.logs.find(log => 
                log.fragment && log.fragment.name === "CooldownPeriodUpdated"
            );
            
            expect(event).to.not.be.undefined;
            expect(event.args[0]).to.equal(newPeriod);
        });
    });

    describe("Failed setCooldownPeriod calls", function () {
        it("should revert when non-owner tries to set cooldown period", async function () {
            const newPeriod = 3600;
            
            await expect(faucet.connect(nonOwner).setCooldownPeriod(newPeriod))
                .to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount")
                .withArgs(nonOwner.address);
        });

        it("should revert when setting cooldown period to zero", async function () {
            await expect(faucet.setCooldownPeriod(0))
                .to.be.revertedWithCustomError(faucet, "InvalidAmount")
                .withArgs(0);
        });

        it("should revert for various invalid amounts", async function () {
            const invalidAmounts = [0];
            
            for (const amount of invalidAmounts) {
                await expect(faucet.setCooldownPeriod(amount))
                    .to.be.revertedWithCustomError(faucet, "InvalidAmount")
                    .withArgs(amount);
            }
        });
    });

    describe("State consistency", function () {
        it("should maintain state consistency after multiple updates", async function () {
            const periods = [1800, 7200, 43200]; // 30 min, 2 hours, 12 hours
            
            for (const period of periods) {
                await faucet.setCooldownPeriod(period);
                expect(await faucet.getCooldownPeriod()).to.equal(period);
                
                // Verify other state variables are unchanged
                expect(await faucet.getDripAmount()).to.equal(ethers.parseEther("0.1"));
                expect(await faucet.getOwner()).to.equal(owner.address);
            }
        });

        it("should not affect existing claim timestamps", async function () {
            // Fund the contract
            await owner.sendTransaction({
                to: await faucet.getAddress(),
                value: ethers.parseEther("1")
            });
            
            // Make a claim
            await faucet.connect(nonOwner).claim();
            const initialTimestamp = await faucet.getLastClaimTime(nonOwner.address);
            
            // Change cooldown period
            await faucet.setCooldownPeriod(3600);
            
            // Verify timestamp is unchanged
            expect(await faucet.getLastClaimTime(nonOwner.address)).to.equal(initialTimestamp);
        });
    });
});