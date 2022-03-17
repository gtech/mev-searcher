const { Environment } = require ( "./environment");
const {env} = require("./constants/env");

async function main(){
    // Create and initialize the environment
    const environment = await (new Environment()).initialize();

    // Create liquidity bot for liquity
    const liqBot = await environment.createLiquityLiquidator(env.CONTRACT_ADDRESS__LIQUITY_LIQUIDATOR);
    liqBot.liquidateTroves();

    //Makes the program run in an infinite loop.
    while(true){
        await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 60 * 24)); //sleep a day
    }
}

main();