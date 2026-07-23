const { ethers } = require("hardhat");

const POOL_KOPDES = "0xBAE8787b417AE7b56458A4FEB904c65cd8018F8a";
const POOL_MBG    = "0x17F9b1ea3f6ceC4e5605f7cEDfa90674e3D3Faaf";
const KOPDES = "0x21D274F95d9Cd7b859E66bFA970Ad52fb41F6533";
const MBG    = "0xD8aA8416d1C0d5290d99390c3ce38B2160c49167";
const USDC   = "0x6c567a7Fb7A2b4968D230A644D3C76E731e34837";

const ERC20 = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)"
];
const POOL = [
  "function addLiquidity(uint256,uint256) returns (uint256)",
  "function reserveA() view returns (uint256)",
  "function reserveB() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)"
];

async function seed(poolAddr, tokenAddr, amtToken, amtUsdc, label, signer) {
  console.log("\n--- " + label + " ---");
  const token = new ethers.Contract(tokenAddr, ERC20, signer);
  const usdc  = new ethers.Contract(USDC, ERC20, signer);
  const pool  = new ethers.Contract(poolAddr, POOL, signer);
  const a = ethers.parseUnits(amtToken, 18);
  const b = ethers.parseUnits(amtUsdc, 18);

  console.log("Approve token...");
  await (await token.approve(poolAddr, a)).wait();
  console.log("Approve USDC...");
  await (await usdc.approve(poolAddr, b)).wait();
  console.log("Add liquidity " + amtToken + " + " + amtUsdc + " USDC ...");
  await (await pool.addLiquidity(a, b)).wait();

  const [rA, rB, lp] = await Promise.all([
    pool.reserveA(), pool.reserveB(), pool.balanceOf(signer.address)
  ]);
  console.log("OK. reserveA:", ethers.formatUnits(rA,18), "| reserveB:", ethers.formatUnits(rB,18));
  console.log("LP kamu:", ethers.formatUnits(lp,18));
}

async function main() {
  const [s] = await ethers.getSigners();
  console.log("Wallet:", s.address);
  const usdc = new ethers.Contract(USDC, ERC20, s);
  console.log("Saldo USDC:", ethers.formatUnits(await usdc.balanceOf(s.address), 18));

  await seed(POOL_KOPDES, KOPDES, "2000", "200", "KOPDES-USDC", s);
  await seed(POOL_MBG, MBG, "20000", "200", "MBG-USDC", s);
  console.log("\nSelesai. Kirim hasil ke Claude.");
}
main().catch(e => { console.error(e); process.exitCode = 1; });
