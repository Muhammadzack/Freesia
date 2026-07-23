// scripts/checkDia.js
// Verifikasi feed DIA di LitVM sebelum dipakai di frontend.
// HANYA membaca. Jalankan: npx hardhat run scripts/checkDia.js --network litvm
//
// Tujuan: pastikan pencocokan alamat↔aset BENAR sebelum tempel ke DEX.
// Kalau USDC ~$1, USDT ~$1, LTC ~puluhan dolar → cocok, aman.
// Kalau angkanya aneh (mis. USDC = $3000) → alamat tertukar, JANGAN dipakai.

const { ethers } = require("hardhat");

const FEEDS = {
  LTC:  "0x45dDa5d881BD2C917976CCfde74fFd6f6412da29",
  USDC: "0x4f91a950ed73c8B6F28dFE460f9444ed8866894f",
  USDT: "0xd7ff0A3DdE1FdC2137Ff4CaAde5396f009739645",
  ETH:  "0xc760B46beF9eD3F9A3d2b825164324D6703F0185",
  BTC:  "0x7d0445782E383223c7B4B660bb96b87213e9b605",
};

const ABI = [
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)"
];

async function main() {
  const provider = ethers.provider;
  const now = Math.floor(Date.now() / 1000);
  console.log("=== CEK FEED DIA (LitVM) ===\n");

  for (const [sym, addr] of Object.entries(FEEDS)) {
    try {
      const feed = new ethers.Contract(addr, ABI, provider);
      let dec = 8;
      try { dec = Number(await feed.decimals()); } catch (_) {}
      const [, answer, , updatedAt] = await feed.latestRoundData();
      const price = Number(ethers.formatUnits(answer, dec));
      const ageMin = Math.floor((now - Number(updatedAt)) / 60);
      const stale = ageMin > 120 ? "  ⚠️ BASI (>2 jam)" : "";
      console.log(`${sym.padEnd(5)} $${price.toLocaleString(undefined,{maximumFractionDigits:4})}  (update ${ageMin} menit lalu, ${dec} desimal)${stale}`);
    } catch (e) {
      console.log(`${sym.padEnd(5)} GAGAL: ${e.message}`);
    }
  }

  console.log("\n=== Cek kewajaran ===");
  console.log("USDC & USDT harus ~$1.00");
  console.log("LTC harus ~puluhan dolar");
  console.log("ETH ribuan, BTC puluhan ribu");
  console.log("Kalau ada yang tertukar → alamat salah, kabari Claude.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
