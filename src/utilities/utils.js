const {BigNumber, Wallet} = require("ethers");
const {formatEther} = require("@ethersproject/units");

exports.ETHER = BigNumber.from(10).pow(18);

function bigNumberToDecimal(value, base = 18) {
    const divisor = BigNumber.from(10).pow(base)
    return value.mul(10000).div(divisor).toNumber() / 10000
}

function getDefaultRelaySigningKey() {
    console.warn("You have not specified an explicity FLASHBOTS_RELAY_SIGNING_KEY environment variable. Creating random signing key, this searcher will not be building a reputation for next run")
    return Wallet.createRandom().privateKey;
}

function getTimestamp() {
    const pad = (n, s = 2) => (`${new Array(s).fill(0)}${n}`).slice(-s);
    const d = new Date();

    return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function logError(err) {
    console.log(`[${getTimestamp()}]: ${err}`)
}

function parseBoolean(str) {
    if (str) {
        return str.toLowerCase() === "true" || str === "1"
    }
    return false
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// To be used for back testing
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
        if (block % 10 === 0){
            a = formatEther(liq.getCollateralValue(accountNum));
            b = formatEther(liq.getDebtValue(accountNum));
            console.log("Block " + block + ", Ether til liq, day " + day + " " + a + " " + b);
            // console.log("collateral: " + a + " debt: " + b);
        }
        block+=5;
        // day++;
        await environment.forkBlock(block);
    }
}

/**
 * Accrues the accumulated fees for an account and prints the amount of ether that is owed.
 * @param {AlphaHomora} liq AlphaHomora class liquidator
 * @param {Integer} accountNum
 * @returns {Promise<void>}
 */
async function testAccrueEffect(liq,accountNum){

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

module.exports = {
    bigNumberToDecimal,
    getDefaultRelaySigningKey,
    getTimestamp,
    logError,
    parseBoolean,
    sleep,
    historicalWalk,
    testAccrueEffect
};
