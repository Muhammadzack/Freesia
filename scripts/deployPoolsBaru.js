const { ethers } = require("hardhat");

const KOPDES = "0x21D274F95d9Cd7b859E66bFA970Ad52fb41F6533";
const MBG    = "0xD8aA8416d1C0d5290d99390c3ce38B2160c49167";
const USDC   = "0x6c567a7Fb7A2b4968D230A644D3C76E731e34837";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Pool = await ethers.getContractFactory("SimpleLiquidityPoolV3");

  // Pool 1: KOPDES-USDC
  const pool1 = await Pool.deploy(KOPDES, USDC);
  await pool1.waitForDeployment();
  const addr1 = await pool1.getAddress();
  console.log("==> POOL KOPDES-USDC =", addr1);

  // Pool 2: MBG-USDC
  const pool2 = await Pool.deploy(MBG, USDC);
  await pool2.waitForDeployment();
  const addr2 = await pool2.getAddress();
  console.log("==> POOL MBG-USDC =", addr2);

  console.log("");
  console.log("Kedua pool pakai SimpleLiquidityPoolV3 (6 FIX). Kirim kedua alamat ke Claude.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
