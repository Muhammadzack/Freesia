const { ethers } = require("hardhat");

const FREE = "0x5072FE98CD78604d8750a935fa39039F06b6e800";
const KANDIDAT = [
  ["KOPDES #1", "0xbB2fCfDC782c05B0268E8b502BEA54Ac31D14B87"],
  ["MBG #1",    "0x7d40836D6A7Df5F05aD072D2C3298909272DFE96"],
  ["KOPDES #2", "0x0ba502E6Df8d2db29Ae2f1CFc64300AbeCE6a7E9"],
  ["MBG #2",    "0x59eAD09fdFaBD8289Ab7175F2c551DA64db0cdb5"],
];

const ERC20 = ["function balanceOf(address) view returns (uint256)"];
const ST = [
  "function stakingToken() view returns (address)",
  "function rewardRate() view returns (uint256)",
  "function periodFinish() view returns (uint256)"
];

async function main() {
  const p = ethers.provider;
  const free = new ethers.Contract(FREE, ERC20, p);
  for (const [label, addr] of KANDIDAT) {
    console.log("\n--- " + label + " " + addr + " ---");
    try {
      const s = new ethers.Contract(addr, ST, p);
      const bal = await free.balanceOf(addr);
      const rate = await s.rewardRate();
      const fin = await s.periodFinish();
      console.log("  FREE di kontrak :", ethers.formatUnits(bal, 18));
      console.log("  rewardRate      :", rate.toString());
      console.log("  periodFinish    :", fin.toString(), fin > 0n ? "("+new Date(Number(fin)*1000).toISOString().slice(0,10)+")" : "(BELUM DI-SET)");
      console.log("  stakingToken    :", await s.stakingToken());
    } catch (e) { console.log("  gagal dibaca:", e.message.slice(0,60)); }
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
