// scripts/metrics.js
// Mengumpulkan metrik on-chain Freesia untuk impact report.
// HANYA membaca — tidak mengirim transaksi. Aman dijalankan kapan saja.
//
// Jalankan dari folder ~/freesia:
//   npx hardhat run scripts/metrics.js --network litvm
//
// Catatan: menghitung event dari block 0 bisa lambat / kena limit RPC.
// Kalau error "query returned more than N results" atau timeout, isi
// FROM_BLOCK dengan nomor block saat pool pertama di-deploy (biar range
// lebih kecil). Lihat block deploy di explorer.

const { ethers } = require("hardhat");

// ── Alamat kontrak (sudah terkonfirmasi) ──
const POOL_V3   = "0x79989f44c13B8ed41a2bA68Cd0a584e158cD11E8";
const STAKING   = "0x5810F270dd7643Caa60858b1f5CC4a250BA38C13";
const FREE      = "0x5072FE98CD78604d8750a935fa39039F06b6e800";

// Kalau scan penuh gagal, ganti 0 dengan block deploy pool (mis. 123456).
const FROM_BLOCK = 0;

// ABI minimal — cukup untuk baca state & event yang kita butuhkan.
const POOL_ABI = [
  "event Swap(address indexed trader, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut)",
  "event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 lpTokensMinted)",
  "function reserveA() view returns (uint256)",
  "function reserveB() view returns (uint256)",
  "function totalSupply() view returns (uint256)"
];
const STAKING_ABI = [
  "event Staked(address indexed user, uint256 amount)",
  "function totalSupply() view returns (uint256)"
];

async function main() {
  const provider = ethers.provider;
  const latest = await provider.getBlockNumber();
  console.log("=== METRIK FREESIA (block " + FROM_BLOCK + " → " + latest + ") ===\n");

  const pool    = new ethers.Contract(POOL_V3, POOL_ABI, provider);
  const staking = new ethers.Contract(STAKING, STAKING_ABI, provider);

  // ── 1. State saat ini (cepat, pasti berhasil) ──
  try {
    const [rA, rB, lpSupply, stakedTotal] = await Promise.all([
      pool.reserveA(), pool.reserveB(), pool.totalSupply(), staking.totalSupply()
    ]);
    console.log("── Likuiditas & Staking (snapshot sekarang) ──");
    console.log("Reserve A        :", ethers.formatUnits(rA, 18));
    console.log("Reserve B        :", ethers.formatUnits(rB, 18));
    console.log("Total LP supply  :", ethers.formatUnits(lpSupply, 18));
    console.log("Total LP staked  :", ethers.formatUnits(stakedTotal, 18));
    console.log("");
  } catch (e) {
    console.log("Gagal baca state:", e.message, "\n");
  }

  // ── 2. Hitung swap & wallet unik dari event ──
  try {
    const swapEvents = await pool.queryFilter(pool.filters.Swap(), FROM_BLOCK, latest);
    const swappers = new Set(swapEvents.map(e => e.args.trader.toLowerCase()));
    console.log("── Aktivitas Swap ──");
    console.log("Total swap       :", swapEvents.length);
    console.log("Wallet swap unik :", swappers.size);
    console.log("");
  } catch (e) {
    console.log("Gagal baca event Swap (coba isi FROM_BLOCK):", e.message, "\n");
  }

  // ── 3. Hitung penyedia likuiditas unik ──
  try {
    const addEvents = await pool.queryFilter(pool.filters.LiquidityAdded(), FROM_BLOCK, latest);
    const providers = new Set(addEvents.map(e => e.args.provider.toLowerCase()));
    console.log("── Penyedia Likuiditas ──");
    console.log("Total add-liquidity :", addEvents.length);
    console.log("LP unik             :", providers.size);
    console.log("");
  } catch (e) {
    console.log("Gagal baca event LiquidityAdded:", e.message, "\n");
  }

  // ── 4. Hitung staker unik ──
  try {
    const stakeEvents = await staking.queryFilter(staking.filters.Staked(), FROM_BLOCK, latest);
    const stakers = new Set(stakeEvents.map(e => e.args.user.toLowerCase()));
    console.log("── Staking ──");
    console.log("Total transaksi stake :", stakeEvents.length);
    console.log("Staker unik           :", stakers.size);
    console.log("");
  } catch (e) {
    console.log("Gagal baca event Staked:", e.message, "\n");
  }

  // ── 5. Gabungan wallet unik seluruh interaksi ──
  // (dihitung ulang di sini biar dapat satu angka "total unique users")
  try {
    const [sw, add, stk] = await Promise.all([
      pool.queryFilter(pool.filters.Swap(), FROM_BLOCK, latest),
      pool.queryFilter(pool.filters.LiquidityAdded(), FROM_BLOCK, latest),
      staking.queryFilter(staking.filters.Staked(), FROM_BLOCK, latest)
    ]);
    const all = new Set();
    sw.forEach(e => all.add(e.args.trader.toLowerCase()));
    add.forEach(e => all.add(e.args.provider.toLowerCase()));
    stk.forEach(e => all.add(e.args.user.toLowerCase()));
    console.log("── RINGKASAN ──");
    console.log("Total wallet unik (semua interaksi):", all.size);
  } catch (e) {
    console.log("Gagal hitung gabungan:", e.message);
  }

  console.log("\n=== SELESAI — salin angka di atas ke impact report ===");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
