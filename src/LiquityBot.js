const _ = require("lodash");
const { ethers, network } = require("hardhat");
const { BigNumber, Contract, ContractFactory, PopulatedTransaction, Wallet, providers, Signer, ContractTransaction } = require("ethers");
require("@nomiclabs/hardhat-waffle");
const { SignerWithAddress } = require("@nomiclabs/hardhat-ethers/signers");
const { formatEther, formatUnits } = require("@ethersproject/units");
const { on } = require("events");
const { hrtime } = require("process");
const loki = require('lokijs');

const NUMBER_OF_TROVES_TO_LIQUIDATE = 30;
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
        let numberOfTroves = NUMBER_OF_TROVES_TO_LIQUIDATE;
        while(true){
            try {
                theoreticalLiquidationBounty = await this.liquityLiquidatorContract.callStatic.liquidateTroves(this.MINER_PERCENTAGE,numberOfTroves);
            } catch (error) {
                if (error.message == NO_LIQUIDATIONS || error.message.includes("cannot estimate gas")){
                    //We just figured out there are no liquidations ready.
                    // console.log("No defaulting troves or gas exception, trying again.")
                    await sleep(5000);
                    continue;
                }
                //Some unexpected error.
                console.log(getTimestamp() + " EMULATION ERROR: " + error);
                // await sleep(5000);
                if (error.message.includes("Request timed out.")){
                    numberOfTroves = Math.floor(numberOfTroves/2);
                    if(numberOfTroves == 0){
                        numberOfTroves = NUMBER_OF_TROVES_TO_LIQUIDATE;
                    }
                    console.log("number of troves we're trying to liquidate " + numberOfTroves);
                }
                continue;
            }
            if (formatEther(theoreticalLiquidationBounty) > this.THRESHHOLD_FOR_LIQUIDATION){
                try {
                    //TODO We need to consolidate all of my switches because this is getting ridiculous.
                    //TODO Move as much of this code into the flashbots part as possible.
                    
                    liquidationTransaction = await this.liquityLiquidatorContract.populateTransaction.liquidateTroves(this.MINER_PERCENTAGE,numberOfTroves,{
                        type: 2,
                        value: 0,
                    })
                    await this.flashbotsSender.sendIt(liquidationTransaction,this.liquityLiquidatorContract,this.executorWallet);
                    numberOfTroves = NUMBER_OF_TROVES_TO_LIQUIDATE;

                    // await this.liquityLiquidatorContract.withdrawErc20(LUSD);
                    latestBalance = await this.executorWallet.getBalance();
                    console.log(getTimestamp() + " We made " + formatEther(latestBalance.sub(originalBalance)) + " ETH!");
                    await sleep(5000);
                } catch (error) {
                    //Some unexpected error.
                    console.log(getTimestamp() + " LIVE ERROR: " + error);
                    continue;
                }
                
                theoreticalLiquidationBounty = BigNumber.from(0);
            }
        }
     }
}

function getTimestamp() {
    const pad = (n,s=2) => (`${new Array(s).fill(0)}${n}`).slice(-s);
    const d = new Date();
    
    return `${pad(d.getFullYear(),4)}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.LiquityBot = LiquityBot;
