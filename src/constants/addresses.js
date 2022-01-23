const { BigNumber } = require ("@ethersproject/bignumber");
const { parseUnits } = require ("@ethersproject/units");


exports.IS_MAINNET = true;
exports.UNISWAP_FACTORY_ADDRESS = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'; // goerli and mainnet

exports.WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; //Mainnet
exports.UNISWAP_LOOKUP_CONTRACT_ADDRESS = '0x5EF1009b9FCD4fec3094a5564047e190D72Bd511' //Mainnet
exports.SUSHISWAP_FACTORY_ADDRESS = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac'; //Mainnet
exports.CRO_FACTORY_ADDRESS = "0x9DEB29c9a4c7A88a3C0257393b7f3335338D9A9D"; //mainnet
exports.ZEUS_FACTORY_ADDRESS = "0xbdda21dd8da31d5bee0c9bb886c044ebb9b8906a"; //mainnnet
exports.LUA_FACTORY_ADDRESS = "0x0388c1e0f210abae597b7de712b9510c6c36c857"; //mainnet

exports.FACTORY_ADDRESSES = [
  exports.CRO_FACTORY_ADDRESS,
  exports.ZEUS_FACTORY_ADDRESS,
  exports.LUA_FACTORY_ADDRESS,
  exports.SUSHISWAP_FACTORY_ADDRESS,
  exports.UNISWAP_FACTORY_ADDRESS,
]


exports.cyWETH = "0x41c84c0e2EE0b740Cf0d31F63f3B6F627DC6b393"

exports.cyDAI = "0x8e595470Ed749b85C6F7669de83EAe304C2ec68F"

exports.cyLINK = "0xE7BFf2Da8A2f619c2586FB83938Fa56CE803aA16"

exports.cyYFI = "0xFa3472f7319477c9bFEcdD66E4B948569E7621b9"

exports.cySNX = "0x12A9cC33A980DAa74E00cc2d1A0E74C57A93d12C"

exports.cyWBTC = "0x8Fc8BFD80d6A9F17Fb98A373023d72531792B431"

exports.cyUSDT = "0x48759F220ED983dB51fA7A8C0D2AAb8f3ce4166a"

exports.cyUSDC = "0x76Eb2FE28b36B3ee97F3Adae0C69606eeDB2A37c"

exports.cySUSD = "0xa7c4054AFD3DbBbF5bFe80f41862b89ea05c9806"

exports.cyMUSD = "0xBE86e8918DFc7d3Cb10d295fc220F941A1470C5c"

exports.cyDUSD = "0x297d4Da727fbC629252845E96538FC46167e453A"

exports.cyEURS = "0xA8caeA564811af0e92b1E044f3eDd18Fa9a73E4F"

exports.cySEUR = "0xCA55F9C4E77f7B8524178583b0f7c798De17fD54"

exports.cyDPI = "0x7736Ffb07104c0C400Bb0CC9A7C228452A732992"

exports.cyBUSD = "0x09bDCCe2593f0BEF0991188c25Fb744897B6572d"

exports.cyGUSD = "0xa0E5A19E091BBe241E655997E50da82DA676b083"

exports.cyUSDP = "0xBdDEB563E90F6cBF168a7cDa4927806477e5B6c6"

exports.cyUNI = "0xFEEB92386A055E2eF7C2B598c872a4047a7dB59F"

exports.cySUSHI = "0x226F3738238932BA0dB2319a8117D9555446102f"


exports.crUSDT = "0x797AAB1ce7c01eB727ab980762bA88e7133d2157"

exports.crUSDC = "0x44fbebd2f576670a6c33f6fc0b00aa8c5753b322"

exports.crYFI = "0xCbaE0A83f4f9926997c8339545fb8eE32eDc6b76"

exports.crBAL = "0xcE4Fe9b4b8Ff61949DCfeB7e03bc9FAca59D2Eb3"

exports.crCOMP = "0x19D1666f543D42ef17F66E376944A22aEa1a8E46"

exports.crLINK = "0x697256CAA3cCaFD62BB6d3Aa1C7C5671786A5fD9"

exports.crCRV = "0xc7Fd8Dcee4697ceef5a2fd4608a7BD6A94C77480"

exports.crRENBTC = "0x17107f40d70f4470d20CB3f138a052cAE8EbD4bE"

exports.crBUSD = "0x1FF8CDB51219a8838b52E9cAc09b71e591BC998e"

exports.crMTA = "0x3623387773010d9214B10C551d6e7fc375D31F58"

exports.crSUSHI = "0x338286C0BC081891A4Bda39C7667ae150bf5D206"

exports.crFTT = "0x10FDBD1e48eE2fD9336a482D746138AE19e649Db"

exports.crSRM = "0xef58b2d5A1b8D3cDE67b8aB054dC5C831E9Bc025"

exports.crUNI = "0xe89a6D0509faF730BD707bf868d9A2A744a363C7"

exports.crWNXM = "0xeFF039C3c1D668f408d09dD7B63008622a77532C"

