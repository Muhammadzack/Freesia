const { ethers } = require("hardhat");

const POOL_KOPDES_USDC = "0x56C4dcC4d4451e869f74D1e4d443e27305fF0c2A";
const POOL_MBG_USDC    = "0x0dfD5f12C9AD54eBcee2a96D9C7E23DFa0D3e723";
const KOPDES = "0x21D274F95d9Cd7b859E66bFA970Ad52fb41F6533";
const MBG    = "0xD8aA8416d1C0d5290d99390c3ce38B2160c49167";
const USDC   = "0x6c567a7Fb7A2b4968D230A644D3C76E731e34837";

const ERC20 = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)"
];
const POOL = [
  "function addLiquidity(uint256,uint256) returns (uint256)",
  "function reserveA() view returns (uint256)",
  "function reserveB() view returns (uint256)"
];

async function seed(poolAddr, tokenAddr, amtToken, amtUsdc, label, signer) {
  console.log("\n--- " + label + " ---");
  const token = new ethers.Contract(tokenAddr, ERC20, signer);
  const usdc  = new ethers.Contract(USDC, ERC20, signer);
  const pool  = new ethers.Contract(poolAddr, POOL, signer);

  const a = ethers.parseUnits(amtToken, 18);
  const b = ethers.parseUnits(amtUsdc, 18);

  console.log("Approve token...");
  await (await token.approve(poolAddr, a)).wait();
  console.log("Approve USDC...");
  await (await usdc.approve(poolAddr, b)).wait();

  console.log("Add liquidity " + amtToken + " + " + amtUsdc + " USDC ...");
  await (await pool.addLiquidity(a, b)).wait();

  const rA = await pool.reserveA();
  const rB = await pool.reserveB();
  console.log("OK. reserveA:", ethers.formatUnits(rA, 18), "| reserveB:", ethers.formatUnits(rB, 18));
}

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Wallet:", signer.address);

  const usdc = new ethers.Contract(USDC, ERC20, signer);
  const balUsdc = await usdc.balanceOf(signer.address);
  console.log("Saldo USDC:", ethers.formatUnits(balUsdc, 18));
  if (balUsdc < ethers.parseUnits("2000", 18)) {
    console.log("Saldo USDC kurang dari 2000. Klaim faucet dulu.");
    return;
  }

  await seed(POOL_KOPDES_USDC, KOPDES, "10000", "1000", "KOPDES-USDC", signer);
  await seed(POOL_MBG_USDC, MBG, "100000", "1000", "MBG-USDC", signer);

  console.log("\nSelesai. Kedua pool siap. Kirim hasil ke Claude untuk daftar ke frontend.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
