const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Faucet with:", deployer.address);

  const Faucet = await ethers.getContractFactory("Faucet");
  const faucet = await Faucet.deploy();
  await faucet.waitForDeployment();

  const faucetAddress = await faucet.getAddress();
  console.log("Faucet deployed:", faucetAddress);
  console.log("\nCopy this into freesia-dex-swap.html config:");
  console.log("FAUCET_ADDRESS =", faucetAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
