const { ethers, network } = require("hardhat");
const { Signer, Contract, ContractFactory } = require ( "ethers");
require("@nomiclabs/hardhat-waffle");
const { expect,should } = require ( "chai");
const { Environment } = require ( "../../src/environment");

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

    liqBot = await environment.createLiquityLiquidator();
    await liqBot.liquidateTroves();


    // expect(profit.gt(0.2)).to.be.true();

    // await historicalWalk(environment,liq, 2387);
  })
});
