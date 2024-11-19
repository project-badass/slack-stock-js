var server = require('./lib/server')('0.0.0.0', parseInt(process.env.PORT) || 3000);
var bots = require('./bots');

server.route(bots);
start();

async function start() {
  await server.start();
  console.log('Server started at: ' + server.info.uri);
}
