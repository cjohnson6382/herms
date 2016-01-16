//  needed to get the client_secret.json which has the user credentials
var fs = require('fs');

var express = require('express');
var app = express();

//  this is how you get access to all of the google APIs; use it to do all the API calls
var google = require('googleapis');

//  OAuth with the googleapis npm
var OAuth2 = google.auth.OAuth2;

var scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.appfolder',
    'https://www.googleapis.com/auth/drive.file'
];

//  this is the url that you have to redirect the client to so that they can authorize the app
//      I don't know how this works yet?
var url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
})

//  at this point the app has requested an auth URL with the redirect; I need to create an endpoint for the redirect url
//      and then all the code below can get the auth token and start doing shit

app.get('/', function (req, res) {
    res.send('<a href="/auth">DERP GOOGLE AUTH DERP</a>');
})

app.get('/auth', function (req, res) {
    res.redirect(url);
})

app.get('/callback', function (req, res) {
    console.log('code: ' + req.code);
    console.log('req: ' + req);
})

/*
//  read the client_secret.json file, convert the JSON into a key/value array with parse, and then send it to authorize to do the actual authorization
fs.readFile('client_secret.json', function (err, content) {
    if (err === null) {
        authorize(JSON.parse(content), apiCalls);
    } else { return }
});

//  assign the three necessasry OAuth things: id, secret, and redirect; and refresh key...
function authorize (credentials, callback) {
    var clientSecret = credentials.web.client_secret;
    var clientId = credentials.web.client_id;
    var redirectUrl = credentials.web.redirect_uris[0];
    
    var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
    oauth2Client.getToken(code, function (err, tokens) {
        if (!err) {
            oauth2Client.setCredentials(tokens);
        }
    })
}
*/
//  can now make requests using oauth2Client as the auth parameter!!

/*

//  variable is using the google drive API, v3
var drive = google.drive('v3');

//  this is where you put the parameters for any call you make; just like in the Ruby demo
var params = {};

//  an actual API call
drive.files.create({
    auth: oauth2Client, // include with every API call
    
});


var fileMetadata = {
  'name' : 'Contract Templates',
  'mimeType' : 'application/vnd.google-apps.folder'
};
drive.files.create({
   resource: fileMetadata,
   fields: 'id'
}, function(err, file) {
  if(err) {
    // Handle error
    console.log(err);
  } else {
    console.log('Folder Id: ', file.id);
  }
});
*/