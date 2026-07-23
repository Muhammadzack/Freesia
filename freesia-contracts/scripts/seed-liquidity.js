/**
 * seed-liquidity.js - Fase 2: isi pool V3 yang baru dengan likuiditas awal.
 *
 * Menjalankan dua langkah on-chain:
 *   1. approve() USDC & DAI ke alamat pool V3
 *   2. addLiquidity() untuk mengisi reserve awal
 *
 * WAJIB: isi POOL_ADDRESS di bawah dengan alamat yang dicetak oleh deploy.js
 * (Fase 1). Tanpa itu script berhenti.
 *
 * Jalankan:
 *   npx hardhat run scripts/seed-liquidity.js --network litvmTestnet
 *
 * Ubah AMOUNT_USDC / AMOUNT_DAI sesuai jumlah yang mau kamu setor. Rasio ini
 * menentukan harga awal pool: jumlah sama (10000:10000) = harga 1:1.
 */

const hre = require("hardhat");

// == ISI INI setelah Fase 1 ==============================================
const POOL_ADDRESS = "0x79989f44c13B8ed41a2bA68Cd0a584e158cD11E8"; // <-- alamat pool V3 dari deploy.js
// ========================================================================

// Alamat token dari config frontend v19.
const USDC = "0x6c567a7Fb7A2b4968D230A644D3C76E731e34837";
const DAI  = "0xd06C4C54837e1BBd458948C45E306DA38b19a0Bc";

// Jumlah setoran awal. Rasio = harga awal. Sama besar = 1:1.
const AMOUNT_USDC = hre.ethers.parseEther("10000");
const AMOUNT_DAI  = hre.ethers.parseEther("10000");

// ABI minimal - cukup untuk approve, cek saldo/allowance, dan addLiquidity.
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
];
const POOL_ABI = [
  "function addLiquidity(uint256 amountA, uint256 amountB) external returns (uint256)",
  "function tokenA() external view returns (address)",
  "function tokenB() external view returns (address)",
  "function reserveA() external view returns (uint256)",
  "function reserveB() external view returns (uint256)",
];

async function ensureApproval(token, symbol, owner, spender, needed) {
  const current = await token.allowance(owner, spender);
  if (current >= needed) {
    console.log(`  ${symbol}: allowance sudah cukup, lewati approve.`);
    return;
  }
  console.log(`  ${symbol}: approve ${hre.ethers.formatEther(needed)}...`);
  const tx = await token.approve(spender, needed);
  await tx.wait();
  console.log(`  ${symbol}: approve OK (tx ${tx.hash}).`);
}

async function main() {
  if (!POOL_ADDRESS) {
    throw new Error(
      "POOL_ADDRESS kosong. Isi dengan alamat pool V3 dari deploy.js (Fase 1)."
    );
  }

  const [signer] = await hre.ethers.getSigners();
  if (!signer) throw new Error("Tidak ada akun. Isi PRIVATE_KEY di .env.");

  const usdc = new hre.ethers.Contract(USDC, ERC20_ABI, signer);
  const dai  = new hre.ethers.Contract(DAI, ERC20_ABI, signer);
  const pool = new hre.ethers.Contract(POOL_ADDRESS, POOL_ABI, signer);

  // Sanity check: pastikan urutan tokenA/tokenB pool cocok dengan asumsi kita.
  const tA = (await pool.tokenA()).toLowerCase();
  const tB = (await pool.tokenB()).toLowerCase();
  const usdcAddr = USDC.toLowerCase();
  const daiAddr = DAI.toLowerCase();

  let amountA, amountB;
  if (tA === usdcAddr && tB === daiAddr) {
    amountA = AMOUNT_USDC; amountB = AMOUNT_DAI;
  } else if (tA === daiAddr && tB === usdcAddr) {
    // Pool menyimpan DAI sebagai tokenA - tukar urutan agar sesuai.
    amountA = AMOUNT_DAI; amountB = AMOUNT_USDC;
  } else {
    throw new Error(
      `Token pool tidak cocok dengan USDC/DAI yang diharapkan.\n` +
      `  pool.tokenA=${tA}\n  pool.tokenB=${tB}`
    );
  }

  // Cek saldo cukup sebelum apa-apa.
  const balU = await usdc.balanceOf(signer.address);
  const balD = await dai.balanceOf(signer.address);
  console.log("Saldo kamu: USDC", hre.ethers.formatEther(balU), "| DAI", hre.ethers.formatEther(balD));
  if (balU < AMOUNT_USDC || balD < AMOUNT_DAI) {
    throw new Error("Saldo USDC/DAI tidak cukup untuk setoran awal. Ambil dari faucet dulu.");
  }

  console.log("\n1) Approve token ke pool", POOL_ADDRESS);
  await ensureApproval(usdc, "USDC", signer.address, POOL_ADDRESS, AMOUNT_USDC);
  await ensureApproval(dai,  "DAI",  signer.address, POOL_ADDRESS, AMOUNT_DAI);

  console.log("\n2) addLiquidity awal...");
  const tx = await pool.addLiquidity(amountA, amountB);
  console.log("   menunggu konfirmasi (tx", tx.hash + ")...");
  await tx.wait();

  const rA = await pool.reserveA();
  const rB = await pool.reserveB();
  console.log("\n[OK] Likuiditas awal masuk.");
  console.log("   reserveA:", hre.ethers.formatEther(rA));
  console.log("   reserveB:", hre.ethers.formatEther(rB));
  console.log("\nPool V3 siap dipakai. Lanjut Fase 3: arahkan frontend ke", POOL_ADDRESS);
}

main().catch((err) => {
  console.error("\n[GAGAL] Gagal:", err.message || err);
  process.exitCode = 1;
});
