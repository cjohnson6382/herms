//  needed to get the client_secret.json which has the user credentials
var fs = require('fs');
var async = require('async');
var https = require('https');
var express = require('express');
var app = express();

//  this is how you get access to all of the google APIs; use it to do all the API calls
var google = require('googleapis');

//  OAuth with the googleapis npm; don't need the separate google auth NPM
var OAuth2 = google.auth.OAuth2;

var authorization_url;
var oauth2Client;

//  scopes will be used in actual API calls
var scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.appfolder',
    'https://www.googleapis.com/auth/drive.file'
];

function storeKey (key) {
    console.log('store the key!', key);
}

async.waterfall([
    function (callback) {
        fs.readFile('client_secret_tv.json', function (err, content) {
            if (err === null) {
                callback(null, JSON.parse(content));
            } else { 
                return 
            }
        })        
    },
    function (credentials, callback) {
        var clientSecret = credentials.web.client_secret;
        var clientId = credentials.web.client_id;
        var redirectUrl = credentials.web.redirect_uris[0];

        oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
        callback(null, oauth2Client);
    },
    function (oauth2Client, callback) {
        authorization_url = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: scopes
            })
        callback(null, authorization_url);
    },
    function (authorization_url, callback) {
        app.get('/', function (req, res) {
            res.send('<a href="/auth">DERP GOOGLE AUTH DERP</a>');
        }),
        app.get('/auth', function (req, res) {
            res.redirect(authorization_url);
        }),
        app.get('/callback', function (req, res) {
            oauth2Client.getToken(code, function(err, token) {
                if (err) {
                    console.log('ERR while getting access token', err);
                    return;
                }
                oauth2Client.credentials = token;   
            })
            console.log(req.query.code);
            res.send(req.query.code);
        })
        callback(oauth2Client);
    },
], function (err, result) {
    if (!err) {
        storeKey(result);
        var options = {
            key : fs.readFileSync('server.enc.key'),
            cert: fs.readFileSync('server.crt')
        }
        https.createServer(options, app).listen(443, function () {
            console.log('Server is started as HTTPS');
        })
    }
});

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
