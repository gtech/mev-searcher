// global.should = require('chai').should;
// global.expect = require('chai').expect;
// // addresses = require("../src/addresses");

const { ethers, network } = require("hardhat");
const { Signer, Contract, ContractFactory } = require ( "ethers");
require("@nomiclabs/hardhat-waffle");
const { expect,should } = require ( "chai");
const addresses = require ( "../src/constants/addresses");
const { CToken } = require ( "../src/constants/addresses");
const { Liquidator } = require ( "../src/liquidators/alphaHomora");
const { Environment } = require ( "../src/environment");
const { formatEther } = require ( "@ethersproject/units");

// const hre = require("hardhat");

const ERC20ABI = [
  'function balanceOf(address) external view returns (uint)',
  'function transfer(address, uint) external returns (bool)',
]

// describe("FlashBotsMultiCall", function() {
//   // The address that has USDC on mainnet
//   // const walletAddr : string = '0x6D5a7597896A703Fe8c85775B23395a48f971305'

//   // const crUSDCAddr : string = '0x44fbeBd2F576670a6C33f6Fc0B00aA8c5753b322'
//   // const USDCAddr : string = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
//   let wallet;
//   let factory : ContractFactory;
//   let flashBotsMultiCall : Contract;
//   let MY_ADDRESS : string;

//   it("Should be able to get flashloans = require ( all the major tokens.", async function() {
//     const [owner] = await ethers.getSigners();
//     MY_ADDRESS = await owner.getAddress();
//     factory  = await ethers.getContractFactory('FlashBotsMultiCall');

//     // deploy flashloan example contract
//     flashBotsMultiCall = await factory.deploy(MY_ADDRESS);//.catch((err : Error)=> {console.log(err)});
    
//     addresses.ALPHA_HOMORA_CTOKENS.forEach(async (ctoken: CToken) => {
//       await network.provider.request({
//         method: "hardhat_impersonateAccount",
//         params: [ctoken.posessingAddress]
//       }).catch((err : Error)=>{console.log(err)});
//       let possessingWallet = ethers.provider.getSigner(ctoken.posessingAddress);


//       // Send 100 of the token to flash loan example contract,
//       // so that you have enough fund to pay the fee.
//       let borrowedToken = new ethers.Contract(ctoken.underlyingAddress, ERC20ABI, possessingWallet);
//       let tx = await borrowedToken.transfer(flashBotsMultiCall.address, ctoken.decimal.mul(100)).catch((err : Error)=>{
//         console.log("Could not transfer the token");
//         console.log(err)
//       }); //We want to push the limit of how much we borrow, so let's make a function that estimates how much we can borrow  
//       await tx.wait();

//       await network.provider.request({
//         method: "hardhat_stopImpersonatingAccount",
//         params: [ctoken.posessingAddress]
//       });

//       await network.provider.request({
//         method: "hardhat_impersonateAccount",
//         params: [MY_ADDRESS]
//       });

//       console.log('contract:', flashBotsMultiCall.address);
//       // flashBotsMultiCall.address.should.be.a("string");
//       expect(1).to.equal(0);
//       // expect(flashBotsMultiCall.address).to.be.a("string");
//       // expect(flashBotsMultiCall.address).to.include("0x");


//       // call the doFlashloan
//       tx = await flashBotsMultiCall.doFlashloan(ctoken.address, ctoken.decimal.mul(1000));
//       const receipt = await tx.wait()
//       expect(receipt.status).to.equal(1);

//       // see the result
//       console.log(receipt.events);
//       console.log("status " + receipt.status);

//       await network.provider.request({
//         method: "hardhat_stopImpersonatingAccount",
//         params: [MY_ADDRESS]
//       });
//     })
//   });
// });

describe("Liquidator", function(){
  return; //WARNING do not remove this until you have prevented Liquidator from using the mainnet wallet
  let environment;
  let liq;

  it("should make some ether", async function(){
    this.timeout(0);
    environment = new Environment();
    await environment.initialize();
    liq = await environment.createAlphaHomoraLiquidator();

    // console.log("test");
    // let a = liq.getCollateralValue(2256);
    // let b = liq.getDebtValue(2256);

    // console.log(formatEther(a));
    // console.log(formatEther(b));

    //TODO turn this into a test. By getting the information of the position using the pID from lio, then running this and comparing against the return value of getDebtValue.
    // let homoraValue = await liq.homoraOracleContract.asETHBorrow(tokenAddress,debtAmount, positionEntry.owner);

    //TODO Test for getCollateralValue
    // let homoraValue = await this.homoraOracleContract.asETHCollateral(positionEntry.collToken, positionEntry.collId, positionEntry.collateralSize, positionEntry.owner);


    // let tierCount = await liq.alphaTierContract.tierCount();

    return;

    await liq.main();

    while (true){
      await liq.updatePrices();
      console.log("prices updated")
    }

    await liq.fullDatabasesUpdate();

    //TODO Alright let's figure out hardhat_setStorageAt to change the price of tether, and we'll use that for my tests from now on. We also need to test throughput on a personal node. If it's high enough, we can use homorabank's interface instead of fucking with all these databases and risking them breaking my code. The first way to do this is to just manually change the price of tether in the database.
    await liq.getAndStorePosition(289,1);

    // await historicalWalk(environment,liq, 2387);



    const ethBalanceBeforeLiquidation = await liq.executorWallet.getBalance();
    let positionEntry =  liq.positions.findOne({'pID': 289});
    await liq.liquidatePosition(positionEntry);
    const ethBalanceAfterLiquidation = await liq.executorWallet.getBalance();
    const profit = ethBalanceAfterLiquidation.sub(ethBalanceBeforeLiquidation);
    console.log("We made this much ETH: " + formatEther(profit));
    // expect(profit.gt(0.2)).to.be.true();

    // await historicalWalk(environment,liq);
    // for (const pID of liq.NAIVE_ACCOUNTS ){
    //   console.log(pID);
    //   let position = await liq.victimContract.positions(pID)
    //   console.log(position.collToken);
    //   console.log(position.collId);
    //   console.log(position.collId.toString());
    //   console.log(position);
    //   // if (){
    //   //   //TODO go do a liquidation here.
    //   // }
    // }
    // while(true){sleep(100000000)};

    // console.log( formatEther(await liq.victimContract.getCollateralETHValue(423)));

  })
});
