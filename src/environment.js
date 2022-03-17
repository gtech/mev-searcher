const {FlashbotsBundleProvider} = require("@flashbots/ethers-provider-bundle");
const {providers, Wallet} = require("ethers");
const {network} = require("hardhat");
const {get} = require("https")
require("@nomiclabs/hardhat-waffle");

const {LiquityBot} = require("./liquidators/liquity");
const {FlashBotsSender} = require('./utilities/flashBotsSender');
const {env} = require('./constants/env');
const { AlphaHomoraBot } = require("./liquidators/alphaHomora");


class Environment {
    ETHEREUM_RPC_URL;
    FLASHBOTS_RELAY_SIGNING_KEY;
    MINER_PERCENTAGE;
    HEALTH_CHECK_URL;

    provider;
    flashbotsRelaySigningWallet;
    flashbotsProvider;
    liquidators;
    flashBotsSender;

    constructor() {
        // Load environment variables
        // dotenv.config();

        // Define constants
        this.ETHEREUM_RPC_URL = env.ETHEREUM_RPC_URL;
        this.FLASHBOTS_RELAY_SIGNING_KEY = env.FLASHBOTS_RELAY_SIGNING_KEY;
        this.MINER_PERCENTAGE = env.MINER_PERCENTAGE;
        this.HEALTH_CHECK_URL = env.HEALTH_CHECK_URL;

        this.liquidators = [];

        // TODO: Check me -> TODO: Fix this shit
        this.provider = new providers.StaticJsonRpcProvider(this.ETHEREUM_RPC_URL);

        // TODO: Check me -> TODO: For some reason this thing cannot sign.
        this.flashbotsRelaySigningWallet = new Wallet(this.FLASHBOTS_RELAY_SIGNING_KEY);
    }

    async initialize() {
        console.log("Flashbots Relay Signing Wallet Address: " + await this.flashbotsRelaySigningWallet.getAddress())

        // Initialize the flashbotsProvider based off of the network current network
        if (env.NETWORK === "GOERLI") {
            this.flashbotsProvider = await FlashbotsBundleProvider.create(
                this.provider,
                this.flashbotsRelaySigningWallet,
                "https://relay-goerli.flashbots.net",
                "goerli"
            );
        } else {
            this.flashbotsProvider = await FlashbotsBundleProvider.create(
                this.provider,
                this.flashbotsRelaySigningWallet
            );
        }

        // Create the flashBotsSender from the flashBotsProvider initialized above
        this.flashBotsSender = new FlashBotsSender(this.flashbotsProvider);
    }

    /**
     * Constructor for creating a new liquidator bot for the Alpha Homora protocol
     * @returns {AlphaHomora}
     */
    async createAlphaHomoraLiquidator() {
        // Create the liquidator bot
        let liquidator = new AlphaHomoraBot(this.flashBotsSender);

        // Initialize
        await liquidator.initialize();

        // Add the bot to the liquidators list
        this.liquidators.push(liquidator);

        // Return the newly created liquidator
        return liquidator;
    }

    // Constructor for creating a new liquidator bot for the liquity protocol
    async createLiquityLiquidator(liquityLiquidatorContractAddress) {
        // Create the liquidator bot
        let liquidator = new LiquityBot(this.flashBotsSender);

        // Initialize
        await liquidator.initialize(liquityLiquidatorContractAddress);

        // Add the bot to the liquidators list
        this.liquidators.push(liquidator);

        // Return the newly created liquidator
        return liquidator;
    }

    // Basic health check
    healthCheck() {
        if (this.HEALTH_CHECK_URL !== "") {
            get(this.HEALTH_CHECK_URL).on('error', console.error);
        }
    }

    /**
     * Resets all transactions and forks the given block on the mainnet fork
     * @param {Integer} blockNumber The block number that we will reset and fork
     * @returns {Promise<void>}
     */
    async forkBlock(blockNumber){
        await network.provider.request({
            method: "hardhat_reset",
            params: [
                {
                    forking: {
                        jsonRpcUrl: env.__MAINNET_RPC_URL__FORK,
                        blockNumber: blockNumber,
                    },
                },
            ],
        });
    }
}

module.exports.Environment = Environment;