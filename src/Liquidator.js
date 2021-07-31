const _ = require("lodash");
const { ethers, network } = require("hardhat");
const { BigNumber, Contract, ContractFactory, PopulatedTransaction, Wallet, providers, Signer, ContractTransaction } = require("ethers");
require("@nomiclabs/hardhat-waffle");
const { FlashbotsBundleProvider } = require("@flashbots/ethers-provider-bundle");
const { SignerWithAddress } = require("@nomiclabs/hardhat-ethers/signers");
const { ALPHA_HOMORA_CTOKENS, BANK_TOKENS, WETH_ADDRESS, TOKENS_TO_CTOKENS } = require("./addresses.js");
const { formatEther } = require("@ethersproject/units");
const { ChainId, Token, WETH, Fetcher, Trade, Route, TokenAmount, TradeType, Percent } = require('@uniswap/sdk')
const { on } = require("events");
const { hrtime } = require("process");
const loki = require('lokijs');

const ALPHA_HOMORA_BANK_ADDRESS  = "0xba5eBAf3fc1Fcca67147050Bf80462393814E54B";
const WMASTERCHEF_ADDRESS  = "0xA2caEa05fF7B98f10Ad5ddc837F15905f33FEb60";
const CRV_ADDRESS = "0xf1F32C8EEb06046d3cc3157B8F9f72B09D84ee5b";
const UNISWAP_WERC20_ADDRESS  = "0x06799a1e4792001AA9114F0012b9650cA28059a3";
const ALPHA_HOMORA_CORE_ORACLE  = "0x6be987c6d72e25F02f6f061F94417d83a6Aa13fC";
const FLASHLOAN_FEE_NOMINATOR  = 10009;
//INSUFFICENT_A or B means this number needs to decrease to accomodate the slippage
const LP_SLIPPAGE  = 991;
//INSUFFICENT_OUTPUT_AMOUNT means this number needs to decrease to accomodate the slippage
const SWAP_SLIPPAGE  = 990;
const AAVE_LENDING_POOL_ADDRESS_PROVIDER  = "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5";
// const HOMORA_ORACLE_ADDRESS  = "0x914C687FFdAB6E1B47a327E7E4C10e4a058e009d"; 

// export interface DebtInfo {
//     debtToken,
//     debtAmount,
//     otherTokenAddress,
//     debtInWETH: boolean
// }

// export interface Position {
//     pid ,
//     owner , // The owner of this position.
//     collToken , // The ERC1155 token used as collateral for this position.
//     collId, // The token id used as collateral, in the case of masterchef.
//     collateralSize, // The amount of collateral LP token for this position.
//     debtMap, // Bitmap of nonzero debt. i^th bit is set iff debt share of i^th bank is nonzero.
//     debtShareOf : object          //mapping(address => uint) debtShareOf; // The debt share for each token.
//   }

class Liquidator {
    // private flashLoaner: Flashloaner;
    // readonly PRIVATE_KEY;
    // readonly BUNDLE_EXECUTOR_ADDRESS;
    flashbotsProvider;
    bundleExecutorContract;
    executorWallet;
    homoraBankContract;
    defaultingAccounts;
    NAIVE_ACCOUNTS;

    wMasterChefContract;
    CRVContract
    uniWERC20Contract;

    homoraOracleContract;
    homoraBaseOracleContract;

    //Databases and collections
    database;
    positions;
    werc20Info;
    pricing;



    constructor(flashbotsProvider) {
        // this.executorWallet = executorWallet;        
        this.flashbotsProvider = flashbotsProvider;
        this.defaultingAccounts = [];
        this.NAIVE_ACCOUNTS = [899,897,456,948,992];//All of these are on sushiswap
        // this.bundleExecutorContract = bundleExecutorContract;
        // this.PRIVATE_KEY = process.env.PRIVATE_KEY || "";
        // this.BUNDLE_EXECUTOR_ADDRESS = process.env.BUNDLE_EXECUTOR_ADDRESS || "";

        
    }

