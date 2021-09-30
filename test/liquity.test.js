// global.should = require('chai').should;
// global.expect = require('chai').expect;
// // addresses = require("../src/addresses");

const { ethers, network } = require("hardhat");
const { Signer, Contract, ContractFactory } = require ( "ethers");
require("@nomiclabs/hardhat-waffle");
const { expect,should } = require ( "chai");
const addresses = require ( "../src/addresses");
const { CToken } = require ( "../src/addresses");
const { Liquidator } = require ( "../src/LiquityBot");
const { Environment } = require ( "../src/Environment");
const { formatEther } = require ( "@ethersproject/units");

const ERC20ABI = [
  'function balanceOf(address) external view returns (uint)',
  'function transfer(address, uint) external returns (bool)',
]

describe("LiquityBot", function(){
  let environment;
  let liqBot;

  it("should make some ether", async function(){
    this.timeout(0);
    environment = new Environment();
    await environment.initialize();
    liqBot = await environment.createLiquityBot();
    await liqBot.liquidateTroves();

    

    // expect(profit.gt(0.2)).to.be.true();

    // await historicalWalk(environment,liq, 2387);
  })
});

async function historicalWalk(environment, liq, accountNum){
    let block = 13080000;
    let day = 0;
    let a;
    let b;

    while(true){
      // let difference = formatEther( await liq.findAccountValue(accountNum));
      if (liq.isAccountDefaulting(accountNum)){
        console.log("Account " + accountNum + " is in default on block " + block);
      }
      await liq.updatePrices();
      if (block % 10 == 0){
        a = formatEther(liq.getCollateralValue(accountNum));
        b = formatEther(liq.getDebtValue(accountNum));
        console.log("Block " + block + ", Ether til liq, day " + day + " " + a + " " + b);
        // console.log("collateral: " + a + " debt: " + b);
      }
      block+=5;
      // day++;
      //TODO This doesn't seem to work.
      // environment.forkBlock(block);
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