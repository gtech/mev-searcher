const {BigNumber, Wallet} = require("ethers");

exports.ETHER = BigNumber.from(10).pow(18);

module.exports = {
    bigNumberToDecimal: function (value, base = 18) {
        const divisor = BigNumber.from(10).pow(base)
        return value.mul(10000).div(divisor).toNumber() / 10000
    },
    getDefaultRelaySigningKey: function () {
        console.warn("You have not specified an explicity FLASHBOTS_RELAY_SIGNING_KEY environment variable. Creating random signing key, this searcher will not be building a reputation for next run")
        return Wallet.createRandom().privateKey;
    },
    getTimestamp: function () {
        const pad = (n, s = 2) => (`${new Array(s).fill(0)}${n}`).slice(-s);
        const d = new Date();

        return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    },
    sleep: function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