exports.crCEL = "0x8b3FF1ed4F36C2c2be675AFb13CC3AA5d73685a5"

exports.crDPI = "0x2A537Fa9FFaea8C1A41D3C2B68a9cb791529366D"

exports.crBBTC = "0x7ea9C63E216D5565c3940A2B3d150e59C2907Db3"

exports.crAAVE = "0x3225E3C669B39C7c8B3e204a8614bB218c5e31BC"

exports.crBOND = "0xf55BbE0255f7f4E70f63837Ff72A577fbDDbE924"

exports.crKP3R = "0x903560b1CcE601794C584F58898dA8a8b789Fc5d"

exports.crHBTC = "0x054B7ed3F45714d3091e82aAd64A1588dC4096Ed"

exports.crHFIL = "0xd5103AfcD0B3fA865997Ef2984C66742c51b2a8b"

exports.crCRETH2 = "0xfd609a03B393F1A1cFcAcEdaBf068CAD09a924E2"

exports.crHUSD = "0xD692ac3245bb82319A31068D6B8412796eE85d2c"

exports.crDAI = "0x92B767185fB3B04F881e3aC8e5B0662a027A1D9f"

exports.crHEGIC = "0x10a3da2BB0Fae4D591476fd97D6636fd172923a8"

exports.crESD = "0x3C6C553A95910F9FC81c98784736bd628636D296"

exports.crCOVER = "0x21011bc93d9e515b9511a817a1ed1d6d468f49fc"

exports.cr1INCH = "0x85759961b116f1D36fD697855c57A6ae40793D9B"

exports.crOMG = "0x7Aaa323D7e398be4128c7042d197a2545f0f1fea"

exports.crWBTC = "0x197070723CE0D3810a0E47F06E935c30a480D4Fc"

exports.crSNX = "0xC25EAE724f189Ba9030B2556a1533E7c8A732E14"

exports.crSUSD = "0x25555933a8246Ab67cbf907CE3d1949884E82B55"

exports.crPICKLE = "0xc68251421edda00a10815e273fa4b1191fac651b"

exports.crAKRO = "0x65883978aDA0e707c3b2BE2A6825b1C4BDF76A90"

exports.crOGN = "0x59089279987DD76fC65Bf94Cb40E186b96e03cB3"

exports.crAMP = "0x2Db6c82CE72C8d7D770ba1b5F5Ed0b6E075066d6"

exports.crFRAX = "0xb092b4601850E23903A42EaCBc9D8A0EeC26A4d5"

exports.crALPHA = "0x1d0986Fb43985c88Ffa9aD959CC24e6a087C7e35"

exports.crUST = "0x51F48b638F82e8765F7a26373A2Cb4CcB10C07af"

exports.crFTM = "0xc36080892c64821fa8e396bc1bD8678fA3b82b17"

exports.crRUNE = "0x8379BAA817c5c5aB929b03ee8E3c48e45018Ae41"

exports.crPERP = "0x299e254A8a165bBeB76D9D69305013329Eea3a3B"

exports.crRAI = "0xf8445C529D363cE114148662387eba5E62016e20"

exports.crOCEAN = "0x7C3297cFB4c4bbd5f44b450c0872E0ADA5203112"

exports.crRARI = "0x081FE64df6dc6fc70043aedF3713a3ce6F190a21"

exports.crSFI = "0x28526Bb33d7230E65E735dB64296413731C5402e"

exports.crARMOR = "0xab10586C918612BA440482db77549d26B7ABF8f7"

exports.crARNXM = "0xdFFf11DFe6436e42a17B86e7F419Ac8292990393"

exports.crMLN = "0xDbb5e3081dEf4b6cdD8864aC2aeDA4cBf778feCf"

exports.crVSP = "0x71cEFCd324B732d4E058AfAcBA040d908c441847"

exports.crVVSP = "0x1A122348B73B58eA39F822A89e6ec67950c2bBD0"

exports.crGNO = "0x523EFFC8bFEfC2948211A05A905F761CBA5E8e9E"

exports.MKR = "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2"
exports.BAND = "0xba11d00c5f74255f56a5e366f4f77f5a186d7f55"
exports.REN = "0x408e41876cccdc0f92210600ef50372656052a38"

// export interface CToken {
//   address: string,
//   posessingAddress : string,
//   underlyingAddress: string,
//   symbol: string,
//   decimal: BigNumber
// }

