require("@nomiclabs/hardhat-waffle");
// require("hardhat-gas-reporter");
// require("solidity-coverage");
// require("@nomiclabs/hardhat-etherscan");

const {resolve} = require("path");

const { config: dotenvConfig } = require("dotenv");

dotenvConfig({ path: resolve(__dirname, "./.env") });

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY ?? "NO_ALCHEMY_API_KEY";
const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "NO_PRIVATE_KEY";

module.exports = {
  defaultNetwork: "hardhat",
  // gasReporter: {
  //   currency: "USD",
  //   enabled: process.env.REPORT_GAS ? true : false,
  //   excludeContracts: [],
  //   src: "./contracts",
  // },
  networks: {
    hardhat: {
      initialBaseFeePerGas: 0
    },
    // ropsten: {
    //   url: `https://eth-ropsten.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
    //   accounts: [`0x${ROPSTEN_PRIVATE_KEY}`],
    // },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test"
  },
  solidity: {
    version: "0.6.12",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
    }
  },
  // npx hardhat coverage

  // npx hardhat node
  // npx hardhat run --network localhost script/deploy.js
};