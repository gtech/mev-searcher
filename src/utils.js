const { BigNumber, Wallet } = require("ethers");

exports.ETHER = BigNumber.from(10).pow(18);

module.exports = function bigNumberToDecimal(value, base = 18){
  const divisor = BigNumber.from(10).pow(base)
  return value.mul(10000).div(divisor).toNumber() / 10000
}

module.exports = function getDefaultRelaySigningKey() {
  console.warn("You have not specified an explicity FLASHBOTS_RELAY_SIGNING_KEY environment variable. Creating random signing key, this searcher will not be building a reputation for next run")
  return Wallet.createRandom().privateKey;
}