    // implement the autoloadback referenced in loki constructor
    databaseInitialize() {
        this.positions = this.database.getCollection("positions");
        if (this.positions === null) {
          this.positions = this.database.addCollection("positions");
        }
        this.pricing = this.database.getCollection("pricing");
        if (this.pricing === null) {
            this.pricing = this.database.addCollection("pricing");
        }
        this.werc20Info = this.database.getCollection("werc20Info");
        if (this.werc20Info === null) {
            this.werc20Info = this.database.addCollection("werc20Info");
        }
    }

    async initialize(){
        const [owner] = await ethers.getSigners();
        this.executorWallet = owner;


        this.database = new loki('liquidator.db', {
            autoload: true,
            autoloadCallback : () => this.databaseInitialize(),
            autosave: true, 
            autosaveInterval: 4000 //Four seconds
        });


        if (process.env.BUNDLE_EXECUTOR_ADDRESS  === undefined) {
            let FlashBotsMultiCall = await ethers.getContractFactory("FlashBotsMultiCall");
            this.bundleExecutorContract = await FlashBotsMultiCall.deploy(AAVE_LENDING_POOL_ADDRESS_PROVIDER,this.executorWallet.address);
            // this.BUNDLE_EXECUTOR_ADDRESS = this.bundleExecutorContract.address;
            console.log("FlashBotsMultiCall deployed to:", this.bundleExecutorContract.address);
        } else {
            // this.BUNDLE_EXECUTOR_ADDRESS = process.env.BUNDLE_EXECUTOR_ADDRESS;
            this.bundleExecutorContract = await ethers.getContractAt("FlashBotsMultiCall",process.env.BUNDLE_EXECUTOR_ADDRESS);
        }

        this.homoraBankContract = await ethers.getContractAt("HomoraBank",ALPHA_HOMORA_BANK_ADDRESS);

        this.wMasterChefContract = await ethers.getContractAt("IWMasterChef2", WMASTERCHEF_ADDRESS);
        this.CRVContract = await ethers.getContractAt("IWMasterChef2", CRV_ADDRESS);
        this.uniWERC20Contract = await ethers.getContractAt("IWMasterChef2", UNISWAP_WERC20_ADDRESS);


        const HOMORA_ORACLE_ADDRESS = await this.homoraBankContract.oracle();
        this.homoraOracleContract = await ethers.getContractAt("ProxyOracle", HOMORA_ORACLE_ADDRESS);
        const BASE_ORACLE_ADDRESS = await this.homoraOracleContract.source();
        this.homoraBaseOracleContract = await ethers.getContractAt("IBaseOracle",BASE_ORACLE_ADDRESS);
        // this.homoraCoreOracleContract = await ethers.getContractAt("")
    }

    async accrue(){
        // let tokens : Array<string> = _.map(ALPHA_HOMORA_CTOKENS, (ctoken)=> {return ctoken.underlyingAddress})

        for (var token of BANK_TOKENS){
            await this.homoraBankContract.accrue(token).catch((err)=>{console.log(err);});
        }
    }

    async findDefaultingAccounts(){
        let lastPositionsIndex   = await this.homoraBankContract.nextPositionId() - 1;
        console.log("last position: " + lastPositionsIndex);
        for (let pID   = 1; pID <= lastPositionsIndex;  pID++){
            if (pID % 20 == 0 ){
                console.log(pID);
            }
            await this.isAccountDefaulting(pID);
        }
    }


    async database_testing(){
        let position = await this.homoraBankContract.positions(457);
        console.log(position);

        this.positions.insert({owner: position.owner});
        var results = this.positions.where(function(obj) {
            return (obj.owner == obj.owner);
        });
        console.log(results);

    }

    async findAccountValue(pID ) {
        let collateralETHValue= await this.homoraBankContract.getCollateralETHValue(pID).catch((err)=>{console.log(err);})
        let borrowETHValue= await this.homoraBankContract.getBorrowETHValue(pID).catch((err)=>{console.log(err);})

        if(collateralETHValue == undefined || borrowETHValue == undefined){
            return BigNumber.from(0);
        }
        return collateralETHValue.sub(borrowETHValue);
    }

    async findDebtRatio(pID ) {
        let collateralETHValue= await this.homoraBankContract.getCollateralETHValue(pID).catch((err)=>{console.log(err);})
        let borrowETHValue= await this.homoraBankContract.getBorrowETHValue(pID).catch((err)=>{console.log(err);})

        if(collateralETHValue == undefined || borrowETHValue == undefined){
            return BigNumber.from(0);
        }
        return borrowETHValue.div(collateralETHValue);
    }

