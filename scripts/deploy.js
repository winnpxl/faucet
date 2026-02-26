import hre from "hardhat";

async function main() {
  console.log("Deploying EthTestFaucet contract...");

  const EthTestFaucet = await hre.ethers.getContractFactory("EthTestFaucet");
  const faucet = await EthTestFaucet.deploy();

  await faucet.waitForDeployment();

  const address = await faucet.getAddress();
  console.log(`EthTestFaucet deployed to: ${address}`);

  // Display initial configuration
  const dripAmount = await faucet.dripAmount();
  const cooldownPeriod = await faucet.cooldownPeriod();
  
  console.log(`Drip Amount: ${hre.ethers.formatEther(dripAmount)} ETH`);
  console.log(`Cooldown Period: ${cooldownPeriod} seconds (${cooldownPeriod / 3600} hours)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
