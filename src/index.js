const { Environment } = require ( "./Environment");


async function main(){
    let environment;
    let liqBot;
    
    environment = new Environment();
    await environment.initialize();
    liqBot = await environment.createLiquityBot();
    await liqBot.liquidateTroves();
}

main();