    async createWERC20InfoEntry(collId, collToken){
        let LPTokenAddress;
        switch (collToken) {
            case WMASTERCHEF_ADDRESS:
                LPTokenAddress = await this.wMasterChefContract.getUnderlyingToken(collId);
                break;
            case CRV_ADDRESS:
                LPTokenAddress = await this.CRVContract.getUnderlyingToken(collId);
                break;
            case UNISWAP_WERC20_ADDRESS:
                LPTokenAddress = await this.uniWERC20Contract.getUnderlyingToken(collId);
                break;
            default:
                console.log("Unrecognized WERC20 contract.")
                return false;
                break;
        }
        this.werc20Info.insert({LPTokenAddress: LPTokenAddress, collId: collId._hex, WERC20ContractAddress: collToken});
        return LPTokenAddress;
    }

    async getAndStorePosition(pID){
        let debts = await this.homoraBankContract.getPositionDebts(pID);
        let positionEntry = this.positions.findOne({'pID': pID});
        let position;
        let LPTokenAddress;
        let werc20Entry;
        if (positionEntry == null){
            position = await this.homoraBankContract.positions(pID);
            werc20Entry = this.werc20Info.findOne({'collId': position.collId._hex});
            if (werc20Entry == null){
                LPTokenAddress =  await this.createWERC20InfoEntry(position.collId, position.collToken);
            } else {
                LPTokenAddress = werc20Entry.LPTokenAddress;
            }
            this.positions.insert({pID: pID, collateralSize: position.collateralSize, debts: debts, LPTokenAddress: LPTokenAddress});
        } else {
            position = positionEntry;
            werc20Entry = this.werc20Info.findOne({'LPTokenAddress': position.LPTokenAddress});
            if (werc20Entry == null){
                await this.createWERC20InfoEntry(position.collId, position.collToken);
            }
            position.debts = debts;
            this.positions.update(position);
        }

        //Information I need to store for each position: pid, collateralSize, LPTokenAddress, debts from getPositionDebts.

        //database of collId, LPTokenAddress (this acts as the index in order to know which WERC20ContractAddress is relevant to pricing and sending to the ExecutorContract to burn the LPToken), WERC20ContractAddress(aka collToken)
 
        //TODO collateral value calculation in ETH: is in my liquidate function.
        //TODO borrowed value calculation in ETH: Sum over all debtTokens
        // tokenFactor = tokenFactors[token];
        //              getETHPx(token).mul(amount).div(2**112).mul(tokenFactor.borrowFactor).div(10000);
        //TODO sanity check for require(tokenFactor.liqIncentive != 0, 'bad underlying borrow');


        //TODO Stuff I need to update every 1-5s: prices of debtTokens, prices of collateral Tokens.
        //TODO So we'll just be running getETHPx on each token in order to update the prices.
        //TODO add pricing database: [tokenAddress, lastPrice, tokenFactor]
        // let tokenFactor = await this.homoraOracleContract.tokenFactors(token);

    }

    

