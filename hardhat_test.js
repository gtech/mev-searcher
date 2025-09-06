require("@nomiclabs/hardhat-waffle");
const {env} = require("./src/constants/env");

const ERC20ABI = [
    'function balanceOf(address) external view returns (uint)',
    'function transfer(address, uint) external returns (bool)',
]


module.exports = {
    //defaultNetwork: "hardhat" , when you want to fork.
    defaultNetwork: "hardhat",
    networks: {
        myNode: {
            url: "http://127.0.0.1:8546",
            accounts: [env.PRIVATE_KEY]
        },
        hardhat: {
            // chainId: 31337,
            forking: {
                url: env.__MAINNET_RPC_URL__FORK,
                accounts: [env.PRIVATE_KEY]
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