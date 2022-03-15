require("@nomiclabs/hardhat-waffle");
const {expect, should} = require("chai");
const {ethers, network} = require("hardhat");
const {Environment} = require("../../src/environment");
const {parseBoolean} = require("../../src/utilities/utils");
const {env} = require("../../src/constants/env");
const {Wallet} = require("ethers");


describe("Liquity Protocol Tests", function () {
    let environment;
    let liquidator;

    beforeEach(async function () {
        // Set the timeout to 0 as the function loops on forever
        this.timeout(0);

        // Make sure we are using a test net / fork
        expect(env.NETWORK === "MAINNET" && !(env.NETWORK_FORK)).to.be.equal(false);

        // Create and initialize the environment parent class
        environment = new Environment();
        await environment.initialize()

        liquidator = await environment.createLiquityLiquidator();
    });

    // Check liquity bot initialization
    it("correctly constructs the liquity liquidator", async function () {
        // Check something...
    })

    // Check that the liquidateTroves function can be closed once started
    it("can close liquidateTroves() process", async function () {
        // Check something...
    })

    describe("liquidate troves", function () {

        it("should make some ether", async function () {

            //TODO Need to find a way to deal with not having a balance on the test wallet address on the fork
            // const [executorWallet] = await ethers.getSigners();
            let executorWallet = new Wallet(env.PRIVATE_KEY, ethers.provider);
            await network.provider.send("hardhat_setBalance", [
                executorWallet.address,
                "0x100000000000000000000"
            ]);

            await liquidator.liquidateTroves();

            // expect(profit.gt(0.2)).to.be.true();

        })
    })
});
