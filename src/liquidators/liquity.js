const {formatEther} = require("@ethersproject/units");
const {BigNumber, Wallet} = require("ethers");
const {ethers} = require("hardhat");
// const _ = require("lodash");
require("@nomiclabs/hardhat-waffle");
const {env} = require("../constants/env");
const { getTimestamp, sleep } = require("../utilities/utils");

const NUMBER_OF_TROVES_TO_LIQUIDATE = 30;
const NO_LIQUIDATIONS = "VM Exception while processing transaction: reverted with reason string 'TroveManager: nothing to liquidate'";
const LUSD = "0x5f98805A4E8be255a32880FDeC7F6728C6568bA0";

class Liquity {
    MINER_PERCENTAGE;
    THRESHOLD_FOR_LIQUIDATION;

    flashbotsSender;
    liquityLiquidatorContract;
    executorWallet;


    constructor(flashbotsSender) {
        this.flashbotsSender = flashbotsSender;
        this.MINER_PERCENTAGE = env.MINER_PERCENTAGE;
        this.THRESHOLD_FOR_LIQUIDATION = env.THRESHHOLD_FOR_LIQUIDATION;
    }

    async initialize(liquityLiquidatorContractAddress) {
        const [owner] = await ethers.getSigners();
        this.executorWallet = new Wallet(env.PRIVATE_KEY, ethers.provider);

        // Initialize the liquityLiquidator contract address
        let liquityContract = await ethers.getContractAt(
            "LiquityLiquidator",
            liquityLiquidatorContractAddress
        );

        this.liquityLiquidatorContract = liquityContract.connect(this.executorWallet);
    }

    async liquidateTroves() {
        let originalBalance = await this.executorWallet.getBalance();
        while (true) {
            let theoreticalLiquidationBounty;
            try {
                // Run the liquidateTroves function using the callStatic parameter to test and verify the contract, as
                // well as calculate the bounty received from the liquidation
                theoreticalLiquidationBounty = await this.liquityLiquidatorContract.callStatic.liquidateTroves(
                    this.MINER_PERCENTAGE,
                    NUMBER_OF_TROVES_TO_LIQUIDATE
                );
            } catch (error) {
                // If there are no liquidation than sleep for five seconds and try again
                if (error.message === NO_LIQUIDATIONS || error.message.includes("cannot estimate gas")) {
                    // We just figured out there are no liquidations ready.
                    await sleep(5000);
                    continue;
                }

                // Otherwise, some unexpected error has occurred. Log the error and continue
                console.log(getTimestamp() + " EMULATION ERROR: " + error);

                // If the request failed to emulate, cut the number of troves in half and try again
                if (error.message.includes("Request timed out.")) {
                    console.log("number of troves we're trying to liquidate " + NUMBER_OF_TROVES_TO_LIQUIDATE);
                }
                await sleep(5000);
                continue;
            }

            // Check to make sure that the liquidation bounty is worthwhile
            if (formatEther(theoreticalLiquidationBounty) > this.THRESHOLD_FOR_LIQUIDATION) {
                try {
                    //TODO We need to consolidate all of my switches because this is getting ridiculous.

                    // Build the transaction information for the liquidateTroves function
                    const liquidationTransaction = await this.liquityLiquidatorContract.populateTransaction.liquidateTroves(
                        this.MINER_PERCENTAGE,
                        NUMBER_OF_TROVES_TO_LIQUIDATE,
                        {
                            type: 2,
                            value: 0,
                        }
                    )

                    // execute the transaction on the main-net using flashbots
                    //TODO Test flashbots simulation now on Goerli and create some sort of fallback if it doesn't work. There are liquidations that happened around 2022-01-21 22:51:29 so we need to figure out why the simulations didn't work and how much we would have made.

                    let result = await this.flashbotsSender.sendIt(
                        liquidationTransaction,
                        this.liquityLiquidatorContract,
                        this.executorWallet
                    );

                    if(result === false){
                        await sleep(5000);
                        continue;
                    }

                    // Grab the balance of the wallet
                    const latestBalance = await this.executorWallet.getBalance();

                    // Log the profit :)
                    console.log(getTimestamp() + " We made " + formatEther(latestBalance.sub(originalBalance)) + " ETH!");

                    // Wait five seconds before running the next batch
                    await sleep(5000);
                } catch (error) {
                    //Some unexpected error.
                    console.log(getTimestamp() + " LIVE ERROR: " + error);
                    continue;
                }

                // Reset the bounty
                theoreticalLiquidationBounty = BigNumber.from(0);
            }
        }
    }
}

module.exports.LiquityBot = Liquity;
