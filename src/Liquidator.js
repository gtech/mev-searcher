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
const UNISWAP_WERC20_ADDRESS_ALT = "0x011535FD795fD28c749363E080662D62fBB456a7";
const ALPHA_HOMORA_CORE_ORACLE  = "0x6be987c6d72e25F02f6f061F94417d83a6Aa13fC";
const FLASHLOAN_FEE_NOMINATOR  = 10009;
//INSUFFICENT_A or B means this number needs to decrease to accomodate the slippage
const LP_SLIPPAGE  = 991;
//INSUFFICENT_OUTPUT_AMOUNT means this number needs to decrease to accomodate the slippage
const SWAP_SLIPPAGE  = 990;
const AAVE_LENDING_POOL_ADDRESS_PROVIDER  = "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5";
const ONE_TWELVE = BigNumber.from(2**52).mul(BigNumber.from(2**52).mul(BigNumber.from(2**8)));

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
    uniWERC20ContractAlt;

    homoraOracleContract;
    homoraBaseOracleContract;
    alphaTierContract;

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
        // this.tokenFactors = this.database.getCollection("tokenFactors");
        // if (this.tokenFactors === null) {
        //     this.tokenFactors = this.database.addCollection("tokenFactors");
        // }
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
        this.uniWERC20ContractAlt = await ethers.getContractAt("IWMasterChef2", UNISWAP_WERC20_ADDRESS_ALT);

        const HOMORA_ORACLE_ADDRESS = await this.homoraBankContract.oracle();
        this.homoraOracleContract = await ethers.getContractAt("TierProxyOracle", HOMORA_ORACLE_ADDRESS);
        const ALPHA_TIER_ADDRESS = await this.homoraOracleContract.alphaTier();
        this.alphaTierContract = await ethers.getContractAt("IAlphaStakingTier",ALPHA_TIER_ADDRESS);
        const BASE_ORACLE_ADDRESS = await this.homoraOracleContract.source();
        this.homoraBaseOracleContract = await ethers.getContractAt("contracts\\TierProxyOracle.sol:IBaseOracle",BASE_ORACLE_ADDRESS);
    }

    async accrue(){
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

    async createWERC20InfoEntry(collIdHex, collToken){
        let LPTokenAddress;
        switch (collToken) {
            case WMASTERCHEF_ADDRESS:
                LPTokenAddress = await this.wMasterChefContract.getUnderlyingToken(collIdHex);
                break;
            case CRV_ADDRESS:
                LPTokenAddress = await this.CRVContract.getUnderlyingToken(collIdHex);
                break;
            case UNISWAP_WERC20_ADDRESS:
                LPTokenAddress = await this.uniWERC20Contract.getUnderlyingToken(collIdHex);
                break;
            case UNISWAP_WERC20_ADDRESS_ALT:
                LPTokenAddress = await this.uniWERC20ContractAlt.getUnderlyingToken(collIdHex);
                break;
            default:
                console.log("ERROR: Unrecognized WERC20 contract: " + collToken + " its collId: " + collIdHex);
                return false;
                break;
        }
        
        this.werc20Info.insert({LPTokenAddress: LPTokenAddress, collId: collIdHex, WERC20ContractAddress: collToken});
        console.log("Created werc20Info for LPToken: " + LPTokenAddress + " and collId " + collIdHex);
        return LPTokenAddress;
    }

    async getUnderlyingRate(LPTokenAddress){
        let infoEntry = this.werc20Info.findOne({'LPTokenAddress': LPTokenAddress});
        switch (infoEntry.WERC20ContractAddress) {
            case WMASTERCHEF_ADDRESS:
                return await this.wMasterChefContract.getUnderlyingRate(infoEntry.collId);
                break;
            case CRV_ADDRESS:
                return await this.CRVContract.getUnderlyingRate(infoEntry.collId);
                break;
            case UNISWAP_WERC20_ADDRESS:
                return await this.uniWERC20Contract.getUnderlyingRate(infoEntry.collId);
                break;
            case UNISWAP_WERC20_ADDRESS_ALT:
                return await this.uniWERC20ContractAlt.getUnderlyingRate(infoEntry.collId);
                break;
            default:
                console.log("ERROR: Unrecognized WERC20 contract when getting underlying rate for " + LPTokenAddress);
                return false;
                break;
        }
    }

    async initializeWERC20Entry(collIdHex,collToken){
        
        
    }

    /**
     * Stores a given position in the positions database, and initializes all its relevant debt and collateral tokens.
     * @param {number} pID The possession ID
     * @param {number} tierCount The number of alphaTiers.
     * @returns {boolean} Whether or not the position was stored successfully.
     */
    async getAndStorePosition(pID,tierCount){
        let debts = await this.homoraBankContract.getPositionDebts(pID);
        let positionEntry = this.positions.findOne({'pID': pID});
        let position;
        let LPTokenAddress;
        let werc20Entry;
        let werc20Entries;
        let collIdHex;
        let tier;
        
        //TODO Let's see if we can consolidate this code. I need to figure out what I want to update every time and what I only want to update when the posiiton is first being made. I also don't want to make duplicate entries so I should update when it exists in the DB and create when it doesn't. That could mean 
        position = await this.homoraBankContract.positions(pID);
            
        //TODO This code is strange. I think this works because the collId entries are formated differently for different positions.
        if(position.collId._hex != undefined){
            collIdHex = position.collId._hex;
        } else {
            collIdHex = position.collId;
        }
        //Get a relevant werc20 entry for the given collateral token. If it doesn't exist, create it and get back the LPTokenAddress.
        //TODO make sure this DB check works.
        werc20Entries = this.werc20Info.where(function(info) {
            return (info.collId == collIdHex && info.WERC20ContractAddress == position.collToken);
        });
        if (werc20Entries.length > 1){
            console.log("ERROR: DB inconsistancy, multiple werc20Info instances of collId: " + collIdHex + " collToken: " + position.collToken + " on pID: " + pID);
        } else if (werc20Entries.length == 0){
            LPTokenAddress =  await this.createWERC20InfoEntry(collIdHex, position.collToken);
        } else {
            LPTokenAddress = werc20Entries[0].LPTokenAddress;
        }

        //Get the owner's alphaTier.
        try {
            tier = await this.alphaTierContract.getAlphaTier(position.owner);      
        } catch (error) {
            console.log("ERROR: Couldn't get tier for position" + pID + " " + error);
            if (positionEntry != null){
                console.log("Removing position " + position.pID + ", " + error);
                this.positions.remove(positionEntry);
            }
            return false;
        }

        //Initialize debt tokens in the pricing DB. If the tokens already exist then they won't be initialized.
        for (let tokenAddy of debts[0]){
            if (typeof(tokenAddy) == 'string'){
                await this.initializeToken(tokenAddy,false,tierCount);
            }
        }
        // Initialize collateral token in the pricing DB.
        await this.initializeToken(LPTokenAddress,true,tierCount);

        if (positionEntry == null){
            this.positions.insert({pID: pID, collateralSize: position.collateralSize, debts: debts, LPTokenAddress: LPTokenAddress, collId: collIdHex, collToken: position.collToken, owner: position.owner, tier: tier});
            console.log("Created position " + pID);
        } else {
            positionEntry.collateralSize = position.collateralSize;
            positionEntry.debts = debts;
            positionEntry.LPTokenAddress = LPTokenAddress;
            positionEntry.collIdHex = collIdHex;
            positionEntry.collToken = position.collToken;
            positionEntry.tier = tier;
            positionEntry.owner = position.owner;
            this.positions.update(positionEntry);
            console.log("Updated position " + pID);
        }

        
  
        //database of collId, LPTokenAddress (this acts as the index in order to know which WERC20ContractAddress is relevant to pricing and sending to the ExecutorContract to burn the LPToken), WERC20ContractAddress(aka collToken)
 
        //TODO collateral value calculation in ETH: is in my liquidate function.
        //TODO borrowed value calculation in ETH: Sum over all debtTokens
        //TODO getETHPx(token).mul(amount).div(2**112).mul(tokenFactor.borrowFactor).div(10000);
        //TODO sanity check for require(tokenFactor.liqIncentive != 0, 'bad underlying borrow');

        //TODO Stuff I need to update every 1-5s: prices of debtTokens, prices of collateral Tokens.
    }

    /**
     * Updates the pricing database with the latest prices of each token.
     */
    async updatePrices(){
        let tokenEntries;
        try {
            tokenEntries = this.pricing.where(function(obj) {
                return (true);
            });
        } catch (error) {
            console.log("ERROR: Getting all of tokens in the pricing DB while updating prices " + error);
            return false;
        }
        for (let tokenEntry of tokenEntries){
            let priceRatioOT = await this.homoraBaseOracleContract.getETHPx(tokenEntry.tokenAddress);
            tokenEntry.priceRatioOT = priceRatioOT;
            this.pricing.update(tokenEntry);
        }
        return true;
        
        

        // function asETHCollateral(
        //     address token,
        //     uint id,
        //     uint amount,
        //     address owner
        //   ) external view returns (uint) {
        //     require(whitelistERC1155[token], 'bad token');
        //     address tokenUnderlying = IERC20Wrapper(token).getUnderlyingToken(id);
        //     uint rateUnderlying = IERC20Wrapper(token).getUnderlyingRate(id);
        //     uint amountUnderlying = amount.mul(rateUnderlying).div(2**112);
        //     uint tier = alphaTier.getAlphaTier(owner);
        //     uint collFactor = tierTokenFactors[tokenUnderlying][tier].collateralFactor;
        //     require(liqIncentives[tokenUnderlying] != 0, 'bad underlying collateral');
        //     require(collFactor != 0, 'bad coll factor');
        //     uint ethValue = source.getETHPx(tokenUnderlying).mul(amountUnderlying).div(2**112);
        //     return ethValue.mul(collFactor).div(10000);
        //   }
    }

    /**
     * TODO, Returns the value of all debts in ETH for a given position.
     * @param {number} pID Position ID
     * @returns {BigNumber} The value in ETH of the position, probably * 2**112. or 0 if it's unsuccessful.
     */
    getDebtValue(pID){
        // function asETHBorrow(
        //     address token,
        //     uint amount,
        //     address owner
        //   ) external view returns (uint) {
        //     uint tier = alphaTier.getAlphaTier(owner);
        //     uint borrFactor = tierTokenFactors[token][tier].borrowFactor;
        //     require(liqIncentives[token] != 0, 'bad underlying borrow');
        //     require(borrFactor < 50000, 'bad borr factor');
        //     uint ethValue = source.getETHPx(token).mul(amount).div(2**112);
        //     return ethValue.mul(borrFactor).div(10000);
        //   }
        let positionEntry;
        try {
            positionEntry = this.positions.findOne({'pID': pID});
            if (positionEntry == null){
                console.log("Problem getting position " + pID + "returning value of 0 for borrowed ETH " + errror);
                return BigNumber.from(0);
            }
        } catch (error) {
            console.log("Problem getting position " + pID + "returning value of 0 for borrowed ETH " + errror);
            return BigNumber.from(0);
        }
        let tier = positionEntry.tier;
        let debtValueTotal = BigNumber.from(0);
        let debtTokens = positionEntry.debts[0];
        let amounts = positionEntry.debts[1];
        for (let tokenIndex = 0; tokenIndex < debtTokens.length; tokenIndex++) {
            let tokenAddress = debtTokens[tokenIndex];
            let debtAmount = BigNumber.from(amounts[tokenIndex].hex);
            let tokenEntry = this.pricing.findOne({'tokenAddress': tokenAddress});

            //The borrowFactor is the first index of the tokenFactors.
            let borrowFactor = tokenEntry.tokenFactors[BigNumber.from(tier).toNumber()][0];
            if (borrowFactor >= 50000){
                console.log("ERROR: Invalid borrowfactor: " + borrowFactor + "for position: " + pID);
                return BigNumber.from(0);
            }
            
            //     uint ethValue = source.getETHPx(token).mul(amount).div(2**112);
            //     return ethValue.mul(borrFactor).div(10000);
            let price = BigNumber.from(tokenEntry.priceRatioOT.hex);
            let value = price.mul(debtAmount).div(ONE_TWELVE).mul(borrowFactor).div(10000);
            console.log(formatEther(value));
            debtValueTotal = debtValueTotal.add(value);
        }
        //TODO Test to see if we're getting the value correct by actually calling the contract.
        // this.homoraBaseOracleContract

        return debtValueTotal;
    }

    /**
     * Grabs all the tokenFactors for a given token.
     * @param {string} token Token to get the tokenFactors for.
     * @param {*} tierCount How many tiers are in the alphaTier contract.
     * @returns {Object} An array of each tier to the borrowFactor and collateralFactor in a dictionary.
     */
    async getTokenfactors(token,tierCount){
        let tokenFactors = Array(tierCount);
        for (let tier = 0; tier < tierCount; tier++){
            let tokenFactorTuple = await this.homoraOracleContract.tierTokenFactors(token,tier);
            tokenFactors[tier] = tokenFactorTuple;
        }
        return tokenFactors;
    }

    /**
     * Updates the tokenFactors in the pricing database.
     */
    async updateTokenFactors(){
        let tierCount = await this.alphaTierContract.tierCount();
        let tokenFactors = this.getTokenfactors();

        // let tokenFactor = tokenFactors.collateralFactor;
    }

    /**
     * This updates the pricing and position databases. This is meant to be run about once a day or less often because it is so time and resource intensive. It should take around 30 minutes to an hour based on current tests.
     * @returns {boolean} Whether all positions were successfully updated.
     */
    async fullDatabasesUpdate(){
        let flawlessUpdate = true;
        let nextPositionId;
        let tierCount;
        try {
            tierCount = await this.alphaTierContract.tierCount();
        } catch (error) {
            console.log("ERROR: Problem getting tierCount " + error);
            return false;
        }
        try {
            nextPositionId = await this.homoraBankContract.nextPositionId();
        } catch (error) {
            console.log("ERROR: Problem requesting nextPositionId from chain " + error);
            return false;
        }
        //Update the positions database.
        for (let pID = 1; pID < nextPositionId; pID++){
            if (await this.getAndStorePosition(pID,tierCount) == false){
                flawlessUpdate = false;
            };
        }
        return flawlessUpdate;
    }

    /**
     * Checks if a token is in the pricing DB, and if not, initializes it with the latest data.
     * @param {string} tokenAddress The token address to be initialized.
     * @param {boolean} isCollateral Whether it's a collateral token or debt token.
     * @param {number} tierCount The number of current alphaTiers (5 at the time of writing);
     * @returns Whether the token is in the DB.
     */
    async initializeToken(tokenAddress, isCollateral, tierCount){
        let tokenEntries;
        let tokenEntry;
        try {
            tokenEntries = this.pricing.where(function(info) {
                return (info.tokenAddress == tokenAddress);
            });
            if (tokenEntries.length > 1){
                console.log("ERROR: Multiple instances of token in DB: " + tokenEntries[0].tokenAddress + " aborting initialize token.");
                return false;
            }
        } catch (error) {
            console.log("ERROR: Problem finding tokenEntry " + tokenAddress + " in pricing DB " + error);
            return false;
        }
        if (tokenEntries.length == 0){
            tokenEntry = tokenEntries[0];
            let tokenFactors;
            let priceRatioOT;
            let underlyingRate;
            try {
                tokenFactors = await this.getTokenfactors(tokenAddress,tierCount);
                priceRatioOT = await this.homoraBaseOracleContract.getETHPx(tokenAddress);
                if (isCollateral == true){
                    underlyingRate = await this.getUnderlyingRate(tokenAddress);
                } else {
                    underlyingRate = BigNumber.from(0);
                }
                this.pricing.insert({tokenAddress: tokenAddress, priceRatioOT: priceRatioOT, tokenFactors: tokenFactors, collateral: isCollateral, underlyingRate: underlyingRate});
                console.log("Initialized token " + tokenAddress);
            } catch (error) {
                console.log("ERROR: Problem requesting token chain data while initializing " + error);
                return false;
            }
        }
        return true;
    }

    async liquidatePosition(pID ){
        let position= await this.homoraBankContract.positions(pID);

        //TODO implement other than sushiswap
        if (position.collToken != WMASTERCHEF_ADDRESS){
            console.log("ERROR: This is not a sushiswap address");
            return false;
        }

        //This is for masterChefv2. The masterChefPid is the most significant 16 bits of the collId, stored in little endian.
        // let masterChefPid  = this.swap16(position.collId.toHexString().substr(0,6));

        //This is for masterChefv1, there is no pid in that case, only the id.
        let masterChefID= position.collId;
        let LPTokenAddress  = await this.wMasterChefContract.getUnderlyingToken(position.collId);

        let debtInfo = await this.getDebtTokensAndAmounts(LPTokenAddress,pID);

        //A BigNumber of 2**112 because getETHPx returns the price ratio to ETH multiplied by it.
        //TODO this should be a class variable

        // getETHPx returns WETH/token
        let lpTokenPriceOT= await this.homoraBaseOracleContract.getETHPx(LPTokenAddress);

        // console.log("collToken: " + position.collToken);
        // console.log("collId: " + position.collId.toString());
        // console.log("werc20ID: " + werc20ID);

        const colBountyCalculated= await this.homoraOracleContract.convertForLiquidation(debtInfo.debtToken, position.collToken, position.collId, debtInfo.debtAmount);

        const bountyLP= colBountyCalculated.gt(position.collateralSize) ? position.collateralSize : colBountyCalculated;
        //The value of the bounty in ETH. NoOT means that it doesn't have the ONE_TWELVE term.
        const bountyLPvalueNoOT= bountyLP.mul(lpTokenPriceOT).div(ONE_TWELVE);

        //OT means that it's still multiplied by ONE_TWELVE
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
            otherTokenOutLP = bountyLPvalueNoOT.mul(ONE_TWELVE).div(2).div(priceRatioOT).mul(LP_SLIPPAGE).div(1000);//TODO Check the validity of all of the parameters that I send to the contract in the debugger, on two different accounts.
        } else {
            otherTokenOutLP = bountyLPvalueNoOT.div(2).mul(LP_SLIPPAGE).div(1000);
            debtTokenOutLP = bountyLPvalueNoOT.div(2).mul(ONE_TWELVE).div(priceRatioOT).mul(LP_SLIPPAGE).div(1000);
        }

        let amountInSwap;
        let amountOutSwap;

        if (debtInfo.debtInWETH){
            amountInSwap = otherTokenOutLP; //This will leave some amount of residue, assuming that we don't hit that max slippage. This may not be a bad thing but we should consider being able to make this swap again later. 
            amountOutSwap = debtTokenOutLP.mul(SWAP_SLIPPAGE).div(1000);//5444444444
        } else {//If I borrow a token that isn't WETH, then only transfer enough to satisfy the flash-debt.
            amountOutSwap = debtInfo.debtAmount.mul(FLASHLOAN_FEE_NOMINATOR).div(10000).sub(debtTokenOutLP);
            amountInSwap = amountOutSwap.mul(priceRatioOT).div(ONE_TWELVE).mul(1000).div(SWAP_SLIPPAGE);
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
        // console.log("LPTokenAddress: " + LPTokenAddress);
        
        const deadline  = Math.floor(Date.now() / 1000) + 60 * 5 // 5 minutes from the current Unix time
        //position.collID is the id of the underlying LP token for WERC20 contracts for sushi, but for uni it uses the address of the LP token as the id.
        const data = ethers.utils.defaultAbiCoder.encode(
        ["uint", "uint", "uint",  "address", "uint", "uint", "uint", "uint", "uint", "address"],
        [pID, masterChefID, bountyLP, LPTokenAddress, otherTokenOutLP, debtTokenOutLP, amountInSwap, amountOutSwap, deadline, debtInfo.otherTokenAddress]
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

    async getDebtTokensAndAmounts(LPTokenAddress , pID ) {
        let LPToken = await ethers.getContractAt("contracts\\UniswapFlashQuery.sol:IUniswapV2Pair", LPTokenAddress);

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