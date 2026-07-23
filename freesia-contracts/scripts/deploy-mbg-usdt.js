/**
 * deploy-mbg-usdt.js — Deploy token MBG dan USDT ke LitVM Testnet.
 *
 * MBG: fixed supply 100.000.000, burnable, mint sekali ke deployer.
 * USDT: fixed supply sesuai INITIAL_USDT_SUPPLY di bawah, mint sekali ke
 *       deployer, 18 desimal (disamakan dengan USDC/DAI yang sudah ada).
 *
 * Jalankan:
 *   npx hardhat run scripts/deploy-mbg-usdt.js --network litvmTestnet
 */

const hre = require("hardhat");

const INITIAL_USDT_SUPPLY = 1_000_000; // 1 juta USDT testnet

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("Tidak ada akun. Isi PRIVATE_KEY di .env lalu jalankan lagi.");
  }

  const net = await hre.ethers.provider.getNetwork();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("──────────────────────────────────────────────");
  console.log("Deploy MBGToken + USDTToken");
  console.log("  Jaringan   :", net.name, "(chainId", net.chainId.toString() + ")");
  console.log("  Deployer   :", deployer.address);
  console.log("  Saldo gas  :", hre.ethers.formatEther(balance), "(native token)");
  console.log("──────────────────────────────────────────────");

  if (balance === 0n) {
    throw new Error("Saldo native token 0 — tidak bisa membayar gas. Ambil dari faucet dulu.");
  }

  console.log("\n1) Deploy MBGToken (100,000,000 MBG, fixed supply + burnable)...");
  const MBG = await hre.ethers.getContractFactory("MBGToken");
  const mbg = await MBG.deploy();
  await mbg.waitForDeployment();
  const mbgAddr = await mbg.getAddress();
  console.log("   ✅ MBG ter-deploy di:", mbgAddr);

  console.log(`\n2) Deploy USDTToken (${INITIAL_USDT_SUPPLY.toLocaleString()} USDT, 18 desimal)...`);
  const USDT = await hre.ethers.getContractFactory("USDTToken");
  const usdt = await USDT.deploy(INITIAL_USDT_SUPPLY);
  await usdt.waitForDeployment();
  const usdtAddr = await usdt.getAddress();
  console.log("   ✅ USDT ter-deploy di:", usdtAddr);

  const mbgBal = await mbg.balanceOf(deployer.address);
  const usdtBal = await usdt.balanceOf(deployer.address);
  console.log("\nSaldo deployer setelah deploy:");
  console.log("  MBG :", hre.ethers.formatEther(mbgBal));
  console.log("  USDT:", hre.ethers.formatEther(usdtBal));

  console.log("\n──────────────────────────────────────────────");
  console.log("SIMPAN KEDUA ALAMAT INI untuk langkah berikutnya:");
  console.log("  MBG_ADDRESS  =", mbgAddr);
  console.log("  USDT_ADDRESS =", usdtAddr);
  console.log("──────────────────────────────────────────────");
}

main().catch((err) => {
  console.error("\n✗ Deploy gagal:", err.message || err);
  process.exitCode = 1;
});
