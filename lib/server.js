var Hapi = require('@hapi/hapi');

module.exports = function(host, port) {
  console.log(`Host: ${host} Port: ${port}`);
  return new Hapi.Server({ port: port });
};
