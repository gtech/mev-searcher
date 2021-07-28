const { FlashbotsBundleProvider } = require("@flashbots/ethers-provider-bundle");
// import { Contract, providers, Wallet } from "ethers";
// const { BUNDLE_EXECUTOR_ABI } = require("./abi");
// const { UniswappyV2EthPair } = require("./UniswappyV2EthPair");
// const { Arbitrage } = require("./Arbitrage");
const { get } = require("https")
const { getDefaultRelaySigningKey } = require("./utils");
const { FACTORY_ADDRESSES } = require("./addresses");
const { ethers, network } = require("hardhat");
const { Signer, Contract, ContractFactory, providers, Wallet } = require("ethers");
require("@nomiclabs/hardhat-waffle");
const { ProviderConnectInfo } = require("hardhat/types/provider");
const { Liquidator } = require("./Liquidator");
const dotenv = require('dotenv');

class Environment {
    ETHEREUM_RPC_URL;
    FLASHBOTS_RELAY_SIGNING_KEY;
    MINER_REWARD_PERCENTAGE;
    HEALTHCHECK_URL;
    provider;
    // private normalSigningWallet : Wallet;
    flashbotsRelaySigningWallet;
    flashbotsProvider;
    liquidators;

    constructor() {
        dotenv.config();
        this.ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || "http://127.0.0.1:8545";

        this.FLASHBOTS_RELAY_SIGNING_KEY = process.env.FLASHBOTS_RELAY_SIGNING_KEY || getDefaultRelaySigningKey();

        this.MINER_REWARD_PERCENTAGE = parseInt(process.env.MINER_REWARD_PERCENTAGE || '1');
        this.liquidators = [];

        this.HEALTHCHECK_URL = process.env.HEALTHCHECK_URL || ""

        this.provider = new providers.StaticJsonRpcProvider(this.ETHEREUM_RPC_URL);

        // this.normalSigningWallet = new Wallet(this.PRIVATE_KEY);
        this.flashbotsRelaySigningWallet = new Wallet(this.FLASHBOTS_RELAY_SIGNING_KEY);
        
    }

    async initialize(){
        // console.log("Searcher Wallet Address: " + await this.normalSigningWallet.getAddress())
        console.log("Flashbots Relay Signing Wallet Address: " + await this.flashbotsRelaySigningWallet.getAddress())

        this.flashbotsProvider = await FlashbotsBundleProvider.create(
            this.provider,
            this.flashbotsRelaySigningWallet
        );
    }

    async createLiquidator(){
        let liquidator = new Liquidator(this.flashbotsProvider);
        await liquidator.initialize();
        this.liquidators.push(liquidator);
        return liquidator;
    }

    async forkBlock(blocknumber){ 
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
              forking: {
                jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/7iK_P5rb5W1o7oM97IQWboQ3oVLjVq8D",
                blockNumber: blocknumber
              }
            }]
          })
    }

    async disableFork(){
        await network.provider.request({
            method: "hardhat_reset",
            params: []
          })
    }

    healthcheck() {
        if (this.HEALTHCHECK_URL === "") {
            return
        }
        get(this.HEALTHCHECK_URL).on('error', console.error);
    }

    // async randomArbitrageCode(){
    //     const markets = await UniswappyV2EthPair.getUniswapMarketsByToken(this.provider, FACTORY_ADDRESSES);
    //     this.provider.on('block', async (blockNumber) => {
    //         await UniswappyV2EthPair.updateReserves(this.provider, markets.allMarketPairs);
    //         const bestCrossedMarkets = await arbitrage.evaluateMarkets(markets.marketsByToken);
    //         if (bestCrossedMarkets.length === 0) {
    //             console.log("No crossed markets")
    //             return
    //         }
    //         bestCrossedMarkets.forEach(Arbitrage.printCrossedMarket);
    //         // arbitrage.takeCrossedMarkets(bestCrossedMarkets, blockNumber, this.MINER_REWARD_PERCENTAGE).then(this.healthcheck).catch(console.error)
    //     })
    // }
}

module.exports.Environment = Environment;