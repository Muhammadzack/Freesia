const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error("Tidak ada akun. Isi PRIVATE_KEY di .env.");

  const net = await hre.ethers.provider.getNetwork();
  console.log("Deploy FaucetV2");
  console.log("  Jaringan :", net.name, "(chainId", net.chainId.toString() + ")");
  console.log("  Deployer :", deployer.address);

  const Faucet = await hre.ethers.getContractFactory("FaucetV2");
  const faucet = await Faucet.deploy();
  await faucet.waitForDeployment();
  const addr = await faucet.getAddress();

  console.log("\nFaucetV2 ter-deploy di:", addr);
  console.log("\nLangkah berikutnya:");
  console.log("  1. Fund faucet dengan MBG dan USDT lewat fund-faucet.js");
  console.log("  2. Update FAUCET_ADDRESS di index.html jadi:", addr);
}

main().catch((err) => {
  console.error("\nGagal:", err.message || err);
  process.exitCode = 1;
});
