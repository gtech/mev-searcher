const {formatEther} = require("@ethersproject/units");
const { ethers, network } = require("hardhat");

const {Environment} = require("../../src/environment");
const {expect} = require("chai");
const {parseBoolean} = require("../../src/utilities/utils");
const {env} = require("../../src/constants/env");
const {next} = require("lodash/seq");


describe("Alpha Homora Protocol Tests", function(){
    let environment;
    let liquidator;

    before(async function () {
        // Set the timeout to 0 as the function loops on forever
        this.timeout(0);

        // Make sure we are using a test net / fork
        expect(env.NETWORK === "MAINNET" && !(env.NETWORK_FORK)).to.be.equal(false);

        // Create and initialize the environment parent class
        environment = new Environment();
        await environment.initialize();

        try {
            liquidator = await environment.createAlphaHomoraLiquidator();
        } catch (e) {
            console.log(e);
            return;
        }
        // liquidator.main();
        console.log("test");
    });



    it("should make some ether from liquidating account 289 on block 12490308", async function(){

        await environment.forkBlock(12490308);

        let a = liquidator.getCollateralValue(289);
        let b = liquidator.getDebtValue(289);

        console.log(formatEther(a));
        console.log(formatEther(b));

        liquidator.getAndStorePosition(289,1);

        const ethBalanceBeforeLiquidation = await liquidator.executorWallet.getBalance();
        let positionEntry =  liquidator.positions.findOne({'pID': 289});
        liquidator.liquidatePosition(positionEntry);
        const ethBalanceAfterLiquidation = await liquidator.executorWallet.getBalance();
        const profit = ethBalanceAfterLiquidation.sub(ethBalanceBeforeLiquidation);
        console.log("We made this much ETH: " + formatEther(profit));
        // expect(profit.gt(0.2)).to.be.true();


    });

    it.skip("should update the database or something", async function(){
        //TODO turn this into a test. By getting the information of the position using the pID from lio, then running this and comparing against the return value of getDebtValue.
        // let homoraValue = await liquidator.homoraOracleContract.asETHBorrow(tokenAddress,debtAmount, positionEntry.owner);

        //TODO Test for getCollateralValue
        // let homoraValue = await this.homoraOracleContract.asETHCollateral(positionEntry.collToken, positionEntry.collId, positionEntry.collateralSize, positionEntry.owner);

        // let tierCount = await liquidator.alphaTierContract.tierCount();

        await liquidator.main();

        while (true){
            await liquidator.updatePrices();
            console.log("prices updated");
        }

        await liquidator.fullDatabasesUpdate();

        //TODO Alright let's figure out hardhat_setStorageAt to change the price of tether, and we'll use that for my tests from now on. We also need to test throughput on a personal node. If it's high enough, we can use homorabank's interface instead of fucking with all these databases and risking them breaking my code. The first way to do this is to just manually change the price of tether in the database.

    })
});