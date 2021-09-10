const _ = require("lodash");
const { ethers, network } = require("hardhat");
const { BigNumber, Contract, ContractFactory, PopulatedTransaction, Wallet, providers, Signer, ContractTransaction } = require("ethers");
require("@nomiclabs/hardhat-waffle");
const { FlashbotsBundleProvider } = require("@flashbots/ethers-provider-bundle");
const { SignerWithAddress } = require("@nomiclabs/hardhat-ethers/signers");
const { formatEther, formatUnits } = require("@ethersproject/units");
const { ChainId, Token, WETH, Fetcher, Trade, Route, TokenAmount, TradeType, Percent } = require('@uniswap/sdk')
const { on } = require("events");
const { hrtime } = require("process");
const loki = require('lokijs');

const MINER_PERCENTAGE = 25;
const NUMBER_OF_TROVES_TO_LIQUIDATE = 90;
const THRESHHOLD_FOR_LIQUIDATION = 2; //Using ETH
let ethPrice = 3038; //TODO These probably should be class vars instead of globals.
const NO_LIQUIDATIONS = "VM Exception while processing transaction: reverted with reason string 'TroveManager: nothing to liquidate'";
const LUSD = "0x5f98805A4E8be255a32880FDeC7F6728C6568bA0";


class LiquityBot {
    // private flashLoaner: Flashloaner;
    // readonly PRIVATE_KEY;
    // readonly BUNDLE_EXECUTOR_ADDRESS;
    flashbotsProvider;
    liquityLiquidatorContract;
    executorWallet;

   constructor(flashbotsProvider) {
        // this.executorWallet = executorWallet;        
        this.flashbotsProvider = flashbotsProvider;
        // this.bundleExecutorContract = bundleExecutorContract;
        // this.PRIVATE_KEY = process.env.PRIVATE_KEY || "";
        // this.BUNDLE_EXECUTOR_ADDRESS = process.env.BUNDLE_EXECUTOR_ADDRESS || "";

        
    }

    async initialize(){
        

        if (process.env.PRIVATE_KEY != undefined){
            let wallet = new Wallet(process.env.PRIVATE_KEY);
            this.executorWallet = wallet.connect(ethers.provider);
        } else {
            const [owner] = await ethers.getSigners();
            this.executorWallet = owner;
        }
        

        await this.executorWallet.provider._networkPromise;
        if (this.executorWallet.provider._network.chainId === 31337) {
            let LiquityLiquidator = await ethers.getContractFactory("LiquityLiquidator");
            // let  = await fact.connect(this.executorWallet);

            //TODO Fuck, looks like I may have to put my private keys in my hardhat.config.js. I should just do it the way that Arbitrage does it. No, let's make it... wait what about when I'm in the middle of developing one or the other? Yeah we shouldn't be pushing hardhat.config.js anyway. This is for the best.
            this.liquityLiquidatorContract = await LiquityLiquidator.deploy(this.executorWallet.address);
            console.log("LiquityLiquidator deployed to: ", this.liquityLiquidatorContract.address);
            
            const deploymentData = LiquityLiquidator.interface.encodeDeploy([this.executorWallet.address]);
            const estimatedGas = await ethers.provider.estimateGas({ data: deploymentData });
            console.log("took approx this much gas: " + estimatedGas);

        } else {
            // this.BUNDLE_EXECUTOR_ADDRESS = process.env.BUNDLE_EXECUTOR_ADDRESS;
            this.liquityLiquidatorContract = await ethers.getContractAt("LiquityLiquidator",process.env.LIQUITY_LIQUIDATOR_ADDRESS);
        }
    }

    async liquidateTroves(){
        let originalBalance = await this.executorWallet.getBalance();
        let latestBalance;
        let theoreticalLiquidationBounty;
        let liquidationBounty;
        while(true){
            try {
                //TODO might need to change this to debug_traceCall
                //TODO This has to be tested on my private node.
                theoreticalLiquidationBounty = await this.liquityLiquidatorContract.callStatic.liquidateTroves(MINER_PERCENTAGE,NUMBER_OF_TROVES_TO_LIQUIDATE);
            } catch (error) {
                if (error.message == NO_LIQUIDATIONS){
                    //We just figured out there are no liquidations ready.
                    console.log("trying again.")
                    await sleep(5000);
                    continue;
                }
                //Some unexpected error.
                console.log("ERROR: " + error);
                await sleep(5000);
                continue;
            }
            if (formatEther(theoreticalLiquidationBounty) > THRESHHOLD_FOR_LIQUIDATION){
                try {
                    //TODO This has to be changed to flashbots.
                    liquidationBounty = await this.liquityLiquidatorContract.liquidateTroves(MINER_PERCENTAGE,NUMBER_OF_TROVES_TO_LIQUIDATE)
                    this.liquityLiquidatorContract.withdrawErc20(LUSD);
                } catch (error) {
                    //Some unexpected error.
                    console.log("ERROR: " + error);
                    continue;
                }
                latestBalance = await this.executorWallet.getBalance();
                console.log("We made " + formatEther(latestBalance.sub(originalBalance)) + " ETH!");
                console.log(liquidationBounty);
            }
        }
     }
     //  Make sure the Liquidator doesn't use the main wallet ever yet somehow. Test the bot on the forked net using the live wallet. Figure out how to do that safely. Create a main script that will run the bot. Set up my own node and use that for live. Test as much of the code on live as possible. Test my flashbots code on live with a similar transaction from the same wallet and contract. Like like transfer in ETH or something or just simulate it. Try to make it as easy as possible to convert to the Liquidator alphahomora bot. 

    async sendBundle(transaction, blockNumber){    
        try {
            const estimateGas = await this.bundleExecutorContract.provider.estimateGas(
            {
                ...transaction,
                from: this.executorWallet.address
            })
            if (estimateGas.gt(1400000)) {
                console.log("EstimateGas succeeded, but suspiciously large: " + estimateGas.toString())
                return
            }
            transaction.gasLimit = estimateGas.mul(2)
        } catch (e) {
            console.warn(`Estimate gas failure for ${JSON.stringify(transaction)}`)
            return
        }
        const bundledTransactions = [
            {
            signer: this.executorWallet,
            transaction: transaction
            }
        ];
        console.log(bundledTransactions)
        const signedBundle = await this.flashbotsProvider.signBundle(bundledTransactions)
        //
        const simulation = await this.flashbotsProvider.simulate(signedBundle, blockNumber + 1 )
        if ("error" in simulation || simulation.firstRevert !== undefined) {
            console.log(`Simulation Error on ${transaction}`)
            return
        }
        console.log(`Submitting bundle, profit sent to miner: ${bigNumberToDecimal(simulation.coinbaseDiff)}, effective gas price: ${bigNumberToDecimal(simulation.coinbaseDiff.div(simulation.totalGasUsed), 9)} GWEI`)
        const bundlePromises =  _.map([blockNumber + 1, blockNumber + 2], targetBlockNumber =>
            this.flashbotsProvider.sendRawBundle(
            signedBundle,
            targetBlockNumber
        ))
        await Promise.all(bundlePromises)
        return
    }

}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.LiquityBot = LiquityBot;
