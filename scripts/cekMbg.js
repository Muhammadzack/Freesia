// scripts/cekMbg.js
// Cari alamat token MBG dari pool MBG-USDT yang sudah ada.
// Jalankan: npx hardhat run scripts/cekMbg.js --network litvm
// HANYA membaca. Aman.

const { ethers } = require("hardhat");

const POOL_MBG_USDT = "0xd54598e60712684EcEFA810E4cCA0c30C2F41B54";
const USDT = "0x903C7412e771eBb595Ae7B0108BA32a9A7a755d5"; // dari catatan
const USDC = "0x6c567a7Fb7A2b4968D230A644D3C76E731e34837";

const ABI = [
  "function tokenA() view returns (address)",
  "function tokenB() view returns (address)",
  "function reserveA() view returns (uint256)",
  "function reserveB() view returns (uint256)"
];

async function main() {
  const p = ethers.provider;
  const pool = new ethers.Contract(POOL_MBG_USDT, ABI, p);

  const tA = await pool.tokenA();
  const tB = await pool.tokenB();
  console.log("Pool MBG-USDT:");
  console.log("  tokenA:", tA);
  console.log("  tokenB:", tB);

  // Mana yang MBG? yang BUKAN USDT.
  const mbg = (tA.toLowerCase() === USDT.toLowerCase()) ? tB : tA;
  console.log("");
  console.log("==> ALAMAT MBG =", mbg);
  console.log("");

  const rA = await pool.reserveA();
  const rB = await pool.reserveB();
  console.log("Reserve A:", ethers.formatUnits(rA, 18));
  console.log("Reserve B:", ethers.formatUnits(rB, 18));
  console.log("");
  console.log("USDC (untuk pool baru) =", USDC);
  console.log("Salin ALAMAT MBG di atas dan kirim ke Claude.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