exports.cWETH= {address: exports.cyWETH, posessingAddress: '0x0F4ee9631f4be0a63756515141281A3E2B293Bbe', underlyingAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol:'WETH', decimal: parseUnits("1.0", "ether")}
exports.cUSDC=   {address: exports.cyUSDC, posessingAddress: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503', underlyingAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimal: BigNumber.from(1e6)};
exports.cUSDT=   {address: exports.cyUSDT, posessingAddress: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503', underlyingAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimal: BigNumber.from(1e6)};
exports.cDAI=   {address: exports.cyDAI, posessingAddress: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503', underlyingAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', decimal: parseUnits("1.0", "ether")};
exports.cDPI=   {address: exports.crDPI, posessingAddress: '0x1c631824b0551FD0540A1f198c893B379D5Cf3c3', underlyingAddress: '0x1494CA1F11D487c2bBe4543E90080AeBa4BA3C2b', symbol: 'DPI', decimal: parseUnits("1.0", "ether")};
exports.cLINK=   {address: exports.cyLINK, posessingAddress: '0xbe6977E08D4479C0A6777539Ae0e8fa27BE4e9d6', underlyingAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', decimal: parseUnits("1.0", "ether")};
exports.cSNX=   {address: exports.cySNX, posessingAddress: '0x27Cc4d6bc95b55a3a981BF1F1c7261CDa7bB0931', underlyingAddress: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F', symbol: 'SNX', decimal: parseUnits("1.0", "ether")};
exports.cWBTC=   {address: exports.cyWBTC, posessingAddress: '0xBA12222222228d8Ba445958a75a0704d566BF2C8', underlyingAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', decimal: parseUnits("1.0", "ether")};
exports.cYFI=   {address: exports.cyYFI, posessingAddress: '0x675938d86a6A4651b6dbba7529117fb0b557cCf2', underlyingAddress: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e', symbol: 'YFI', decimal: parseUnits("1.0", "ether")};
exports.cUNI=   {address: exports.crUNI, posessingAddress: '0x47173B170C64d16393a52e6C480b3Ad8c302ba1e', underlyingAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', decimal: parseUnits("1.0", "ether")};
exports.cCRV=   {address: exports.crCRV, posessingAddress: '0x4ce799e6eD8D64536b67dD428565d52A531B3640', underlyingAddress: '0xD533a949740bb3306d119CC777fa900bA034cd52', symbol: 'CRV', decimal: parseUnits("1.0", "ether")};
exports.cAAVE=   {address: exports.crAAVE, posessingAddress: '0xf81cCDc1EE8DE3FBFA48A0714fC773022E4C14D7', underlyingAddress: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', symbol: 'AAVE', decimal: parseUnits("1.0", "ether")};
exports.cSUSD=   {address: exports.cySUSD, posessingAddress: '0x042eD37d32B88AB6b1C2E7B8a400dcDc728050bc', underlyingAddress: '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51', symbol: 'SUSD', decimal: parseUnits("1.0", "ether")};
exports.cCOMP=   {address: exports.crCOMP, posessingAddress: '0x7587cAefc8096f5F40ACB83A09Df031a018C66ec', underlyingAddress: '0xc00e94Cb662C3520282E6f5717214004A7f26888', symbol: 'COMP', decimal: parseUnits("1.0", "ether")};
exports.cSUSHI=   {address: exports.crSUSHI, posessingAddress: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503', underlyingAddress: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2', symbol: 'SUSHI', decimal: parseUnits("1.0", "ether")};

exports.BANK_TOKENS = [
"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
"0x6B175474E89094C44Da98b954EedeAC495271d0F",
"0x514910771AF9Ca656af840dff83E8264EcF986CA",
"0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e",
"0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F",
"0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
"0xdAC17F958D2ee523a2206206994597C13D831ec7",
"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
"0x57Ab1ec28D129707052df4dF418D58a2D46d5f51",
"0x1494CA1F11D487c2bBe4543E90080AeBa4BA3C2b",
"0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
"0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
]


exports.ALPHA_HOMORA_CTOKENS = [
  exports.cWETH,
  exports.cUSDC,
  exports.cDAI,
  exports.cDPI,
  exports.cLINK,
  exports.cSNX,
  exports.cWBTC,
  exports.cYFI,
  exports.cUNI,
  exports.cCRV,
  exports.cAAVE,
  exports.cSUSD,
  exports.cCOMP,
  exports.cSUSHI
]

let tokensToCTokens = {}; 

for (let cToken of exports.ALPHA_HOMORA_CTOKENS){
  tokensToCTokens[cToken.underlyingAddress] = cToken.address;
}

exports.TOKENS_TO_CTOKENS = tokensToCTokens;

// CToken cyWETH,
//   cyUSDC,
//   cyUSDT,
//   cyDAI,
//   crDPI,
//   cyLINK,
//   cySNX,
//   cyWBTC,
//   cyYFI,
//   crUNI,
//   crCRV,
//   crAAVE,
//   cySUSD,
//   crCOMP,
//   crSUSHI

exports.UNBORROWABLE_TOKENS = [
  exports.MKR,
  exports.BAND,
  exports.REN
]


// exports.IS_MAINNET = false;
// exports.UNISWAP_FACTORY_ADDRESS = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'; // goerli and mainnet

// exports.WETH_ADDRESS = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6'; //Goerli
// exports.UNISWAP_LOOKUP_CONTRACT_ADDRESS = '0x7C7Fe590a1EF2f203065Ec8E15698798923537Db' //Goerli
// exports.SUSHISWAP_FACTORY_ADDRESS = '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'; //Goerli

// exports.FACTORY_ADDRESSES = [
//   SUSHISWAP_FACTORY_ADDRESS,
//   UNISWAP_FACTORY_ADDRESS,
//]