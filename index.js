var Hapi = require('hapi'),
    Joi  = require('joi'),
    Boom = require('boom');

// Schema validation for payload, probably move this into a module later

// Validate that NumMedia is an integer, convert param to integer, and
// Allow other POST parameters not specified
var twilioRequest = Joi.object().keys({
  NumMedia: Joi.number().integer().min(0)
}).unknown();

// Make sure message isn't a returned from twilio and not a CURL'd response
function handleMessage(req, reply) {
  var header = req.headers['x-twilio-signature'],
      token = process.env.TWILIO_AUTH_TOKEN,
      url_base = 'http://'+req.info.host;

  if( !twilio.validateRequest(token, header, url_base+'/message', req.payload) ) {
    reply(Boom.forbidden('Invalid x-twilio-signature'));
    return;
  }

  var from = req.payload.From,
      to = req.payload.To,
      mediaUrl = req.payload.MediaUrl0,
      mediaContentType = req.payload.MediaContentType0,
      filter = req.payload.Body.toLowerCase().trim();
  
  console.log('Processing MMS: ', mediaUrl, mediaContentType, filter);

  // check to see if the user has submitted an image and filter
  if( mediaUrl && mediaContentType && mediaContentType.indexOf('image') !== 0 ) {
    if( filter ) {
     // send `hang tight! working on it` message
    } else {
     // respond with a list of valid filters
    }
  } else {
    // send instructions for the app
  }
}

// Create a server with a host and port
var server = new Hapi.Server(process.env.PORT || 3000);

server.route([
{
  method: 'POST', path: '/message', handler: handleMessage, config: {
    validate: {
      payload: twilioRequest
    }
  }
},
{
  method: 'GET', path: '/{p*}',
  handler: {
    directory: { path: './static', listing: false, index: true }
  }
}
]);

// Start the beast
server.start();
console.log('App has started on port ', process.env.PORT || 3000);
