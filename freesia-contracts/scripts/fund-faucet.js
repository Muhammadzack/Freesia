const hre = require("hardhat");

const FAUCET_ADDRESS = "0xe72f37B2AE5295A723C2c885cdf47D4a752A804E";

const MBG_ADDRESS  = "0xD8aA8416d1C0d5290d99390c3ce38B2160c49167";
const USDT_ADDRESS = "0x903C7412e771eBb595Ae7B0108BA32a9A7a755d5";

const FUND_MBG  = hre.ethers.parseEther("50000");
const FUND_USDT = hre.ethers.parseEther("50000");

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address owner) external view returns (uint256)",
];

async function main() {
  if (!FAUCET_ADDRESS) {
    throw new Error("FAUCET_ADDRESS masih kosong. Isi dulu alamat FaucetV2.");
  }

  const [signer] = await hre.ethers.getSigners();
  if (!signer) throw new Error("Tidak ada akun. Isi PRIVATE_KEY di .env.");

  const mbg  = new hre.ethers.Contract(MBG_ADDRESS, ERC20_ABI, signer);
  const usdt = new hre.ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);

  console.log("Mengirim token ke FaucetV2:", FAUCET_ADDRESS);

  const balMbg  = await mbg.balanceOf(signer.address);
  const balUsdt = await usdt.balanceOf(signer.address);
  console.log("\nSaldo kamu sebelum fund: MBG", hre.ethers.formatEther(balMbg), "| USDT", hre.ethers.formatEther(balUsdt));

  if (balMbg < FUND_MBG || balUsdt < FUND_USDT) {
    throw new Error("Saldo MBG/USDT kamu tidak cukup untuk fund sebesar ini.");
  }

  console.log("\n1) Transfer", hre.ethers.formatEther(FUND_MBG), "MBG ke faucet...");
  const tx1 = await mbg.transfer(FAUCET_ADDRESS, FUND_MBG);
  await tx1.wait();
  console.log("   OK (tx", tx1.hash + ")");

  console.log("\n2) Transfer", hre.ethers.formatEther(FUND_USDT), "USDT ke faucet...");
  const tx2 = await usdt.transfer(FAUCET_ADDRESS, FUND_USDT);
  await tx2.wait();
  console.log("   OK (tx", tx2.hash + ")");

  const faucetMbgBal  = await mbg.balanceOf(FAUCET_ADDRESS);
  const faucetUsdtBal = await usdt.balanceOf(FAUCET_ADDRESS);
  console.log("\nSaldo faucet sekarang:");
  console.log("  MBG :", hre.ethers.formatEther(faucetMbgBal));
  console.log("  USDT:", hre.ethers.formatEther(faucetUsdtBal));
}

main().catch((err) => {
  console.error("\nGagal:", err.message || err);
  process.exitCode = 1;
});
