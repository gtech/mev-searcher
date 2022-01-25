const {parseBoolean} = require("../utilities/utils");

const {config: dotenvConfig} = require("dotenv");
const {resolve} = require("path");

dotenvConfig({path: resolve(__dirname, "./.env")});

const {
    HEALTH_CHECK_URL,

    MINER_PERCENTAGE,
    THRESHOLD_FOR_LIQUIDATION,

    NETWORK,
    NETWORK_FORK,

    MAINNET_RPC_URL__LIVE,
    MAINNET_RPC_URL__FORK,
    MAINNET_CONTRACT_ADDRESS__LIQUITY_LIQUIDATOR,

    GOERLI_RPC_URL__LIVE,
    GOERLI_RPC_URL__FORK,
    GOERLI_CONTRACT_ADDRESS__LIQUITY_LIQUIDATOR,

    PRIVATE_KEY,
    FLASHBOTS_RELAY_SIGNING_KEY
} = process.env;

module.exports = {
    env: {
        HEALTH_CHECK_URL: HEALTH_CHECK_URL || "",

        MINER_REWARD_PERCENTAGE: parseInt(MINER_PERCENTAGE || '1'),
        THRESHOLD_FOR_LIQUIDATION: parseInt(THRESHOLD_FOR_LIQUIDATION),

        NETWORK,
        NETWORK_FORK: parseBoolean(NETWORK_FORK),
        ETHEREUM_RPC_URL: (
            NETWORK === "MAINNET" ?
                parseBoolean(NETWORK_FORK) ? MAINNET_RPC_URL__FORK : MAINNET_RPC_URL__LIVE
                : NETWORK === "GOERLI" ?
                    parseBoolean(NETWORK_FORK) ? GOERLI_RPC_URL__FORK : GOERLI_RPC_URL__LIVE
                    : "UNDEF"
        ),
        FLASHBOTS_RELAY_SIGNING_KEY,

        PRIVATE_KEY,

        // Contract Addresses
        CONTRACT_ADDRESS__LIQUITY_LIQUIDATOR: (
            NETWORK === "MAINNET" ? MAINNET_CONTRACT_ADDRESS__LIQUITY_LIQUIDATOR
                : NETWORK === "GOERLI" ? GOERLI_CONTRACT_ADDRESS__LIQUITY_LIQUIDATOR
                    : "UNDEF"
        ),

        // Manually referencable networks
        __MAINNET_RPC_URL__LIVE,
        __MAINNET_RPC_URL__FORK,
        __GOERLI_RPC_URL__LIVE,
        __GOERLI_RPC_URL__FORK,
    }
}