    async liquidatePosition(pID ){
        let position= await this.homoraBankContract.positions(pID);

        //TODO implement other than sushiswap
        if (position.collToken != WMASTERCHEF_ADDRESS){
            console.log("This is not a sushiswap address");
            return false;
        }

        //
        //This is for masterChefv2. The masterChefPid is the most significant 16 bits of the collId, stored in little endian.
        // let masterChefPid  = this.swap16(position.collId.toHexString().substr(0,6));

        //This is for masterChefv1, there is no pid in that case, only the id.
        let masterChefID= position.collId;
        let LPtokenAddress  = await this.wMasterChefContract.getUnderlyingToken(position.collId);

        let debtInfo = await this.getDebtTokensAndAmounts(LPtokenAddress,pID);

        //A BigNumber of 2**112 because getETHPx returns the price ratio to ETH multiplied by it.
        //TODO this should be a class variable
        const oneTwelve = BigNumber.from(2**52).mul(BigNumber.from(2**52).mul(BigNumber.from(2**8)));

        // getETHPx returns WETH/token
        let lpTokenPriceOT= await this.homoraBaseOracleContract.getETHPx(LPtokenAddress);

        // console.log("collToken: " + position.collToken);
        // console.log("collId: " + position.collId.toString());
        // console.log("werc20ID: " + werc20ID);


        const colBountyCalculated= await this.homoraOracleContract.convertForLiquidation(debtInfo.debtToken, position.collToken, position.collId, debtInfo.debtAmount);

        const bountyLP= colBountyCalculated.gt(position.collateralSize) ? position.collateralSize : colBountyCalculated;
        //The value of the bounty in ETH. NoOT means that it doesn't have the oneTwelve term.
        const bountyLPvalueNoOT= bountyLP.mul(lpTokenPriceOT).div(oneTwelve);


        //OT means that it's still multiplied by oneTwelve
        let priceRatioOT;
        if (debtInfo.debtInWETH){
            priceRatioOT = await this.homoraBaseOracleContract.getETHPx(debtInfo.otherTokenAddress);
        } else {
            priceRatioOT = await this.homoraBaseOracleContract.getETHPx(debtInfo.debtToken);
        }

        let debtTokenOutLP;
        let otherTokenOutLP;
        
        if (debtInfo.debtInWETH){
            debtTokenOutLP = bountyLPvalueNoOT.div(2).mul(LP_SLIPPAGE).div(1000);
            otherTokenOutLP = bountyLPvalueNoOT.mul(oneTwelve).div(2).div(priceRatioOT).mul(LP_SLIPPAGE).div(1000);//TODO Check the validity of all of the parameters that I send to the contract in the debugger, on two different accounts.
        } else {
            otherTokenOutLP = bountyLPvalueNoOT.div(2).mul(LP_SLIPPAGE).div(1000);
            debtTokenOutLP = bountyLPvalueNoOT.div(2).mul(oneTwelve).div(priceRatioOT).mul(LP_SLIPPAGE).div(1000);
        }

        let amountInSwap;
        let amountOutSwap;

        if (debtInfo.debtInWETH){
            amountInSwap = otherTokenOutLP; //This will leave some amount of residue, assuming that we don't hit that max slippage. This may not be a bad thing but we should consider being able to make this swap again later. 
            amountOutSwap = debtTokenOutLP.mul(SWAP_SLIPPAGE).div(1000);//5444444444
        } else {//If I borrow a token that isn't WETH, then only transfer enough to satisfy the flash-debt.
            amountOutSwap = debtInfo.debtAmount.mul(FLASHLOAN_FEE_NOMINATOR).div(10000).sub(debtTokenOutLP);
            amountInSwap = amountOutSwap.mul(priceRatioOT).div(oneTwelve).mul(1000).div(SWAP_SLIPPAGE);
        }

        // const slippageTolerance = new Percent('50', '10000') // 50 bips, or 0.50%

        //Okay now I need to calculate what amount in and amount out I need for the swap back to debt token. amountOut is going to be only the debt size if I borrowed something other than WETH. If I borrowed WETH, then I'm going to swap in all of the other token that I recieved. Then after I paid off the debt, this would mean that I only have WETH left over in the contract. At which point in a second transaction after the liquidation, will unwrap the WETH and withdraw the ETH. 

        //TODO I have to figure out what calculations I can do asynchronously, because at the moment it takes way too long to make all these requests.
        
        //Then in the contract we calculate how much ETH worth of LP we have, then divide that by 2, so half is amountOutEth, and half times token/eth price is amountOutToken
        //Then figure out how much of the otherToken that you have after taking out the LP by checking the balance, and swap it for debtToken. Calculate this price by using token/WETH
        //Hrm we want to make sur ethat we have ETH leftover though.

        //for cToken I might need to change the way the cToken array is structured, because I'm going from the debt token to the cToken. So I need a lookup table like that.

        //DEBUG
        // console.log("debtToken: " + debtInfo.debtToken);
        // console.log("LPtokenAddress: " + LPtokenAddress);
        
        const deadline  = Math.floor(Date.now() / 1000) + 60 * 5 // 5 minutes from the current Unix time
        //position.collID is the id of the underlying LP token for WERC20 contracts for sushi, but for uni it uses the address of the LP token as the id.
        const data = ethers.utils.defaultAbiCoder.encode(
        ["uint", "uint", "uint",  "address", "uint", "uint", "uint", "uint", "uint", "address"],
        [pID, masterChefID, bountyLP, LPtokenAddress, otherTokenOutLP, debtTokenOutLP, amountInSwap, amountOutSwap, deadline, debtInfo.otherTokenAddress]
        );

        try {
            await this.bundleExecutorContract.flashLiquidate(debtInfo.debtToken,debtInfo.debtAmount,data);
        } catch (error) {
            console.log(error);
        }

        return true;
    }

