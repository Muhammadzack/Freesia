const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying dengan akun:", deployer.address);
  console.log("Saldo:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const Token = await ethers.getContractFactory("SimpleERC20");
  const tokenA = await Token.deploy("Token USDC", "USDC", 1000000);
  await tokenA.waitForDeployment();
  console.log("TokenA (USDC):", await tokenA.getAddress());

  const tokenB = await Token.deploy("Token DAI", "DAI", 1000000);
  await tokenB.waitForDeployment();
  console.log("TokenB (DAI):", await tokenB.getAddress());

  const Factory = await ethers.getContractFactory("SimpleFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  console.log("Factory:", await factory.getAddress());

  const tx = await factory.createPool(await tokenA.getAddress(), await tokenB.getAddress());
  const receipt = await tx.wait();
  const event = receipt.logs.find(l => l.fragment && l.fragment.name === "PoolCreated");
  const poolAddress = event.args[2];
  console.log("Pool:", poolAddress);

  console.log("\n=== DEPLOYMENT SELESAI ===");
  console.log(JSON.stringify({
    tokenA: await tokenA.getAddress(),
    tokenB: await tokenB.getAddress(),
    factory: await factory.getAddress(),
    pool: poolAddress
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
