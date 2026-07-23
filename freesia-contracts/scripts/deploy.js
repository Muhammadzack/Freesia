/**
 * deploy.js - Deploy SimpleLiquidityPoolV3 ke LitVM Testnet.
 *
 * Token USDC & DAI SUDAH ada di testnet, jadi script ini HANYA men-deploy pool
 * baru dan menghubungkannya ke dua alamat token itu. Tidak men-deploy token.
 *
 * Jalankan:
 *   npx hardhat run scripts/deploy.js --network litvmTestnet
 *
 * Setelah selesai, script mencetak alamat pool baru. Simpan alamat itu -
 * frontend harus diarahkan ke sana (lihat langkah pasca-deploy di README).
 */

const hre = require("hardhat");

// Alamat token dari config frontend v19. Verifikasi lagi sebelum deploy sungguhan.
const USDC = "0x6c567a7Fb7A2b4968D230A644D3C76E731e34837";
const DAI  = "0xd06C4C54837e1BBd458948C45E306DA38b19a0Bc";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "Tidak ada akun. Isi PRIVATE_KEY di .env lalu jalankan lagi."
    );
  }

  const net = await hre.ethers.provider.getNetwork();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("==============================================");
  console.log("Deploy SimpleLiquidityPoolV3");
  console.log("  Jaringan   :", net.name, "(chainId", net.chainId.toString() + ")");
  console.log("  Deployer   :", deployer.address);
  console.log("  Saldo gas  :", hre.ethers.formatEther(balance), "(native token)");
  console.log("  tokenA USDC:", USDC);
  console.log("  tokenB DAI :", DAI);
  console.log("==============================================");

  if (balance === 0n) {
    throw new Error(
      "Saldo native token 0 - tidak bisa membayar gas. Ambil dari faucet dulu."
    );
  }

  const Pool = await hre.ethers.getContractFactory("SimpleLiquidityPoolV3");
  const pool = await Pool.deploy(USDC, DAI);
  console.log("Menunggu konfirmasi deploy...");
  await pool.waitForDeployment();

  const addr = await pool.getAddress();
  console.log("\n[OK] Pool V3 ter-deploy di:", addr);
  console.log("\nLangkah berikutnya:");
  console.log("  1. Simpan alamat di atas.");
  console.log("  2. Arahkan frontend ke alamat pool baru ini (POOLS di index.html).");
  console.log("  3. approve() USDC & DAI ke alamat pool baru, lalu addLiquidity awal.");
  console.log("  4. (Opsional) verifikasi kontrak di block explorer.");
}

main().catch((err) => {
  console.error("\n[GAGAL] Deploy gagal:", err.message || err);
  process.exitCode = 1;
});
