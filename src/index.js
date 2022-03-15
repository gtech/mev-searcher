const { Environment } = require ( "./environment");
const {env} = require("./constants/env");

async function main(){
    // Create and initialize the environment
    const environment = await (new Environment()).initialize();

    // Create liquidity bot for liquity
    const liqBot = await environment.createLiquityLiquidator(env.CONTRACT_ADDRESS__LIQUITY_LIQUIDATOR);
    await liqBot.liquidateTroves();
}

main();