    swap16(val ) {
        return ((val & 0xFF) << 8)
               | ((val >> 8) & 0xFF);
    }

    // async getHealth(pID:number) : Promise<number>{

    // }

    async printCollateralValue(pID ){
        let collateralETHValue= await this.homoraBankContract.getCollateralETHValue(pID).catch((err)=>{console.log(err);})
        console.log("Account value: " + formatEther(collateralETHValue) + " Ether.");
    }

    async getFlashloan(){
        this.bundleExecutorContract.doFlashloan(ALPHA_HOMORA_CTOKENS[0],10000,'');
    }

    async getDebtTokensAndAmounts(LPtokenAddress , pID ) {
        let LPToken = await ethers.getContractAt("contracts\\UniswapFlashQuery.sol:IUniswapV2Pair", LPtokenAddress);

        let token0 = await LPToken.token0();
        let token1 = await LPToken.token1();

        let debt0= await this.homoraBankContract.getPositionDebtShareOf(pID, token0);
        let debt1= await this.homoraBankContract.getPositionDebtShareOf(pID, token1);

        let otherTokenAddress ;
        let debtToken ;
        let debtAmount;
        if (debt0.gt(debt1)){
            debtToken = token0;
            debtAmount = debt0;
            otherTokenAddress = token1;
        } else {
            debtToken = token1;
            debtAmount = debt1;
            otherTokenAddress = token0;
        }

        const debtInWETH = (debtToken == WETH_ADDRESS)  ? true : false;

        let debtInfo = {debtAmount: debtAmount,debtToken: debtToken,otherTokenAddress:otherTokenAddress, debtInWETH: debtInWETH}; 
        return debtInfo;
    }

    // async getBanks(){
    //     let banks : Array<string> = [];
    //     let i = 0;
    //     let fail = false;
    //     while (true){
    //         let bank = await this.homoraBankContract.allBanks(i).catch((err: Error)=>{break;});
    //         if (fail == true){ break;}
    //         console.log(bank);
    //         i++;
    //     }
    //     return banks;
    // }

    async isAccountDefaulting(pID) {
        let collateralETHValue= await this.homoraBankContract.getCollateralETHValue(pID).catch((err)=>{console.log(err);})
        let borrowETHValue= await this.homoraBankContract.getBorrowETHValue(pID).catch((err)=>{console.log(err);})
        // console.log(pID)
        if(collateralETHValue == undefined || borrowETHValue == undefined){
            console.log(pID);
            // console.log("col" + formatEther(collateralETHValue));
            console.log("Bad collateral, this is the amount borrowed: " + formatEther(borrowETHValue));
            return false;
        }
        if (borrowETHValue.gt(collateralETHValue)){
            console.log("Found a defaulting one:")
            console.log("pID: " + pID + " Account Value: " + (collateralETHValue.sub(borrowETHValue)));
            this.defaultingAccounts.push(pID);
            return true;
        }
        return false;
    }

    async testNaiveAccounts(){
        for (const pID of this.NAIVE_ACCOUNTS ){
            console.log(pID);
            if (await this.isAccountDefaulting(pID)){
              //TODO go do a liquidation here.
            }
        }
    }
}

module.exports.Liquidator = Liquidator;

// export class Flashloaner{
//     //So I think I want this thing to take in a token and an amount, then return a transaction to be bundled.
//     private bundleExecutorContract: Contract;

//     constructor(bundleExecutorContract: Contract){
//         this.bundleExecutorContract = bundleExecutorContract;
//     }

//     getFlashLoanTransaction(tokenAddress, amount){
//         return this.bundleExecutorContract.populateTransaction.doFlashloan(tokenAddress,amount, {
//             gasPrice.from(0),
//             gasLimit.from(1000000),
//           });
//     }
// }