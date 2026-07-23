require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Private key dibaca dari .env - JANGAN pernah menaruhnya langsung di file ini,
// dan JANGAN commit .env. Lihat .env.example.
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  // Versi solc harus cocok dengan `pragma solidity 0.8.20` di contract.
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // Detail diambil dari config frontend v19 (chainId 0x1159 = 4441).
    litvmTestnet: {
      url: "https://liteforge.rpc.caldera.xyz/infra-partner-http",
      chainId: 4441,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};
