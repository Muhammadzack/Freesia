const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Token = await ethers.getContractFactory("SimpleERC20");
  const token = await Token.deploy("Koperasi Desa", "KOPDES", 1000000);
  await token.waitForDeployment();
  const addr = await token.getAddress();

  console.log("");
  console.log("==> KOPDES address =", addr);
  console.log("");
  const bal = await token.balanceOf(deployer.address);
  console.log("Saldo KOPDES:", ethers.formatUnits(bal, 18));
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
