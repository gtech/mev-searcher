const { Environment } = require ( "./environment");

async function main(){
    // Create and initialize the environment
    const environment = await (new Environment()).initialize();

    // Create liquidity bot for liquity
    const liqBot = await environment.createLiquityLiquidator();
    await liqBot.liquidateTroves();
}

main();