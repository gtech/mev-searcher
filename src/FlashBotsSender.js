const { FlashbotsBundleProvider } = require("@flashbots/ethers-provider-bundle");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const _ = require("lodash");


class FlashBotsSender {
    flashbotsProvider;

    constructor(flashbotsProvider){
        this.flashbotsProvider = flashbotsProvider;
    }

    async sendIt(transaction, mySmartContract, wallet){  
        const block = await ethers.provider.getBlock("latest");
        const blockNumber = block.number;
        try {       
            const maxBaseFeeInFutureBlock = FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(block.baseFeePerGas, 1);
            transaction.chainId = wallet.provider._network.chainId;
            transaction.maxFeePerGas = maxBaseFeeInFutureBlock;
            const estimateGas = await mySmartContract.provider.estimateGas(
            {
                ...transaction,
                from: wallet.address
            })
            if (estimateGas.gt(1400000)) {
                console.log("EstimateGas succeeded, but suspiciously large: " + estimateGas.toString())
                return
            }
            transaction.gasLimit = estimateGas.mul(2);
        } catch (e) {
            console.warn(`Estimate gas failure for ${JSON.stringify(transaction)}`)
            return
        }
        const bundledTransactions = [
            {
            signer: wallet,
            transaction: transaction
            }
        ];
        console.log(bundledTransactions)
        const signedBundle = await this.flashbotsProvider.signBundle(bundledTransactions)
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
        return bundlePromises;
    }
}

function bigNumberToDecimal(value, base = 18){
    const divisor = BigNumber.from(10).pow(base)
    return value.mul(10000).div(divisor).toNumber() / 10000
}

module.exports.FlashBotsSender = FlashBotsSender;
