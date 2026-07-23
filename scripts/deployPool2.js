const { ethers } = require("hardhat");

const KOPDES = "0x21D274F95d9Cd7b859E66bFA970Ad52fb41F6533";
const MBG    = "0xD8aA8416d1C0d5290d99390c3ce38B2160c49167";
const USDC   = "0x6c567a7Fb7A2b4968D230A644D3C76E731e34837";

async function main() {
  const [d] = await ethers.getSigners();
  console.log("Deployer:", d.address);
  const Pool = await ethers.getContractFactory("SimpleLiquidityPoolV3");

  const p1 = await Pool.deploy(KOPDES, USDC);
  await p1.waitForDeployment();
  console.log("==> POOL KOPDES-USDC =", await p1.getAddress());

  const p2 = await Pool.deploy(MBG, USDC);
  await p2.waitForDeployment();
  console.log("==> POOL MBG-USDC =", await p2.getAddress());
}
main().catch(e => { console.error(e); process.exitCode = 1; });
