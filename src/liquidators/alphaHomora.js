const _ = require("lodash");
const { ethers, network } = require("hardhat");
const { BigNumber, Contract, ContractFactory, PopulatedTransaction, Wallet, providers, Signer, ContractTransaction } = require("ethers");
require("@nomiclabs/hardhat-waffle");
const { FlashbotsBundleProvider } = require("@flashbots/ethers-provider-bundle");
const { SignerWithAddress } = require("@nomiclabs/hardhat-ethers/signers");
const { ALPHA_HOMORA_CTOKENS, BANK_TOKENS, WETH_ADDRESS, TOKENS_TO_CTOKENS } = require("../constants/addresses.js");
const { formatEther, formatUnits } = require("@ethersproject/units");
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
//INSUFFICIENT_A or B means this number needs to decrease to accommodate the slippage
const LP_SLIPPAGE  = 991;
//INSUFFICIENT_OUTPUT_AMOUNT means this number needs to decrease to accommodate the slippage
const SWAP_SLIPPAGE  = 990;
const AAVE_LENDING_POOL_ADDRESS_PROVIDER  = "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5";
const ONE_TWELVE = BigNumber.from(2**52).mul(BigNumber.from(2**52).mul(BigNumber.from(2**8)));
const THRESHHOLD_FOR_LIQUIDATION = 10000; //Using USD
const THRESHHOLD_FOR_FREE_FOR_ALL = 500000; //Using USD
let ethPrice = 3038; //TODO These probably should be class vars instead of globals.
let freeForAll = false; //This flips when we think that we have hit the black swan.
const BLACKLIST = ['0xf80758aB42C3B07dA84053Fd88804bCB6BAA4b5c', //sUSD/ETH
                    '0xF54025aF2dc86809Be1153c1F20D77ADB7e8ecF4',//Balancer pool token
                    ]
const THREE_CRV_ADDRESS = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490";
const LIQUITY_ADDRESS = "0xA39739EF8b0231DbFA0DcdA07d7e29faAbCf4bb2";
// const HOMORA_ORACLE_ADDRESS  = "0x914C687FFdAB6E1B47a327E7E4C10e4a058e009d"; 

