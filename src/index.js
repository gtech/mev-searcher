const { Environment } = require ( "./Environment");

let environment;
let liqBot;

environment = new Environment();
await environment.initialize();
liqBot = await environment.createLiquityBot();
await liqBot.liquidateTroves();