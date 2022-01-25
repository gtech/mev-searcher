const {formatEther} = require("@ethersproject/units");

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
        if (block % 10 == 0){
            a = formatEther(liq.getCollateralValue(accountNum));
            b = formatEther(liq.getDebtValue(accountNum));
            console.log("Block " + block + ", Ether til liq, day " + day + " " + a + " " + b);
            // console.log("collateral: " + a + " debt: " + b);
        }
        block+=5;
        // day++;
        //TODO This doesn't seem to work.
        // environment.forkBlock(block);
    }
}


async function testAccrueEffect(liq ){
    let accountNum = 614;

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

// module.exports = {}
