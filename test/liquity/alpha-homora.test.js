const {formatEther} = require("@ethersproject/units");
const { ethers, network } = require("hardhat");

const {Environment} = require("../../src/environment");
const {expect} = require("chai");
const {parseBoolean} = require("../../src/utilities/utils");
const {env} = require("../../src/constants/env");
const {next} = require("lodash/seq");


describe.skip("Alpha Homora Protocol Tests", function(){
    let environment;
    let liquidator;

    beforeEach(async function () {
        // Set the timeout to 0 as the function loops on forever
        this.timeout(0);

        // Make sure we are using a test net / fork
        expect(env.NETWORK === "MAINNET" && !(env.NETWORK_FORK)).to.be.equal(false);

        // Create and initialize the environment parent class
        environment = new Environment();
        await environment.initialize();

        throw "Implement me"
        // liquidator = await environment.createAlphaHomoraLiquidator();
    });

    it.skip("should make some ether", async function(){

        await environment.forkBlock(2675001);

        console.log()

        // console.log("test");
        // let a = liquidator.getCollateralValue(2256);
        // let b = liquidator.getDebtValue(2256);

        // console.log(formatEther(a));
        // console.log(formatEther(b));

        //TODO turn this into a test. By getting the information of the position using the pID from lio, then running this and comparing against the return value of getDebtValue.
        // let homoraValue = await liquidator.homoraOracleContract.asETHBorrow(tokenAddress,debtAmount, positionEntry.owner);

        //TODO Test for getCollateralValue
        // let homoraValue = await this.homoraOracleContract.asETHCollateral(positionEntry.collToken, positionEntry.collId, positionEntry.collateralSize, positionEntry.owner);


        // let tierCount = await liquidator.alphaTierContract.tierCount();

        return;

        await liquidator.main();

        while (true){
            await liquidator.updatePrices();
            console.log("prices updated")
        }

        await liquidator.fullDatabasesUpdate();

        //TODO Alright let's figure out hardhat_setStorageAt to change the price of tether, and we'll use that for my tests from now on. We also need to test throughput on a personal node. If it's high enough, we can use homorabank's interface instead of fucking with all these databases and risking them breaking my code. The first way to do this is to just manually change the price of tether in the database.
        await liquidator.getAndStorePosition(289,1);

        // await historicalWalk(environment,liquidator, 2387);



        const ethBalanceBeforeLiquidation = await liquidator.executorWallet.getBalance();
        let positionEntry =  liquidator.positions.findOne({'pID': 289});
        await liquidator.liquidatePosition(positionEntry);
        const ethBalanceAfterLiquidation = await liquidator.executorWallet.getBalance();
        const profit = ethBalanceAfterLiquidation.sub(ethBalanceBeforeLiquidation);
        console.log("We made this much ETH: " + formatEther(profit));
        // expect(profit.gt(0.2)).to.be.true();

        // await historicalWalk(environment,liquidator);
        // for (const pID of liquidator.NAIVE_ACCOUNTS ){
        //   console.log(pID);
        //   let position = await liquidator.victimContract.positions(pID)
        //   console.log(position.collToken);
        //   console.log(position.collId);
        //   console.log(position.collId.toString());
        //   console.log(position);
        //   // if (){
        //   //   //TODO go do a liquidation here.
        //   // }
        // }
        // while(true){sleep(100000000)};

        // console.log( formatEther(await liquidator.victimContract.getCollateralETHValue(423)));

    })
});