var Hapi = require('hapi');

// Create a server with a host and port
var server = new Hapi.Server(process.env.PORT || 3000);

server.route([ {
  method: 'GET', path: '/{p*}',
  handler: {
    directory: { path: './static', listing: false, index: true }
  }
}
]);

// Start the beast
server.start();
console.log('App has started on port ', process.env.PORT || 3000);
