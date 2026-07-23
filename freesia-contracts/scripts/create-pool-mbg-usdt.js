/**
 * create-pool-mbg-usdt.js — Buat pool MBG/USDT lewat PoolFactory,
 * lalu isi likuiditas awal sesuai harga wajar $0.01/MBG.
 *
 * Harga awal ditentukan oleh RASIO setoran:
 * 10,000 USDT : 1,000,000 MBG = 1 USDT : 100 MBG = $0.01/MBG
 *
 * Jalankan:
 *   npm run create-pool:mbg-usdt
 */

const hre = require("hardhat");

const FACTORY_ADDRESS = "0x4ac10eBF81E18709048Ad560a9DFa2F5227b3527";
const MBG_ADDRESS     = "0xD8aA8416d1C0d5290d99390c3ce38B2160c49167";
const USDT_ADDRESS    = "0x903C7412e771eBb595Ae7B0108BA32a9A7a755d5";

const AMOUNT_MBG  = hre.ethers.parseEther("1000000");
const AMOUNT_USDT = hre.ethers.parseEther("10000");

const FACTORY_ABI = [
  "function createPool(address tokenA, address tokenB) external returns (address pool)",
  "function getPool(address tokenA, address tokenB) external view returns (address)",
];
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
    console.log("  " + symbol + ": allowance sudah cukup, lewati approve.");
    return;
  }
  console.log("  " + symbol + ": approve...");
  const tx = await token.approve(spender, needed);
  await tx.wait();
  console.log("  " + symbol + ": approve OK (tx " + tx.hash + ").");
}

async function main() {
  const [signer] = await hre.ethers.getSigners();
  if (!signer) throw new Error("Tidak ada akun. Isi PRIVATE_KEY di .env.");

  const factory = new hre.ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
  const mbg  = new hre.ethers.Contract(MBG_ADDRESS, ERC20_ABI, signer);
  const usdt = new hre.ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);

  console.log("Membuat pool MBG/USDT lewat PoolFactory");
  console.log("  Factory:", FACTORY_ADDRESS);
  console.log("  MBG    :", MBG_ADDRESS);
  console.log("  USDT   :", USDT_ADDRESS);

  const existing = await factory.getPool(MBG_ADDRESS, USDT_ADDRESS);
  let poolAddr;

  if (existing !== hre.ethers.ZeroAddress) {
    console.log("\nPool sudah ada:", existing);
    poolAddr = existing;
  } else {
    console.log("\n1) createPool(MBG, USDT)...");
    const tx = await factory.createPool(MBG_ADDRESS, USDT_ADDRESS);
    await tx.wait();
    poolAddr = await factory.getPool(MBG_ADDRESS, USDT_ADDRESS);
    console.log("   Pool baru ter-deploy di:", poolAddr);
  }

  const pool = new hre.ethers.Contract(poolAddr, POOL_ABI, signer);

  const tA = (await pool.tokenA()).toLowerCase();
  const tB = (await pool.tokenB()).toLowerCase();
  const mbgAddr = MBG_ADDRESS.toLowerCase();
  const usdtAddr = USDT_ADDRESS.toLowerCase();

  let amountA, amountB;
  if (tA === mbgAddr && tB === usdtAddr) {
    amountA = AMOUNT_MBG;
    amountB = AMOUNT_USDT;
  } else if (tA === usdtAddr && tB === mbgAddr) {
    amountA = AMOUNT_USDT;
    amountB = AMOUNT_MBG;
  } else {
    throw new Error("Token pool tidak cocok dengan MBG/USDT yang diharapkan.");
  }

  const balMbg  = await mbg.balanceOf(signer.address);
  const balUsdt = await usdt.balanceOf(signer.address);
  console.log("\nSaldo kamu: MBG", hre.ethers.formatEther(balMbg), "| USDT", hre.ethers.formatEther(balUsdt));

  if (balMbg < AMOUNT_MBG || balUsdt < AMOUNT_USDT) {
    throw new Error("Saldo MBG/USDT tidak cukup untuk setoran awal.");
  }

  console.log("\n2) Approve token ke pool", poolAddr);
  await ensureApproval(mbg, "MBG", signer.address, poolAddr, AMOUNT_MBG);
  await ensureApproval(usdt, "USDT", signer.address, poolAddr, AMOUNT_USDT);

  console.log("\n3) addLiquidity awal (1,000,000 MBG + 10,000 USDT)...");
  const tx2 = await pool.addLiquidity(amountA, amountB);
  await tx2.wait();

  const rA = await pool.reserveA();
  const rB = await pool.reserveB();
  console.log("\nLikuiditas awal masuk.");
  console.log("   reserveA:", hre.ethers.formatEther(rA));
  console.log("   reserveB:", hre.ethers.formatEther(rB));
  console.log("\nPool MBG/USDT siap di:", poolAddr);
  console.log("Harga awal: 1 USDT = 100 MBG ($0.01 per MBG)");
}

main().catch(function (err) {
  console.error("\nGagal:", err.message || err);
  process.exitCode = 1;
});
