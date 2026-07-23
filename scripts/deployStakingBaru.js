const { ethers } = require("hardhat");

const POOL_KOPDES_USDC = "0x56C4dcC4d4451e869f74D1e4d443e27305fF0c2A";
const POOL_MBG_USDC    = "0x0dfD5f12C9AD54eBcee2a96D9C7E23DFa0D3e723";
const FREE = "0x5072FE98CD78604d8750a935fa39039F06b6e800";

const DURASI = 30 * 24 * 60 * 60;   // 1 bulan

const ERC20 = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)"
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const free = new ethers.Contract(FREE, ERC20, deployer);
  const saldo = await free.balanceOf(deployer.address);
  console.log("Saldo FREE:", ethers.formatUnits(saldo, 18));

  if (saldo === 0n) { console.log("Saldo FREE 0. Tidak bisa lanjut."); return; }

  const porsi = (saldo * 40n) / 100n;   // 40% tiap staking
  console.log("Porsi per staking (40%):", ethers.formatUnits(porsi, 18));

  const Staking = await ethers.getContractFactory("StakingRewards");

  // Staking 1: KOPDES-USDC
  const s1 = await Staking.deploy(POOL_KOPDES_USDC, FREE);
  await s1.waitForDeployment();
  const a1 = await s1.getAddress();
  console.log("==> STAKING KOPDES-USDC =", a1);
  await (await free.transfer(a1, porsi)).wait();
  await (await s1.notifyRewardAmount(porsi, DURASI)).wait();
  console.log("    reward di-set, periode 30 hari");

  // Staking 2: MBG-USDC
  const s2 = await Staking.deploy(POOL_MBG_USDC, FREE);
  await s2.waitForDeployment();
  const a2 = await s2.getAddress();
  console.log("==> STAKING MBG-USDC =", a2);
  await (await free.transfer(a2, porsi)).wait();
  await (await s2.notifyRewardAmount(porsi, DURASI)).wait();
  console.log("    reward di-set, periode 30 hari");

  console.log("");
  console.log("Selesai. Kirim kedua alamat staking ke Claude.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
