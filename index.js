var Hapi = require('hapi'),
    Joi  = require('joi'),
    Boom = require('boom'),
    uuid = require('node-uuid'),
    os   = require('os'),
    fs   = require('fs'),
    request = require('request'),
    Caman   = require('caman').Caman,
    twilio  = require('twilio'),
    twilioClient = new twilio.RestClient();

// TODO: Going to move this to a filters.js module once its working
var filters = [
  'vintage',
  'logo',
  'clarity',
  'sinCity',
  'sunrise',
  'crossProcess',
  'orangePeel',
  'love',
  'grungy',
  'jarques',
  'pinhole',
  'oldBoot',
  'glowingSun',
  'hazyDays',
  'herMajesty',
  'nostalgia',
  'hemingway',
  'concentrate'
];

// Download and apply filter to photo
function applyFilter(mediaUrl, filter, from, to, url_base) {
  // create a unique id for our video/gif processing
  var id = uuid.v1(),
      original = os.tmpdir() + '/' + id,
      filtered = id + '.png',
      filteredPath = './static/' + filtered;
  
  // save the remote image file to /tmp fs
  download = request(mediaUrl).pipe(fs.createWriteStream(original));
  
  download.on('finish', function() {
    // initialize CamanJS
    Caman(original, function() {
      this.resize({ width: 600 });
      this[filter]();
      this.render(function() {
        // save to the fs
        this.save(filteredPath);
        console.log('Saved: ', filtered);
        // delete tmp file
        fs.unlink(original, function(err) { console.log(err); });
        sendPhoto( url_base, filtered, from, to );
      });
    });
  });

}

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
      filter = req.payload.Body.toLowerCase().trim(),
      // twim1 object for sending replies to users
      twim1 = new twilio.Twim1Response();
  
  console.log('Processing MMS: ', mediaUrl, mediaContentType, filter);
  
  // verify that the filter exists in the list
  var filterValid = false;
  
  if( filters.indexOf( filter.toLowerCase() ) !== -1 ) {
    filterValid = true;
    filter = filters.indexOf( filter.toLowerCase() );
  }

  // check to see if the user has submitted an image and filter
  if( mediaUrl && mediaContentType && mediaContentType.indexOf('image') !== 0 ) {
    if( filterValid ) {
     // send `hang tight! working on it` message
     twim1.message('Hang tight! Applying filter');
     reply(twim1.toString()).type('text/xml');

     applyFilter( mediaUrl, filter, from, to, url_base );
    } else {
     // respond with a list of valid filters
    }
  } else {
    // send instructions for the app
  }
}

// Send an MMS message with filtered photo attached
function sendPhoto(url_base, photo, from, to) {
  var photoUrl = url_base + '/' + photo;
  
  twilioClient.sendMessage({
    to: from, from: to,
    body: 'Powered by Twilio MMS',
    mediaUrl: photoUrl
  }, function( err, responseData ) {
    if (err) { console.log('Error sending MMS: ', JSON.stringify(err) ); }
  }
  });
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
