// cek-stake.js — BACA SAJA. Tidak mengirim transaksi, tidak memakai gas.
// Jalankan: npx hardhat run scripts/cek-stake.js --network litvm
//
// Menjawab laporan @Tsurugichan7777 "Stake LP belum bisa" di pool USDC/DAI.
// Tiga kemungkinan yang dibedakan skrip ini:
//   (a) LP token pool USDC/DAI TIDAK punya approve/allowance  → bug kontrak lama, stake mustahil
//   (b) staking menunjuk pool/LP yang BERBEDA                  → salah kabel
//   (c) semua fungsi ada                                       → kemungkinan langkah Approve hilang di UI

const hre = require("hardhat");

const POOL_USDCDAI = "0x79989f44c13B8ed41a2bA68Cd0a584e158cD11E8"; // LP token = pool ini sendiri
const STAKING      = "0x5810F270dd7643Caa60858b1f5CC4a250BA38C13"; // staking untuk pool USDC/DAI
const TSU          = "0x3989"; // alamat pelapor — diisi lengkap di bawah kalau mau cek spesifik

// ERC20 minimum yang WAJIB ada agar LP bisa di-stake
const ERC20_ABI = [
  "function approve(address,uint256) returns (bool)",
  "function allowance(address,address) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
  "function transferFrom(address,address,uint256) returns (bool)"
];
const STAKING_ABI = [
  "function stakingToken() view returns (address)",
  "function lpToken() view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function periodFinish() view returns (uint256)",
  "function rewardsToken() view returns (address)"
];

const f = (x) => Number(hre.ethers.formatUnits(x, 18)).toLocaleString("en-US", { maximumFractionDigits: 6 });

// Cek satu fungsi ADA di bytecode dengan memanggilnya; kalau revert "bukan fungsi", berarti tak ada.
async function punyaFungsi(contract, nama, args) {
  try { await contract[nama].staticCall(...args); return true; }
  catch (e) {
    const msg = (e.message || "").toLowerCase();
    // revert data kosong / no data = selector tak ada = fungsi tak ada
    if (msg.includes("no data") || msg.includes("cannot decode") || msg.includes("missing revert")) return false;
    // revert dengan alasan lain (mis. allowance ke 0) tetap berarti fungsinya ADA
    return true;
  }
}

async function main() {
  const pr = hre.ethers.provider;
  console.log("Pool/LP USDC/DAI :", POOL_USDCDAI);
  console.log("Kontrak staking  :", STAKING);
  console.log("─".repeat(60));

  // 1) Apakah LP token punya fungsi ERC20 yang dibutuhkan staking?
  const lp = new hre.ethers.Contract(POOL_USDCDAI, ERC20_ABI, pr);
  const dummy = "0x000000000000000000000000000000000000dEaD";
  const cekApprove   = await punyaFungsi(lp, "allowance", [dummy, STAKING]);
  const cekBalance   = await punyaFungsi(lp, "balanceOf", [dummy]);
  const cekSupply    = await punyaFungsi(lp, "totalSupply", []);

  console.log("LP token — allowance() :", cekApprove ? "ADA ✓" : "TIDAK ADA ✗");
  console.log("LP token — balanceOf() :", cekBalance ? "ADA ✓" : "TIDAK ADA ✗");
  console.log("LP token — totalSupply():", cekSupply ? "ADA ✓" : "TIDAK ADA ✗");

  // 2) Staking menunjuk token yang mana? Harus == POOL_USDCDAI
  const st = new hre.ethers.Contract(STAKING, STAKING_ABI, pr);
  let stakingToken = null;
  for (const nama of ["stakingToken", "lpToken"]) {
    try { stakingToken = await st[nama](); console.log(`Staking.${nama}()   :`, stakingToken); break; }
    catch (e) {}
  }
  if (stakingToken) {
    const cocok = stakingToken.toLowerCase() === POOL_USDCDAI.toLowerCase();
    console.log("  → menunjuk pool USDC/DAI?", cocok ? "YA ✓" : "TIDAK ✗ (salah kabel!)");
  } else {
    console.log("Staking.stakingToken/lpToken : tidak bisa dibaca (nama fungsi beda?)");
  }

  // 3) Periode reward masih jalan?
  try {
    const pf = await st.periodFinish();
    const now = Math.floor(Date.now() / 1000);
    const berakhir = new Date(Number(pf) * 1000).toISOString().slice(0, 10);
    console.log("Periode reward     :", berakhir, Number(pf) > now ? "(masih jalan ✓)" : "(SUDAH BERAKHIR ✗)");
  } catch (e) { console.log("periodFinish()     : tak terbaca"); }

  console.log("─".repeat(60));
  console.log("VONIS:");
  if (!cekApprove) {
    console.log("  (a) LP token pool USDC/DAI TIDAK punya approve/allowance.");
    console.log("      Ini bug kontrak generasi awal — Tsu-chan (siapa pun) TIDAK AKAN");
    console.log("      pernah bisa stake di pool ini. Solusi: migrasi pool ke V3.");
    console.log("      Ini insiden nyata — catat di /insiden dengan kredit @Tsurugichan7777.");
  } else if (stakingToken && stakingToken.toLowerCase() !== POOL_USDCDAI.toLowerCase()) {
    console.log("  (b) Staking menunjuk token BERBEDA dari LP pool USDC/DAI. Salah kabel.");
  } else {
    console.log("  (c) Semua fungsi ADA & kabel benar. Kemungkinan besar UI tidak");
    console.log("      menampilkan langkah APPROVE sebelum Stake — pengguna menekan");
    console.log("      Stake tanpa approve dulu, transaksi ditolak. Perbaikan di frontend.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
