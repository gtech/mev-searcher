// global.should = require('chai').should;
// global.expect = require('chai').expect;
// // addresses = require("../src/addresses");

const { ethers, network } = require("hardhat");
const { Signer, Contract, ContractFactory } = require ( "ethers");
require("@nomiclabs/hardhat-waffle");
const { expect,should } = require ( "chai");
const addresses = require ( "../src/addresses");
const { CToken } = require ( "../src/addresses");
const { Liquidator } = require ( "../src/Liquidator");
const { Environment } = require ( "../src/Environment");
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
  let environment;
  let liq;

  it("should make some ether", async function(){
    this.timeout(0);
    environment = new Environment();
    await environment.initialize();
    liq = await environment.createLiquidator();

    const ethBalanceBeforeLiquidation = await liq.executorWallet.getBalance();

    // await liq.updateAllPositions();

    // return

    await liq.updatePrices();

    await liq.liquidatePosition(395);

    const ethBalanceAfterLiquidation = await liq.executorWallet.getBalance();
    const profit = ethBalanceAfterLiquidation.sub(ethBalanceBeforeLiquidation);
    console.log("We made this much ETH: " + formatEther(profit));
    // expect(profit.gt(0.2)).to.be.true();

    //TODO We gotta find all of these.
    
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

async function historicalWalk(environment, liq ){
  let accountNum = 456;

    let block = 12603506;
    let day = 0;

    while(true){
      let difference = formatEther( await liq.findAccountValue(accountNum));
      console.log("Block " + block + ", " + difference + " Ether til liq, day " + day);
      block+=2000;
      day++;
      environment.forkBlock(block);
    }
}

async function testAccrueEffect(liq ){
  let accountNum = 614;

    // let banks = await liq.getBanks();
    // console.log(banks);

    let before = await liq.findAccountValue(accountNum);
    console.log(formatEther(before));
    await liq.accrue();
    let after = await liq.findAccountValue(accountNum);
    let result = before.sub(after);
    console.log(formatEther(result) + "Ether");

    // console.log()
    // console.log(formatEther(await liq.findAccountValue(45)) + " Ether");
    // await liq.find_defaulting_accounts();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}