const {FlashbotsBundleProvider} = require("@flashbots/ethers-provider-bundle");
const {BigNumber} = require("ethers");
const {ethers} = require("hardhat");
const _ = require("lodash");
const { bigNumberToDecimal } = require("./utils");


class FlashBotsSender {
    flashbotsProvider;

    constructor(flashbotsProvider) {
        this.flashbotsProvider = flashbotsProvider;
    }

    /**
     *
     * @param {PopulatedTransaction} transaction transaction details for the contract
     * @param {contract} contract the smart contract the transaction is run through
     * @param {wallet} address a wallet that is used to execute the transaction
     * @returns {async transactionPromise[]} the awaited transaction promises used to execute the transaction
     */
    async sendIt(transaction, contract, wallet) {
        // Grab the latest block
        const block = await ethers.provider.getBlock("latest");
        const blockNumber = block.number;

        // Try to estimate the amount of gas required to execute the transaction
        try {
            // Calculate the base gas fee for the next block
            const maxBaseFeeInFutureBlock = FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(
                block.baseFeePerGas,
                1
            );

            // Initialize the chainId and maxFeePerGas parameters
            transaction.chainId = wallet.provider._network.chainId;
            transaction.maxFeePerGas = maxBaseFeeInFutureBlock;

            // Estimate the gas required to execute the corresponding transaction
            const estimateGas = await contract.provider.estimateGas(
                {
                    ...transaction,
                    from: wallet.address
                }
            )

            // Max sure the gas is not super large
            if (estimateGas.gt(1400000)) {
                console.log("EstimateGas succeeded, but suspiciously large: " + estimateGas.toString())
                return false;
            }

            // Set the gasLimit to be 2x the estimation
            transaction.gasLimit = estimateGas.mul(2);
        } catch (e) {
            console.warn(`Estimate gas failure for ${JSON.stringify(transaction)}`)
            console.log(e);
            return false;
        }

        // Flashbots lets you order a series of transactions in a block. In this case, we are only bundling a single
        // transaction
        const bundledTransactions = [
            {
                signer: wallet,
                transaction: transaction
            }
        ];
        // Sign the transaction bundle with our flashbotsProvider account
        const signedBundle = await this.flashbotsProvider.signBundle(bundledTransactions)

        // Simulate the transaction one last time to make sure the transaction is still valid and works
        const simulation = await this.flashbotsProvider.simulate(signedBundle, blockNumber + 1)
        if ("error" in simulation || simulation.firstRevert !== undefined) {
            console.log(`Simulation Error on ${transaction}`)
            return false;
        }

        console.log(`Submitting bundle, profit sent to miner: ${bigNumberToDecimal(simulation.coinbaseDiff)}, effective gas price: ${bigNumberToDecimal(simulation.coinbaseDiff.div(simulation.totalGasUsed), 9)} GWEI`)

        // Try to execute the transaction in one of the next two blocks
        const bundlePromises = _.map(
            [blockNumber + 1, blockNumber + 2],
            (targetBlockNumber) => {
                this.flashbotsProvider.sendRawBundle(
                    signedBundle,
                    targetBlockNumber
                )
            }
        )

        // Wait for the promises to complete
        await Promise.all(bundlePromises)

        // Return the execution responses
        return bundlePromises;
    }
}

module.exports.FlashBotsSender = FlashBotsSender;
