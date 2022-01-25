const {BigNumber, Wallet} = require("ethers");
const {getTimestamp} = require("./utils");

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
    return str.toLowerCase() === "true" || str === "1"
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    bigNumberToDecimal,
    getDefaultRelaySigningKey,
    getTimestamp,
    logError,
    parseBoolean,
    sleep
};
