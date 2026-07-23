const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const TOKEN_A = "0x6c567a7Fb7A2b4968D230A644D3C76E731e34837";
  const TOKEN_B = "0xd06C4C54837e1BBd458948C45E306DA38b19a0Bc";
  const OLD_POOL = "0x29804786193C63932c6A0346126ef5D4b3e0cA81";

  const PoolV2 = await ethers.getContractFactory("SimpleLiquidityPoolV2");
  const poolV2 = await PoolV2.deploy(TOKEN_A, TOKEN_B);
  await poolV2.waitForDeployment();
  const poolV2Address = await poolV2.getAddress();
  console.log("SimpleLiquidityPoolV2 deployed:", poolV2Address);

  const oldPool = await ethers.getContractAt("SimpleLiquidityPool", OLD_POOL);
  const myLp = await oldPool.balanceOf(deployer.address);
  console.log("Removing", ethers.formatEther(myLp), "LP from old pool...");
  if (myLp > 0n) {
    await (await oldPool.removeLiquidity(myLp)).wait();
  }

  const tokenA = await ethers.getContractAt("SimpleERC20", TOKEN_A);
  const tokenB = await ethers.getContractAt("SimpleERC20", TOKEN_B);
  const balA = await tokenA.balanceOf(deployer.address);
  const balB = await tokenB.balanceOf(deployer.address);

  const amountA = balA < ethers.parseUnits("10000", 18) ? balA : ethers.parseUnits("10000", 18);
  const amountB = balB < ethers.parseUnits("10000", 18) ? balB : ethers.parseUnits("10000", 18);

  console.log("Approving new pool...");
  await (await tokenA.approve(poolV2Address, amountA)).wait();
  await (await tokenB.approve(poolV2Address, amountB)).wait();

  console.log("Adding liquidity to new pool...");
  await (await poolV2.addLiquidity(amountA, amountB)).wait();

  console.log("\n=== DONE ===");
  console.log("POOL_V2_ADDRESS =", poolV2Address);
  const rA = await poolV2.reserveA();
  const rB = await poolV2.reserveB();
  console.log("New pool reserves:", ethers.formatEther(rA), ethers.formatEther(rB));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
