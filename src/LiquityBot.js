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
const NOT_DEPLOYED_ON_MAINNET = true;
const GOERLI_DEPLOY = true;


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
        // if (this.executorWallet.provider._network.chainId === 31337){
        //     await hre.network.provider.request({
        //         method: "hardhat_impersonateAccount",
        //         params: ["0x72BA4622A13C58abacbA231d7B00750a9048726d"],
        //       });
        // }
        const [owner] = await ethers.getSigners();
        this.executorWallet = owner;

        // if (process.env.PRIVATE_KEY != undefined){
        //     let wallet = new Wallet(process.env.PRIVATE_KEY);
        //     this.executorWallet = wallet.connect(ethers.provider);
        // } else {

        // }


        await this.executorWallet.provider._networkPromise;
        let LiquityLiquidator = await ethers.getContractFactory("LiquityLiquidator");
        if ((this.executorWallet.provider._network.chainId === 31337 && NOT_DEPLOYED_ON_MAINNET) || (GOERLI_DEPLOY && this.executorWallet.provider._network.chainId === 5) ) {
            this.liquityLiquidatorContract = await LiquityLiquidator.deploy(this.executorWallet.address, {gasLimit: 600000});
            console.log("LiquityLiquidator deployed to: ", this.liquityLiquidatorContract.address);

            const deploymentData = LiquityLiquidator.interface.encodeDeploy([this.executorWallet.address]);
            const estimatedGas = await ethers.provider.estimateGas({ data: deploymentData });
            console.log("took approx this much gas: " + estimatedGas);

        } else {
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
                //TODO The problem here might be that a revert costs a ton of gas.
                //I think we're going to need to interact directly with geth. Maybe we'll just use includes gas exception and hope for the best. It may be thath callStatic doesn't even work for my node though.
                // let gasEstimate = await this.liquityLiquidatorContract.estimateGas.liquidateTroves(MINER_PERCENTAGE,NUMBER_OF_TROVES_TO_LIQUIDATE);
                theoreticalLiquidationBounty = await this.liquityLiquidatorContract.callStatic.liquidateTroves(MINER_PERCENTAGE,NUMBER_OF_TROVES_TO_LIQUIDATE);
            } catch (error) {
                if (error.message == NO_LIQUIDATIONS || error.message.includes("cannot estimate gas")){
                    //We just figured out there are no liquidations ready.
                    console.log("No defaulting troves or gas exception, trying again.")
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
     //Launch the smart contract. Test my flashbots code on live with a similar transaction from the same wallet and contract. Set up my own node and use that for live. Test as much of the code on live as possible. Like like transfer in ETH or something or just simulate it. Try to make it as easy as possible to convert to the Liquidator alphahomora bot. Create a main script that will run the bot.

    async sendBundle(transaction, blockNumber, mySmartContract){
        try {
            const estimateGas = await mySmartContract.provider.estimateGas(
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
