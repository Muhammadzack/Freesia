/**
 * deploy-factory.js - Deploy PoolFactory ke LitVM Testnet.
 *
 * PoolFactory adalah contract TERPISAH dari pool USDC/DAI yang sudah kamu
 * deploy lewat deploy.js. Kalau kamu SUDAH punya pool USDC/DAI dari deploy.js,
 * pool itu TIDAK otomatis "terdaftar" di factory baru ini - keduanya independen.
 * Factory ini dipakai untuk pool BARU ke depannya (pasangan token kedua, dst).
 *
 * Jalankan:
 *   npx hardhat run scripts/deploy-factory.js --network litvmTestnet
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error("Tidak ada akun. Isi PRIVATE_KEY di .env.");

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deploy PoolFactory");
  console.log("  Deployer  :", deployer.address);
  console.log("  Saldo gas :", hre.ethers.formatEther(balance));
  if (balance === 0n) throw new Error("Saldo native token 0 - ambil dari faucet dulu.");

  const Factory = await hre.ethers.getContractFactory("PoolFactory");
  const factory = await Factory.deploy();
  console.log("Menunggu konfirmasi deploy...");
  await factory.waitForDeployment();

  const addr = await factory.getAddress();
  console.log("\n[OK] PoolFactory ter-deploy di:", addr);
  console.log("\nCatatan:");
  console.log("  - Factory ini PERMISSIONLESS: siapa saja bisa createPool().");
  console.log("  - Pool USDC/DAI yang sudah ada (dari deploy.js) TIDAK otomatis");
  console.log("    terdaftar di sini. Kalau mau, buat ulang lewat factory:");
  console.log(`      factory.createPool(USDC, DAI)`);
  console.log("    lalu pindahkan likuiditas ke pool baru itu (opsional, tidak wajib).");
  console.log("  - Untuk pool token BARU ke depan, pakai factory ini, bukan deploy.js manual.");
  console.log("  - Ingat: pool yang dibuat lewat factory tidak otomatis 'resmi' di UI -");
  console.log("    tambahkan ke TOKENS/POOLS di index.html hanya setelah lolos kurasi");
  console.log("    (lihat CURATION_CHECKLIST.md).");
}

main().catch((err) => {
  console.error("\n[GAGAL] Deploy gagal:", err.message || err);
  process.exitCode = 1;
});
