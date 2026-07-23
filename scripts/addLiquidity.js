const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const TOKEN_A = "0x6c567a7Fb7A2b4968D230A644D3C76E731e34837"; // USDC
  const TOKEN_B = "0xd06C4C54837e1BBd458948C45E306DA38b19a0Bc"; // DAI
  const POOL = "0x29804786193C63932c6A0346126ef5D4b3e0cA81";

  const tokenA = await ethers.getContractAt("SimpleERC20", TOKEN_A);
  const tokenB = await ethers.getContractAt("SimpleERC20", TOKEN_B);
  const pool = await ethers.getContractAt("SimpleLiquidityPool", POOL);

  const amountA = ethers.parseUnits("10000", 18);
  const amountB = ethers.parseUnits("10000", 18);

  console.log("Approving pool to spend tokenA...");
  await (await tokenA.approve(POOL, amountA)).wait();
  console.log("Approving pool to spend tokenB...");
  await (await tokenB.approve(POOL, amountB)).wait();

  console.log("Adding liquidity...");
  const tx = await pool.addLiquidity(amountA, amountB);
  const receipt = await tx.wait();
  console.log("Liquidity added. Tx:", receipt.hash);

  const reserveA = await pool.reserveA();
  const reserveB = await pool.reserveB();
  console.log("Reserve A:", ethers.formatEther(reserveA));
  console.log("Reserve B:", ethers.formatEther(reserveB));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
