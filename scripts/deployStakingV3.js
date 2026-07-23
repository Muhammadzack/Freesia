const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const POOL_V3 = "0x79989f44c13B8ed41a2bA68Cd0a584e158cD11E8";
  const FREE = "0x5072FE98CD78604d8750a935fa39039F06b6e800";

  const Staking = await ethers.getContractFactory("StakingRewards");
  const staking = await Staking.deploy(POOL_V3, FREE);
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("StakingRewards BARU:", stakingAddress);

  const free = await ethers.getContractAt("SimpleERC20", FREE);
  const fundAmount = ethers.parseUnits("50000", 18);
  const bal = await free.balanceOf(deployer.address);
  console.log("Saldo FREE deployer:", ethers.formatEther(bal));
  if (bal < fundAmount) {
    console.log("Saldo FREE kurang dari 50000. Beri tahu Claude.");
    return;
  }
  await (await free.transfer(stakingAddress, fundAmount)).wait();
  console.log("Terisi:", ethers.formatEther(fundAmount), "FREE");

  const duration = 30 * 24 * 60 * 60;
  await (await staking.notifyRewardAmount(fundAmount, duration)).wait();
  console.log("Periode reward 30 hari dimulai.");

  console.log("STAKING_ADDRESS_BARU =", stakingAddress);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });

