//  needed to get the client_secret.json which has the user credentials
var fs - require('fs');
//  this is how you get access to all of the google APIs; use it to do all the API calls
var google = require('googleapis');

//  variable is using the google drive API, v3
var service = google.drive('v3');

//  this is where you put the parameters for any call you make; just like in the Ruby demo
var params = {};

//  an actual API call
service.file.list({
    auth: auth, //  auth is the 
});

//  OAuth with the googleapis npm
var OAuth2 = google.auth.OAuth2;


var scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.appfolder',
    'https://www.googleapis.com/auth/drive.file'
];

var url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
})

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

//  can now make requests using oauth2Client as the auth parameter!!