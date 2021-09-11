const _ = require("lodash");
const { ethers, network } = require("hardhat");
const { BigNumber, Contract, ContractFactory, PopulatedTransaction, Wallet, providers, Signer, ContractTransaction } = require("ethers");
require("@nomiclabs/hardhat-waffle");
const { SignerWithAddress } = require("@nomiclabs/hardhat-ethers/signers");
const { formatEther, formatUnits } = require("@ethersproject/units");
const { on } = require("events");
const { hrtime } = require("process");
const loki = require('lokijs');

const NUMBER_OF_TROVES_TO_LIQUIDATE = 90;
const NO_LIQUIDATIONS = "VM Exception while processing transaction: reverted with reason string 'TroveManager: nothing to liquidate'";
const LUSD = "0x5f98805A4E8be255a32880FDeC7F6728C6568bA0";
const NOT_DEPLOYED_ON_MAINNET = false;
class LiquityBot {
    flashbotsSender;
    liquityLiquidatorContract;
    executorWallet;
    MINER_PERCENTAGE;
    THRESHHOLD_FOR_LIQUIDATION;


   constructor(flashbotsSender) {
        this.flashbotsSender = flashbotsSender;
        this.MINER_PERCENTAGE = parseInt(process.env.MINER_PERCENTAGE);
        this.THRESHHOLD_FOR_LIQUIDATION = parseFloat(process.env.THRESHHOLD_FOR_LIQUIDATION);
    }

    async initialize(){

        const [owner] = await ethers.getSigners();
        this.executorWallet = new Wallet(process.env.PRIVATE_KEY, ethers.provider);

        await owner.provider._networkPromise;
        let LiquityLiquidator = await ethers.getContractFactory("LiquityLiquidator");
        if (owner.provider._network.chainId === 31337 && NOT_DEPLOYED_ON_MAINNET) {
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
        let liquidationTransaction;
        while(true){
            try {
                theoreticalLiquidationBounty = await this.liquityLiquidatorContract.callStatic.liquidateTroves(this.MINER_PERCENTAGE,NUMBER_OF_TROVES_TO_LIQUIDATE);
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
            if (formatEther(theoreticalLiquidationBounty) > this.THRESHHOLD_FOR_LIQUIDATION){
                try {
                    //TODO We need to consolidate all of my switches because this is getting ridiculous.
                    //TODO Move as much of this code into the flashbots part as possible.
                    
                    liquidationTransaction = await this.liquityLiquidatorContract.populateTransaction.liquidateTroves(this.MINER_PERCENTAGE,NUMBER_OF_TROVES_TO_LIQUIDATE,{
                        type: 2,
                        value: 0,
                    })
                    await this.flashbotsSender.sendIt(liquidationTransaction,this.liquityLiquidatorContract,this.executorWallet);

                    await this.liquityLiquidatorContract.withdrawErc20(LUSD);
                } catch (error) {
                    //Some unexpected error.
                    console.log("ERROR: " + error);
                    continue;
                }
                latestBalance = await this.executorWallet.getBalance();
                console.log("We made " + formatEther(latestBalance.sub(originalBalance)) + " ETH!");
                theoreticalLiquidationBounty = BigNumber.from(0);
                await sleep(14000);
            }
        }
     }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.LiquityBot = LiquityBot;
