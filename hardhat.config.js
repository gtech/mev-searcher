require("@nomiclabs/hardhat-waffle");
const {env} = require("./src/constants/env");

// const {task} = require("hardhat");
//
// task("accounts", "Prints the list of accounts", async (args, hre) => {
//   const accounts = await hre.ethers.getSigners();
//
//   for (const account of accounts) {
//     console.log(account.address);
//   }
// });

const ERC20ABI = [
  'function balanceOf(address) external view returns (uint)',
  'function transfer(address, uint) external returns (bool)',
]

// Run this task with mainnet fork,
// so that you can play around with your flashloan example contract
// task("flashloan", async (_, hre) => {
//
//   // The address that has USDC on mainnet
//   const walletAddr = '0x6D5a7597896A703Fe8c85775B23395a48f971305'
//
//   const crUSDCAddr = '0x44fbeBd2F576670a6C33f6Fc0B00aA8c5753b322'
//   const USDCAddr = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
//
//   await hre.network.provider.request({
//     method: "hardhat_impersonateAccount",
//     params: [walletAddr]
//   });
//
//   const wallet = await hre.ethers.provider.getSigner(walletAddr);
//   const factory = await hre.ethers.getContractFactory('FlashBotsMultiCall');
//
//   // deploy flashloan example contract
//   const flashBotsMultiCall = await factory.deploy(walletAddr);
//
//   // Send 100 USDC to flash loan example contract,
//   // so that you have enough fund to pay the fee.
//   const USDC = new hre.ethers.Contract(USDCAddr, ERC20ABI, wallet);
//   let tx = await USDC.transfer(flashBotsMultiCall.address, 100 * 1e6);
//   await tx.wait();
//
//
//   console.log('contract:', flashBotsMultiCall.address);
//
//   // call the doFlashloan
//   tx = await flashBotsMultiCall.doFlashloan(crUSDCAddr, 10000 * 1e6);
//   const receipt = await tx.wait()
//
//   // see the result
//   console.log(receipt.events)
//
//
//   await hre.network.provider.request({
//     method: "hardhat_stopImpersonatingAccount",
//     params: [walletAddr]
//   });
// })

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    myNode: {
      url: "http://127.0.0.1:8546",
      accounts: [env.PRIVATE_KEY]
    },
    alchemyLiveMain: {
      url: env.__MAINNET_RPC_URL__LIVE,
      accounts: [env.PRIVATE_KEY]
    },
    alchemyGoerliLive: {
      url: env.__GOERLI_RPC_URL__LIVE,
      accounts: [env.PRIVATE_KEY],
    },
    alchemyGoerliFork: {
      url: env.__GOERLI_RPC_URL__FORK,
      accounts: [env.PRIVATE_KEY]
    },
    hardhat: {
      forking: {
        url: env.__MAINNET_RPC_URL__FORK,
        accounts: [env.PRIVATE_KEY],
        // blockNumber: 12556268	 // Block before forceTransmute
        // blockNumber: 	12538687			//Block immediately before transmute at 12538688
        // blockNumber: 	12492292
        // blockNumber: 12468635 //25 days ago 5/20/21
        // blockNumber : 12603506 //6/10/21 0:18:14
        // blockNumber : 	12516125 // one block before chainlink liquidate pId 441 on homora 5/27 11:31 uniswap
        // blockNumber : 12499519 // one block before WETH liquidate on homora pId 307 5/24 9:37 pg 30 https://etherscan.io/tx/0x3a67611ba94054c624842621a837be29589aa222b4d2c84adb0f753a66b6d258 uniswap
        // blockNumber : 12481724//389 https://etherscan.io/tx/0x99af4feb4b922448868a872bc13f5bfac8fa421953b5539b1a3731eb49235247   33k sushiswap requires like 4% slippage
        // blockNumber : 12490102//326 https://etherscan.io/tx/0x96af488c32e95cd292fa2b4b5a503a83a97fa0a8444064d004a1bfba6f5fd7de sushiswap
        // blockNumber : 12489962//395 https://etherscan.io/tx/0xa58167e73df73fba2b73ec4614c6f04b3d231f6d776cc44d65bb38c8517f96ea 13k sushiswap
        // blockNumber : 12486140//423 https://etherscan.io/tx/0xb1211d00c397ef2591cb80b433c97e05c5437e07cc2aba35cbf69e6ca686b271 uniswap
        // blockNumber : 12490309//289 https://etherscan.io/tx/0xc1f986f4a3b00341eb10de213ca0d2879603525c6d3f06eb426cd0aa1230dbd5 sushiswap
        // blockNumber : 12499519//307 https://etherscan.io/tx/0x3a67611ba94054c624842621a837be29589aa222b4d2c84adb0f753a66b6d258 uniswap
        // blockNumber : 13013897	 //Very recent block
        // blockNumber : 13179379	 //Latest liquity liquidation https://etherscan.io/tx/0x7abce26a0f3420348c9ded1b2059eebfc686db5c9f2601a1b4d5eb4963336eb0
        blockNumber: 13966337 //https://etherscan.io/tx/0xedb94f13bc1c640174061398a8800a8ed8cca4746670ee8c21a2eae776781b03
      }
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test"
  },
  solidity: {
    compilers: [
      {
        version: "0.6.12"
      },
      {
        version: "0.6.11"
      },
      {
        version: "0.5.16"
      }
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
};
