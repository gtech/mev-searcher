const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    env: {
        ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL || "http://127.0.0.1:8545",
        FLASHBOTS_RELAY_SIGNING_KEY: process.env.FLASHBOTS_RELAY_SIGNING_KEY,
        MINER_REWARD_PERCENTAGE: parseInt(process.env.MINER_REWARD_PERCENTAGE || '1'),
        HEALTH_CHECK_URL: process.env.HEALTHCHECK_URL || "",
        NETWORK: process.env.NETWORK,
        MINER_PERCENTAGE: process.env.MINER_PERCENTAGE,
        THRESH_HOLD_FOR_LIQUIDATION: parseFloat(process.env.THRESH_HOLD_FOR_LIQUIDATION),
        PRIVATE_KEY: process.env.PRIVATE_KEY,
        LIQUITY_LIQUIDATOR_ADDRESS: process.env.LIQUITY_LIQUIDATOR_ADDRESS,
    }
}