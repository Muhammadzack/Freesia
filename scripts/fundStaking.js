const { ethers } = require("hardhat");

const STAKING_KOPDES = "0xb7f9c24854c0B0d281913269026E719cc55157cb";
const STAKING_MBG    = "0x881aBE426863F1172d435ad3f6dbcE0c876eD2Ef";
const FREE = "0x5072FE98CD78604d8750a935fa39039F06b6e800";
const PORSI = "3110";               // FREE per staking
const DURASI = 30 * 24 * 60 * 60;   // 30 hari

const ERC20 = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)"
];
const ST = [
  "function notifyRewardAmount(uint256,uint256)",
  "function rewardRate() view returns (uint256)"
];

async function fund(addr, label, signer) {
  console.log("\n--- " + label + " ---");
  const free = new ethers.Contract(FREE, ERC20, signer);
  const st = new ethers.Contract(addr, ST, signer);
  const amt = ethers.parseUnits(PORSI, 18);

  const bal = await free.balanceOf(addr);
  if (bal >= amt) {
    console.log("FREE sudah ada di kontrak:", ethers.formatUnits(bal,18), "— lewati transfer");
  } else {
    console.log("Transfer", PORSI, "FREE...");
    await (await free.transfer(addr, amt)).wait();
  }

  const rate = await st.rewardRate();
  if (rate > 0n) {
    console.log("rewardRate sudah di-set:", rate.toString(), "— lewati notify");
  } else {
    console.log("Set reward, 30 hari...");
    await (await st.notifyRewardAmount(amt, DURASI)).wait();
  }
  console.log("OK. rewardRate:", (await st.rewardRate()).toString());
}

async function main() {
  const [s] = await ethers.getSigners();
  const free = new ethers.Contract(FREE, ERC20, s);
  console.log("Saldo FREE:", ethers.formatUnits(await free.balanceOf(s.address), 18));

  await fund(STAKING_KOPDES, "STAKING KOPDES-USDC", s);
  await fund(STAKING_MBG, "STAKING MBG-USDC", s);
  console.log("\nSelesai.");
}
main().catch(e => { console.error(e); process.exitCode = 1; });
