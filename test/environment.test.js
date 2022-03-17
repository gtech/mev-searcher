const { ethers} = require("hardhat");
const {Environment} = require("../src/environment");
const {expect} = require("chai");
const {env} = require("../src/constants/env");

describe("Environment Tests", function(){
    let environment;

    beforeEach(async function () {
        // Make sure we are using a test net / fork
        expect(env.NETWORK === "MAINNET" && !(env.NETWORK_FORK)).to.be.equal(false);

        // Create and initialize the environment parent class
        environment = new Environment();
        await environment.initialize();

    });

    it("should fork a new block", async function(){

        const block = await ethers.provider.getBlock("latest");
        const currentBlock = block.number;
        expect(currentBlock).to.not.equal(2675001);//After SpuriousDragon which is block num 2,675,001

        await environment.forkBlock(2675001);

        const nextBlock = await ethers.provider.getBlock("latest");
        const nextBlockNumber = nextBlock.number;

        expect(currentBlock).to.not.equal(nextBlockNumber);
    })
});