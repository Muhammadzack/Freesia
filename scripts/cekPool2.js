const { ethers } = require("hardhat");
const POOLS = [
  ["KOPDES-USDC", "0xBAE8787b417AE7b56458A4FEB904c65cd8018F8a"],
  ["MBG-USDC",    "0x17F9b1ea3f6ceC4e5605f7cEDfa90674e3D3Faaf"],
];
const ABI = [
  "function reserveA() view returns (uint256)",
  "function reserveB() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)"
];
async function main() {
  const [s] = await ethers.getSigners();
  for (const [label, addr] of POOLS) {
    const p = new ethers.Contract(addr, ABI, ethers.provider);
    const [rA, rB, ts, lp] = await Promise.all([
      p.reserveA(), p.reserveB(), p.totalSupply(), p.balanceOf(s.address)
    ]);
    console.log("\n--- " + label + " ---");
    console.log("  reserveA :", ethers.formatUnits(rA,18));
    console.log("  reserveB :", ethers.formatUnits(rB,18));
    console.log("  LP kamu  :", ethers.formatUnits(lp,18));
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
