require("@nomiclabs/hardhat-waffle");
const {expect, should} = require("chai");
const {ethers, network} = require("hardhat");
const {Environment} = require("../../src/environment");
const {parseBoolean} = require("../../src/utilities/utils");

describe("Liquity Protocol Tests", function () {
    let environment;
    let liquidator;

    beforeEach(async function () {
        // Set the timeout to 0 as the function loops on forever
        this.timeout(0);

        // Make sure we are using a test net / fork
        expect(env.NETWORK === "MAINNET" && !parseBoolean(env.NETWORK_FORK)).to.be.equal(false);

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
            await liquidator.liquidateTroves();

            // expect(profit.gt(0.2)).to.be.true();

            // await historicalWalk(environment,liq, 2387);
        })
    })

    // describe("", function () {
    //     it("", function () {
    //
    //     })
    // })
});