// export interface DebtInfo {
//     debtToken,
//     debtAmount,
//     secondTokenAddress,
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

    class AlphaHomora {
    // private flashLoaner: Flashloaner;
    // readonly PRIVATE_KEY;
    // readonly BUNDLE_EXECUTOR_ADDRESS;
    flashBotsSender;
    bundleExecutorContract;
    liquityLiquidatorContract;
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

    constructor(flashBotsSender) {
        // this.executorWallet = executorWallet;        
        this.flashBotsSender = flashBotsSender;
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

        await owner.provider._networkPromise;
        if (owner.provider._network.chainId === 31337) {
            let FlashBotsMultiCall = await ethers.getContractFactory("FlashBotsMultiCall");
            this.bundleExecutorContract = await FlashBotsMultiCall.deploy(AAVE_LENDING_POOL_ADDRESS_PROVIDER,this.executorWallet.address);
            // this.BUNDLE_EXECUTOR_ADDRESS = this.bundleExecutorContract.address;
            console.log("FlashBotsMultiCall deployed to: ", this.bundleExecutorContract.address);

            const deploymentData = FlashBotsMultiCall.interface.encodeDeploy([AAVE_LENDING_POOL_ADDRESS_PROVIDER,this.executorWallet.address]);
            const estimatedGas = await ethers.provider.estimateGas({ data: deploymentData });
            console.log("took approx this much gas: " + estimatedGas);

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
        //TODO Sometimes there aren't tiers...
        this.homoraOracleContract = await ethers.getContractAt("TierProxyOracle", HOMORA_ORACLE_ADDRESS);
        try {
            let ALPHA_TIER_ADDRESS = await this.homoraOracleContract.alphaTier();
            this.alphaTierContract = await ethers.getContractAt("IAlphaStakingTier",ALPHA_TIER_ADDRESS);
        } catch (error) {
            console.log("There is no alpha tier yet." + error);
        }
        
        const BASE_ORACLE_ADDRESS = await this.homoraOracleContract.source();
        this.homoraBaseOracleContract = await ethers.getContractAt("contracts\\TierProxyOracle.sol:IBaseOracle",BASE_ORACLE_ADDRESS);

    }

        /**
         * Pokes the Homora bank contract to update the interest fees due for all accounts.
         *
         */
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

        if(collateralETHValue === undefined || borrowETHValue === undefined){
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
        let position;
        let LPTokenAddress;
        let werc20Entry;
        let werc20Entries;
        let collIdHex;
        let tier;
        let debts = await this.homoraBankContract.getPositionDebts(pID);
        let positionEntry = this.positions.findOne({'pID': pID});

        position = await this.homoraBankContract.positions(pID);
            
        if( this.getHex(position.collId) != undefined){
            collIdHex = this.getHex(position.collId);
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
            if (LPTokenAddress == "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490"){
                //Fuck 3CRV
                return false;
            }
        } else {
            LPTokenAddress = werc20Entries[0].LPTokenAddress;
        }

        //Get the owner's alphaTier.
        if (this.alphaTierContract == undefined){
            tier = 1;
        } else {
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
        }
        

        //Initialize debt tokens in the pricing DB. If the tokens already exist then they won't be initialized.
        for (let tokenAddy of debts[0]){
            if (typeof(tokenAddy) == 'string'){
                await this.initializeToken(tokenAddy,false,tierCount);
            }
        }
        // Initialize collateral token in the pricing DB.
        await this.initializeToken(LPTokenAddress,true,tierCount);

        let amountsUnhexed = _.map(debts[1],this.getHex);
        let debtsUnhexed = [debts[0],amountsUnhexed];
        debtsUnhexed.tokens = debts[0];
        debtsUnhexed.debts = amountsUnhexed;

        if (positionEntry == null){
            this.positions.insert({pID: pID, collateralSize: this.getHex(position.collateralSize), debts: debtsUnhexed, LPTokenAddress: LPTokenAddress, collId: collIdHex, collToken: position.collToken, owner: position.owner, tier: this.getHex(tier)});
            console.log("Created position " + pID);
        } else {
            positionEntry.collateralSize = this.getHex(position.collateralSize);
            positionEntry.debts = debtsUnhexed;
            positionEntry.LPTokenAddress = LPTokenAddress;
            positionEntry.collIdHex = collIdHex;
            positionEntry.collToken = position.collToken;
            positionEntry.tier = this.getHex(tier);
            positionEntry.owner = position.owner;
            this.positions.update(positionEntry);
            console.log("Updated position " + pID);
        }

        //TODO sanity check for require(tokenFactor.liqIncentive != 0, 'bad underlying borrow');
    }

    getHex(bigNum){
        if (bigNum._hex == undefined){
            return bigNum.hex;
        } else {
            return bigNum._hex;
        }
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
            for (let tokenEntry of tokenEntries){
                // let priceRatioOT = await this.homoraBaseOracleContract.getETHPx(0);
                let priceRatioOT = await this.homoraBaseOracleContract.getETHPx(tokenEntry.tokenAddress);
                tokenEntry.priceRatioOT = this.getHex(priceRatioOT);
                this.pricing.update(tokenEntry);
            }
        } catch (error) {
            console.log("ERROR: Getting all of tokens in the pricing DB while updating prices or updating prices" + error);
            return false;
        }
        
        return true;
    }

    /**
     * Returns the value of all debts in ETH for a given position.
     * @param {number} positionEntry Position 
     * @returns {BigNumber} The value in ETH of the position, probably * 2**112. or 0 if it's unsuccessful.
     */
    getDebtValue(positionEntry){
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
        let tier = positionEntry.tier;
        let debtValueTotal = BigNumber.from(0);
        let debtTokens = positionEntry.debts[0];
        let amounts = positionEntry.debts[1];
        for (let tokenIndex = 0; tokenIndex < debtTokens.length; tokenIndex++) {
            let tokenAddress = debtTokens[tokenIndex];
            let debtAmount = BigNumber.from(amounts[tokenIndex]);
            let tokenEntry = this.pricing.findOne({'tokenAddress': tokenAddress});

            //The borrowFactor is the first index of the tokenFactors.
            let borrowFactor = tokenEntry.tokenFactors[BigNumber.from(tier).toNumber()][0];
            if (borrowFactor >= 50000){
                console.log("ERROR: Invalid borrowfactor: " + borrowFactor + "for position: " + pID);
                return BigNumber.from(0);
            }
            
            //     uint ethValue = source.getETHPx(token).mul(amount).div(2**112);
            //     return ethValue.mul(borrFactor).div(10000);
            let price = BigNumber.from(tokenEntry.priceRatioOT);
            let value = price.mul(debtAmount).div(ONE_TWELVE).mul(borrowFactor).div(10000);
            
            //DEBUG
            // console.log(formatEther(value));
            // console.log(formatEther(homoraValue));

            debtValueTotal = debtValueTotal.add(value);
        }
        return debtValueTotal;
    }

    /**
     * 
     * @param {Position} positionEntry 
     * @returns {BigNumber} The value in eth of the collateral.
     */
    getCollateralValue(positionEntry){
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
        //TODO create this check.
        //require(whitelistERC1155[token], 'bad token');
        let tokenEntry;
        let underlyingRate;
        try {
            tokenEntry = this.pricing.findOne({'tokenAddress': positionEntry.LPTokenAddress});
            underlyingRate = tokenEntry.underlyingRate;
        } catch (error) {
            console.log("ERROR: LPToken "+ positionEntry.LPTokenAddress + " does not exist. Could not price "+ positionEntry.pID + " ."+ error);
            return BigNumber.from(Number.MAX_SAFE_INTEGER - 1);
        }
        let amountUnderlying = BigNumber.from(positionEntry.collateralSize).mul(underlyingRate).div(ONE_TWELVE);
        let tier = positionEntry.tier;
        let collateralFactor = tokenEntry.tokenFactors[BigNumber.from(tier).toNumber()][1];

        //TODO Create this check.
        //     require(liqIncentives[tokenUnderlying] != 0, 'bad underlying collateral');

        //TODO
        //     require(collFactor != 0, 'bad coll factor');

        let collateralValueTotal =  BigNumber.from(tokenEntry.priceRatioOT).mul(amountUnderlying).mul(collateralFactor).div(ONE_TWELVE).div(10000);
         //DEBUG
        // console.log(formatEther(collateralValueTotal));
        // console.log(formatEther(homoraValue));

        //TODO This seems to be working but we're not using underlyingrate.
        return collateralValueTotal;
    }

    /**
     * Grabs all the tokenFactors for a given token.
     * @param {string} token Token to get the tokenFactors for.
     * @param {*} tierCount How many tiers are in the alphaTier contract.
     * @returns {Object} An array of each tier to the borrowFactor and collateralFactor in a dictionary.
     */
    async getTokenfactors(token,tierCount){
        let tokenFactors = Array(tierCount);//TODO We're trying to figure out why 3crv doesn't seem to be able to get tierTokenFactors
        for (let tier = 0; tier < tierCount; tier++){
            let tokenFactorTuple = await this.homoraOracleContract.tierTokenFactors(token,tier);
            tokenFactors[tier] = tokenFactorTuple;
        }
        return tokenFactors;
    }

    /**
     * This updates the pricing and position databases. This is meant to be run about once a day or less often because it is so time and resource intensive. It should take around 30 minutes to an hour based on current tests.
     * @returns {boolean} Whether all positions were successfully updated.
     */
    async fullDatabasesUpdate(){
        let flawlessUpdate = true;
        let nextPositionId;
        let tierCount;
        if (this.alphaTierContract != undefined){
            try {
                tierCount = await this.alphaTierContract.tierCount();
            } catch (error) {
                console.log("ERROR: Problem getting tierCount " + error);
                return false;
            }
        } else {
            tierCount = 1;
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
        if (BLACKLIST.includes(tokenAddress)){
            return false; //The LP token is blacklisted, usually because it's not active anymore.
        }
        let tokenEntries;
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
            let tokenFactors;
            let priceRatioOT;
            let underlyingRate;
            let liqIncentive;
            try {
                tokenFactors = await this.getTokenfactors(tokenAddress,tierCount);
                priceRatioOT = await this.homoraBaseOracleContract.getETHPx(tokenAddress);
                //TODO We may want to update liqIncentives on the daily update.
                liqIncentive = await this.homoraOracleContract.liqIncentives(tokenAddress);
                let lpTokenMembers;
                if (isCollateral == true){
                    if (tokenAddress == THREE_CRV_ADDRESS){
                        lpTokenMembers = ["0x6b175474e89094c44da98b954eedeac495271d0f",//DAI
                                            "0xdAC17F958D2ee523a2206206994597C13D831ec7",//Tether
                                            "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"//USDC
                    ];
                    } else {
                        let LPToken = await ethers.getContractAt("contracts\\UniswapFlashQuery.sol:IUniswapV2Pair", tokenAddress);
                        let token0 = await LPToken.token0();
                        let token1 = await LPToken.token1();
                        lpTokenMembers = [token0,token1];
                    }
                    underlyingRate = await this.getUnderlyingRate(tokenAddress);

                    
                } else {
                    lpTokenMembers = [];
                    underlyingRate = '0x00';
                }
                
                this.pricing.insert({tokenAddress: tokenAddress, priceRatioOT: this.getHex(priceRatioOT), tokenFactors: tokenFactors, collateral: isCollateral, underlyingRate: this.getHex(underlyingRate), liqIncentive: this.getHex(liqIncentive), lpTokenMembers: lpTokenMembers});
                console.log("Initialized token " + tokenAddress);
            } catch (error) {
                console.log("ERROR: Problem requesting token chain data while initializing " + error);
                return false;
            }
        }
        return true;
    }

    /**
     * Sends off a transaction that liquidates the position for the pID.
     * TODO increase the efficiency of this. A lot of these calls can be eliminated and use the DB.
     * @param {PositionEntry} positionEntry
     * @returns {boolean} Whether the liquidation was successful.
     */
    async liquidatePosition(positionEntry){
        
        // let position= await this.homoraBankContract.positions(pID);

        //This is for masterChefv2. The masterChefPid is the most significant 16 bits of the collId, stored in little endian.
        // let masterChefPid  = this.swap16(position.collId.toHexString().substr(0,6));

        //This is for masterChefv1, there is no pid in that case, only the id.
        // let masterChefID = positionEntry.collId;
        // let LPTokenAddress  = await this.wMasterChefContract.getUnderlyingToken(position.collId);
        let LPTokenAddress = positionEntry.LPTokenAddress;
        // let debtInfo = await this.getDebtTokensAndAmounts(LPTokenAddress,pID);

        let lpTokenEntry =  this.pricing.findOne({'tokenAddress': LPTokenAddress});
        

        let debtTokenIndex = this.getBiggestDebtTokenIndex(positionEntry);
        let debtToken = positionEntry.debts[0][debtTokenIndex];
        const debtInWETH = (debtToken == WETH_ADDRESS)  ? true : false;
        let secondTokenAddress;
        let members = [...lpTokenEntry.lpTokenMembers];
        let otherTokenAddresses = removeA(members,debtToken);
        //TODO find the secondTokenAddress

        let debtInfo = {debtAmount: positionEntry.debts[1][debtTokenIndex],debtToken: debtToken,secondTokenAddress:secondTokenAddress, debtInWETH: debtInWETH}; 

        let debtTokenEntry =  this.pricing.findOne({'tokenAddress': debtToken});
        let otherTokenEntries = this.positions.where(function(obj) {
            return (otherTokenAddresses.includes(obj.tokenAddress));
        });
        let secondTokenEntry =  this.pricing.findOne({'tokenAddress': secondTokenAddress});

        // getETHPx returns WETH/token
        // //The value of the bounty in ETH. NoOT means that it doesn't have the ONE_TWELVE term. OT means that it's still multiplied by ONE_TWELVE

        //TODO There's a completely different control flow for non-weth pairs like USDC/USDT
        //TODO The control flow changes at whether we're doing uni, crv, or sushi. So we'll create three different functions in the contract, and we'll give the contract which of the three lptoken types it is.

        // const colBountyCalculated= await this.homoraOracleContract.convertForLiquidation(debtInfo.debtToken, position.collToken, position.collId, debtInfo.debtAmount);

        const bountyLPvalueNoOT = this.bountyValueInETH(positionEntry);

        // const bountyLP= colBountyCalculated.gt(position.collateralSize) ? position.collateralSize : colBountyCalculated;
        // const bountyLPvalueNoOT= bountyLP.mul(lpTokenEntry.priceRatioOT).div(ONE_TWELVE);

        let priceRatioOT;
        let debtTokenOutLP;
        let secondTokenOutLP;
        let amountInSwap;
        let amountOutSwap;
        let outLPAmount = [];
        let amountsInSwap = [];
        
        if (debtInWETH){
            //So this part is always going to be true because there are only ever two coins when WETH is one of the two. We just need to convert it to use arrays instead of numbers. TODO We are currently 
            priceRatioOT = secondTokenEntry.priceRatioOT;
            //ETH value of the debt token that will come out of the LP burn. aka debtTokenOutLP
            outLPAmount[0] = bountyLPvalueNoOT.div(2).mul(LP_SLIPPAGE).div(1000);
            //secondTokenOutLP
            outLPAmount[1] = bountyLPvalueNoOT.mul(ONE_TWELVE).div(2).div(priceRatioOT).mul(LP_SLIPPAGE).div(1000);
            // debtTokenOutLP = ;
            // secondTokenOutLP = 
            amountInSwap = secondTokenOutLP; //This will leave some amount of residue, assuming that we don't hit that max slippage. This may not be a bad thing but we should consider being able to make this swap again later. 
            amountOutSwap = debtTokenOutLP.mul(SWAP_SLIPPAGE).div(1000);//5444444444
        } else {
            priceRatioOT = debtTokenEntry.priceRatioOT;
            secondTokenOutLP = bountyLPvalueNoOT.div(2).mul(LP_SLIPPAGE).div(1000);
            debtTokenOutLP = bountyLPvalueNoOT.div(2).mul(ONE_TWELVE).div(priceRatioOT).mul(LP_SLIPPAGE).div(1000);
            //If I borrow a token that isn't WETH, then only transfer enough to satisfy the flash-debt.
            amountOutSwap = debtInfo.debtAmount.mul(FLASHLOAN_FEE_NOMINATOR).div(10000).sub(debtTokenOutLP);
            amountInSwap = amountOutSwap.mul(priceRatioOT).div(ONE_TWELVE).mul(1000).div(SWAP_SLIPPAGE);
        }
        //Okay now I need to calculate what amount in and amount out I need for the swap back to debt token. amountOut is going to be only the debt size if I borrowed something other than WETH. If I borrowed WETH, then I'm going to swap in all of the other token that I recieved. Then after I paid off the debt, this would mean that I only have WETH left over in the contract. At which point in a second transaction after the liquidation, will unwrap the WETH and withdraw the ETH. 
        
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
        ["uint", "uint", "uint",  "address", "uint", "uint", "uint", "uint", "uint", "address","address"],
        [pID, positionEntry.collId, bountyLP, LPTokenAddress, secondTokenOutLP, debtTokenOutLP, amountInSwap, amountOutSwap, deadline, secondTokenAddress, thirdTokenAddress]
        );

        try {
            await this.bundleExecutorContract.flashLiquidate(debtInfo.debtToken,debtInfo.debtAmount,data);
        } catch (error) {
            console.log("ERROR: The liquidation transaction failed " + error);
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
        formatUnits(0,0);
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

        let secondTokenAddress ;
        let debtToken ;
        let debtAmount;
        if (debt0.gt(debt1)){
            debtToken = token0;
            debtAmount = debt0;
            secondTokenAddress = token1;
        } else {
            debtToken = token1;
            debtAmount = debt1;
            secondTokenAddress = token0;
        }

        const debtInWETH = (debtToken == WETH_ADDRESS)  ? true : false;

        let debtInfo = {debtAmount: debtAmount,debtToken: debtToken,secondTokenAddress:secondTokenAddress, debtInWETH: debtInWETH}; 
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

    async isAccountDefaultingHomora(pID) {
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

    findAllDefaultingPositions(){
        let positionEntries = this.positions.where(function(obj) {
            return (obj.owner == obj.owner);
        });

        let defaultingPositions = Array();
        for (let positionEntry of positionEntries) {
            if(this.isAccountDefaulting(positionEntry)){
                defaultingPositions.push(positionEntry);
            }
        }
        return defaultingPositions;
    }

    /**
     * Infinite loop that searches for liquidations. It updates the prices every seven seconds. 
     */
    async searchForLiquidations(){
        let currentBountyTotal;
        let defaultingPositions;
        while(true){
            try {
                // await this.updatePrices();// TODO uncomment this DEBUG
                defaultingPositions = this.findAllDefaultingPositions();
                currentBountyTotal = this.currentBountyForLiquidationsInUSD(defaultingPositions);
            } catch (error) {
                console.log("ERROR: Failed updating our understanding of the defaulting state of the positions. " + error);
                // continue;//TODO is this right?
            }
          
            if (currentBountyTotal > THRESHHOLD_FOR_FREE_FOR_ALL){
                freeForAll = true;
            }
            if (freeForAll){
                for (const position of defaultingPositions) {
                    try {
                        //TODO We need to figure out how to lock from making multiple attempts on the same position. Because as is, if the transaction takes longer than 7ish seconds complete then we'll try again. We should probably read up on asyncronous programming practices. What I might be able to do is check that the promise is resolved regularly. That would be less efficient than a callback though. This function could set a lock then the callback would remove the lock. We would need to make sure that the data structure was atomic though. So that means using another collection most likely. I think javascript passes by value and not by reference. Now, what if it the liquidation fails. There are many reasons it could fail, and if it fails for a reason that it won't later, then . This might be as easy as a class variable hashmap that has entries deleted on callback from liquidatePosition().
                        if (this.bountyValueInUSD(position) > THRESHHOLD_FOR_LIQUIDATION){
                            this.liquidatePosition(position);    
                        }
                    } catch (error) {
                        console.log("ERROR: Problem liquidating " + pID + " " + error);
                    }
                }
            }
            await new Promise(resolve => setTimeout(resolve, 7000));
        }
    }

    /**
     * Infinite loop updates the DBs once a day.
     */
    async updateDatabasesLoop(){
        while (true){
            try {
                this.fullDatabasesUpdate();   
            } catch (error) {
                console.log("Failed to update DBs " + error);
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 60 * 24));
        }
    }

    /**
     * Creates subprocesses that constantly searches for defaulting positions and updates the account database once per day.
     * @returns undefined
     */
    async main(){
        this.searchForLiquidations();
        this.updateDatabasesLoop();
    }

    /**
     * Calculates the current value of the bounty for all liquidations this block. This is used to trigger a free for all for liquidating positions. We don't want to expose that we have liquidation code until we can make hundreds of thousands or millions of dollars. It possible that one person screws up. We should do a check that at least $100,000 is up for grabs and at least two positions are offering over $50,000. This means that there is a collapse currently happening. TODO the other way to do this is monitor price of tether but that's a little more unreliable.
     * @param {Array<positionEntries>} defaultingPositions 
     * @returns {number} The value of the bounty for all positions I can liquidate in this moment.
     */
    currentBountyForLiquidationsInUSD(defaultingPositions){
      let cumulativeBountyValue = 0;
      for (const position of defaultingPositions) {
          let bountyValue = this.bountyValueInUSD(position);
          //TODO Store the price of ethereum as a global variable and update it once a day in the updateAllDB function. chainlink 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419 latestAnswer()
          cumulativeBountyValue += bountyValue;
      }
      return cumulativeBountyValue;
    }

    
     /**
     * Gives the bounty value for liquidating the position. Incorporates TierProxyOracle.convertForLiquidation(). 
     * @param {PositionEntry} position 
     * @returns {BigNumber} The value in ETH of the bounty for liquidating the given position.
     */
    bountyValueInETH(position){
        let debtTokenPaidCollateralAmount = this.convertForLiquidation(position);
        let lpTokenEntry = this.pricing.findOne({'tokenAddress': position.LPTokenAddress});
        if (debtTokenPaidCollateralAmount.lt(position.collateralSize)){
            return debtTokenPaidCollateralAmount.mul(lpTokenEntry.priceRatioOT).div(ONE_TWELVE);
        } else {
            return BigNumber.from(position.collateralSize).mul(lpTokenEntry.priceRatioOT).div(ONE_TWELVE);
        }
    }

      /**
     * 
     * @param {Position} position Defaulting position to appraise
     * @returns {number} The USD value of the bounty for the position.
     */
       bountyValueInUSD(position){
        return parseInt(formatEther(this.bountyValueInETH(position).mul(ethPrice)).split('.')[0]);
  }

    /* 
    function convertForLiquidation(
    address tokenIn,
    address tokenOut,
    uint tokenOutId,
    uint amountIn
  ) external view returns (uint) {
    require(whitelistERC1155[tokenOut], 'bad token');
    address tokenOutUnderlying = IERC20Wrapper(tokenOut).getUnderlyingToken(tokenOutId);
    uint rateUnderlying = IERC20Wrapper(tokenOut).getUnderlyingRate(tokenOutId);
    uint liqIncentiveIn = liqIncentives[tokenIn];
    uint liqIncentiveOut = liqIncentives[tokenOutUnderlying];
    require(liqIncentiveIn != 0, 'bad underlying in');
    require(liqIncentiveOut != 0, 'bad underlying out');
    uint pxIn = source.getETHPx(tokenIn);
    uint pxOut = source.getETHPx(tokenOutUnderlying);
    uint amountOut = amountIn.mul(pxIn).div(pxOut);
    amountOut = amountOut.mul(2**112).div(rateUnderlying);
    return amountOut.mul(liqIncentiveIn).mul(liqIncentiveOut).div(10000 * 10000);
  } 
   */
  
  /**
   * Takes a position and gives what the value of a liquidation is if the debt token with the largest current debt is used to pay.
   * @param {Position} position The position we're converting the best debt token for.
   * @returns The collateral LPToken amount equivalent to the greatest debt token.
   */
    convertForLiquidation(position){
        //TODO test function
        let lpTokenEntry = this.pricing.findOne({'tokenAddress': position.LPTokenAddress});
        let debtTokenIndex = this.getBiggestDebtTokenIndex(position);
        let debtTokenEntry = this.pricing.findOne({'tokenAddress': position.debts[0][debtTokenIndex]});
        return BigNumber.from(position.debts[1][debtTokenIndex]).mul(debtTokenEntry.priceRatioOT).div(lpTokenEntry.priceRatioOT).mul(ONE_TWELVE).div(lpTokenEntry.underlyingRate).mul(lpTokenEntry.liqIncentive).mul(debtTokenEntry.liqIncentive).div(10000).div(10000);
    }


    /**
     * 
     * @param {Position} position Position from the DB
     * @returns {string} The token index of the token with the biggest valued debt in the position.
     */
    getBiggestDebtTokenIndex(position){
        //TODO This really needs to be tested.
        let biggestToken;
        let biggestValue = BigNumber.from(0);
        let tokens = position.debts[0];
        let debtAmounts = position.debts[1];
        for (const tokenIndex in tokens) {
            let tokenEntry = this.pricing.findOne({'tokenAddress': tokens[tokenIndex]});
            let value = BigNumber.from(debtAmounts[tokenIndex]);
            value = value.mul(tokenEntry.priceRatioOT);
            if (value.gt(biggestValue)){
                biggestValue = value;
                biggestToken = tokenIndex;
            }
        }
        return biggestToken;
    }

     

    /**
     * Returns whether a given position is in default.
     * @param {number} positionEntry Position
     * @returns {boolean} Whether the position is in default.
     */
    isAccountDefaulting(positionEntry){
        if(BLACKLIST.includes(positionEntry.LPTokenAddress)){
            return false;
        }
        return (this.getCollateralValue(positionEntry).lt(this.getDebtValue(positionEntry)));
    }
}

/**
 * Removes specified objects from an input array e.g. removeA([obj1,obj2,obj3], obj1, obj2) = [obj3]
 * @param arr array of arguments beginning with the input array, and ending with the objects to be removed
 * @returns {Array} input array without the removed objects
 */
function removeA(arr) {
    let what, a = arguments, L = a.length, ax;
    while (L > 1 && arr.length) {
        what = a[--L];
        while ((ax= arr.indexOf(what)) !== -1) {
            arr.splice(ax, 1);
        }
    }
    return arr;
}

module.exports.AlphaHomoraBot = AlphaHomora;

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