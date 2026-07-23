const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const POOL_V2 = "0x71D88Cff00b50860Da4367a799a17bf483e76909";

  // 1) Deploy reward token
  const Token = await ethers.getContractFactory("SimpleERC20");
  const rewardToken = await Token.deploy("Freesia Reward", "FREE", 1000000);
  await rewardToken.waitForDeployment();
  const rewardTokenAddress = await rewardToken.getAddress();
  console.log("Reward token (FREE) deployed:", rewardTokenAddress);

  // 2) Deploy staking contract
  const Staking = await ethers.getContractFactory("StakingRewards");
  const staking = await Staking.deploy(POOL_V2, rewardTokenAddress);
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("StakingRewards deployed:", stakingAddress);

  // 3) Fund the staking contract with reward tokens
  const fundAmount = ethers.parseUnits("50000", 18); // 50,000 FREE to distribute
  await (await rewardToken.transfer(stakingAddress, fundAmount)).wait();
  console.log("Funded staking contract with", ethers.formatEther(fundAmount), "FREE");

  // 4) Start a 30-day reward period
  const duration = 30 * 24 * 60 * 60;
  await (await staking.notifyRewardAmount(fundAmount, duration)).wait();
  console.log("Reward period started: 30 days");

  console.log("\n=== DONE ===");
  console.log("REWARD_TOKEN_ADDRESS =", rewardTokenAddress);
  console.log("STAKING_ADDRESS =", stakingAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
