const { ethers } = require("hardhat");

async function main() {
  const TARGET = "0xb5dedc73b1f7ef79c0f2f0db67cdae982030027b";

  const TOKEN_A = "0x6c567a7Fb7A2b4968D230A644D3C76E731e34837"; // USDC
  const TOKEN_B = "0xd06C4C54837e1BBd458948C45E306DA38b19a0Bc"; // DAI

  const tokenA = await ethers.getContractAt("SimpleERC20", TOKEN_A);
  const tokenB = await ethers.getContractAt("SimpleERC20", TOKEN_B);

  const amount = ethers.parseUnits("5000", 18); // 5,000 token masing-masing

  console.log("Minting USDC ke", TARGET, "...");
  await (await tokenA.mint(TARGET, amount)).wait();

  console.log("Minting DAI ke", TARGET, "...");
  await (await tokenB.mint(TARGET, amount)).wait();

  const balA = await tokenA.balanceOf(TARGET);
  const balB = await tokenB.balanceOf(TARGET);
  console.log("Saldo USDC sekarang:", ethers.formatEther(balA));
  console.log("Saldo DAI sekarang:", ethers.formatEther(balB));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
