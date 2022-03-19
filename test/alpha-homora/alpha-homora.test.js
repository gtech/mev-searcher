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
        // Set the timeout to 0 as the function is going to take awhile
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
    });



    //TODO Finish implementing
    it("should make some ether from liquidating account 289 on block 12490308", async function(){
        // Set the timeout to 0 as the function is going to take awhile
        this.timeout(0)

        //TODO I think we're going to have a problem initializing in the before if we're going to fork.
        // await environment.forkBlock(12490308);

        await liquidator.getAndStorePosition(289,1);

        let a = liquidator.getCollateralValue(289);
        let b = liquidator.getDebtValue(289);

        console.log(formatEther(a));
        console.log(formatEther(b));


        const ethBalanceBeforeLiquidation = await liquidator.executorWallet.getBalance();
        let positionEntry =  liquidator.positions.findOne({'pID': 289});
        liquidator.liquidatePosition(positionEntry);
        const ethBalanceAfterLiquidation = await liquidator.executorWallet.getBalance();
        const profit = ethBalanceAfterLiquidation.sub(ethBalanceBeforeLiquidation);
        console.log("We made this much ETH: " + formatEther(profit));
        // expect(profit.gt(0.2)).to.be.true();


    });

    //TODO Database integrity checks
    it.skip("Updates database", async function(){
        this.timeout(0);
        await liquidator.fullDatabasesUpdate();

        // await liquidator.updatePrices();
        // console.log("prices updated");
    })

    it.skip("Returns tiercounts", async function(){
        // let tierCount = await liquidator.alphaTierContract.tierCount();

    })

    it.skip("getCollateralValue matches asETHCollateral", async function(){
        //TODO Test for getCollateralValue
        // let homoraValue = await this.homoraOracleContract.asETHCollateral(positionEntry.collToken, positionEntry.collId, positionEntry.collateralSize, positionEntry.owner);
    })

    it.skip("getDebtValue equals asETHBorrow", async function(){
        //TODO turn this into a test. By getting the information of the position using the pID from lio, then running this and comparing against the return value of getDebtValue.
        // let homoraValue = await liquidator.homoraOracleContract.asETHBorrow(tokenAddress,debtAmount, positionEntry.owner);
    })

    it.skip("scores big when tether collapses", async function(){
        //TODO Alright let's figure out hardhat_setStorageAt to change the price of tether, and we'll use that for my tests from now on. We also need to test throughput on a personal node. If it's high enough, we can use homorabank's interface instead of fucking with all these databases and risking them breaking my code. The first way to do this is to just manually change the price of tether in the database.
    })

    //TODO Implement main loop test
    it.skip("sanely runs main loop", async function(){

        await liquidator.main();

    })
});