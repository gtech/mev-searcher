const {ethers, network} = require("hardhat");
const {Signer, Contract, ContractFactory} = require("ethers");
require("@nomiclabs/hardhat-waffle");
const {expect, should} = require("chai");
const addresses = require("../../src/constants/addresses");
const {CToken} = require("../../src/constants/addresses");
const {Liquidator} = require("../../src/liquidators/alphaHomora");
const {Environment} = require("../../src/environment");
const {formatEther} = require("@ethersproject/units");
const {parseBoolean} = require("../../src/utilities/utils");

const ERC20ABI = [
    'function balanceOf(address) external view returns (uint)',
    'function transfer(address, uint) external returns (bool)',
]

// The address that has USDC on mainnet
// const walletAddr : string = '0x6D5a7597896A703Fe8c85775B23395a48f971305'

// const crUSDCAddr : string = '0x44fbeBd2F576670a6C33f6Fc0B00aA8c5753b322'
// const USDCAddr : string = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
describe("FlashBotsMultiCall Test", function () {
    let flashBotsMultiCall__factory;
    let flashBotsMultiCall;

    let deployer;

    beforeEach(async function () {
        // Make sure we are using a test net / fork
        expect(env.NETWORK === "MAINNET" && !parseBoolean(env.NETWORK_FORK)).to.be.equal(false);

        // Initialize the wallet
        [deployer] = await ethers.getSigners();

        // Initialize and deploy FlashBotsMultiCall contract
        flashBotsMultiCall__factory = await ethers.getContractFactory('FlashBotsMultiCall');
        flashBotsMultiCall = await flashBotsMultiCall__factory.deploy(deployer.address);
    });

    // Check FlashBotsMultiCall initialization
    it("correctly constructs FlashBotsMultiCall", async function () {
        // Check something...
    })

    // Test a basic transaction
    describe("basic transaction", function () {
        beforeEach(async function () {
            // Get the balance of the wallet
            const deployer_balance = await deployer.getBalance()
            console.log(deployer_balance)

            // Add tokens to wallet to make sure the account has funds for gas
        });

        // Loan 1 eth
        it.skip("1 eth loan", async function () {

        });
    })

    // Test a basic flash loan
    describe("flash loan", function () {
        beforeEach(async function () {
            // Add tokens to wallet to make sure the account has funds for gas
        });

        // Loan 1 eth
        it.skip("1 eth loan", async function () {

        });
    })

    it.skip("Should be able to get flashloans = require ( all the major tokens.", async function () {
        // addresses.ALPHA_HOMORA_CTOKENS.forEach(async (ctoken: CToken) => {
        //     await network.provider.request({
        //         method: "hardhat_impersonateAccount",
        //         params: [ctoken.posessingAddress]
        //     }).catch((err: Error) => {
        //         console.log(err)
        //     });
        //     let possessingWallet = ethers.provider.getSigner(ctoken.posessingAddress);
        //
        //
        //     // Send 100 of the token to flash loan example contract,
        //     // so that you have enough fund to pay the fee.
        //     let borrowedToken = new ethers.Contract(ctoken.underlyingAddress, ERC20ABI, possessingWallet);
        //     let tx = await borrowedToken.transfer(flashBotsMultiCall.address, ctoken.decimal.mul(100)).catch((err: Error) => {
        //         console.log("Could not transfer the token");
        //         console.log(err)
        //     }); //We want to push the limit of how much we borrow, so let's make a function that estimates how much we can borrow
        //     await tx.wait();
        //
        //     await network.provider.request({
        //         method: "hardhat_stopImpersonatingAccount",
        //         params: [ctoken.posessingAddress]
        //     });
        //
        //     await network.provider.request({
        //         method: "hardhat_impersonateAccount",
        //         params: deployer
        //     });
        //
        //     console.log('contract:', flashBotsMultiCall.address);
        //     // flashBotsMultiCall.address.should.be.a("string");
        //     expect(1).to.equal(0);
        //     // expect(flashBotsMultiCall.address).to.be.a("string");
        //     // expect(flashBotsMultiCall.address).to.include("0x");
        //
        //
        //     // call the doFlashloan
        //     tx = await flashBotsMultiCall.doFlashloan(ctoken.address, ctoken.decimal.mul(1000));
        //     const receipt = await tx.wait()
        //     expect(receipt.status).to.equal(1);
        //
        //     // see the result
        //     console.log(receipt.events);
        //     console.log("status " + receipt.status);
        //
        //     await network.provider.request({
        //         method: "hardhat_stopImpersonatingAccount",
        //         params: deployer
        //     });
        // })
    });
});
