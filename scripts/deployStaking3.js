const { ethers } = require("hardhat");

const POOL_KOPDES = "0xBAE8787b417AE7b56458A4FEB904c65cd8018F8a";
const POOL_MBG    = "0x17F9b1ea3f6ceC4e5605f7cEDfa90674e3D3Faaf";
const FREE = "0x5072FE98CD78604d8750a935fa39039F06b6e800";
const DURASI = 30 * 24 * 60 * 60;

const ERC20 = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)"
];

async function main() {
  const [d] = await ethers.getSigners();
  const free = new ethers.Contract(FREE, ERC20, d);
  const saldo = await free.balanceOf(d.address);
  console.log("Saldo FREE:", ethers.formatUnits(saldo, 18));
  if (saldo === 0n) { console.log("Saldo FREE 0."); return; }

  const porsi = (saldo * 40n) / 100n;
  console.log("Porsi per staking (40%):", ethers.formatUnits(porsi, 18));

  const S = await ethers.getContractFactory("StakingRewards");

  const s1 = await S.deploy(POOL_KOPDES, FREE);
  await s1.waitForDeployment();
  const a1 = await s1.getAddress();
  console.log("==> STAKING KOPDES-USDC =", a1);

  const s2 = await S.deploy(POOL_MBG, FREE);
  await s2.waitForDeployment();
  const a2 = await s2.getAddress();
  console.log("==> STAKING MBG-USDC =", a2);

  console.log("\nDEPLOY SELESAI. Jalankan fundStaking.js untuk isi reward.");
}
main().catch(e => { console.error(e); process.exitCode = 1; });
