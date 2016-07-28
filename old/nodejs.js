var fs = require('fs');
var https = require('https');

var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
//  TOKEN_DIR is where the access token is stored AFTER you get it
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'drive-nodejs-quickstart.json';

var filelist;

//	load client-secret from localfile
fs.readFile('client_secret.json', function processClientSecret (err, content) {
	if (err) {
		console.log('err... ERR: ' + err);
		return;
	}

  authorize(JSON.parse(content), getHomeDirectory);
});

//  the problem with this is that it uses google-auth-library to do something that googleapis can do on its own, which makes things more complicated than necessary
function authorize(credentials, callback) {
  var clientSecret = credentials.web.client_secret;
  var clientId = credentials.web.client_id;
  var redirectUrl = credentials.web.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  fs.readFile(TOKEN_PATH, function (err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

//  this is the code I have to modify
function getNewToken (oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scopes: SCOPES
  })
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  rl.question('Enter the code from the page here: ', function (code) {
    rl.close();
    oauth2Client.getToken(code, function () {
      if (err) {
        console.log('ERR while retrieving access token', err);
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}
//////////////////////////////////////////


function storeToken (token) {
  try { fs.mkdirSync(TOKEN_DIR); } catch (err) { if (err.code != 'EEXIST') { throw err; }}
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

//  API call:
function getHomeDirectory(auth) {
  //  this is the beginning of the API request
  var service = google.drive('v3');
  console.log('got to line 74');
  service.files.list({
    auth: auth,
    fields: "files(id, names)"
  }, function (err, response) {
    if (err) {
      console.log('API did not like your call, so ERRRRRRRR: ' + err);
      return;
    }
    var files = response.files;
    filelist = response.files;
    //  debuggery
    console.log(response.files);
    if (files.length == 0) {
      console.log('Files not found');
    } else {
      console.log('Files: ');
        
      var app = require('express')();
      var options = {
         key  : fs.readFileSync('server.enc.key'),
         cert : fs.readFileSync('server.crt')
      };
      
      https.createServer(options, app).listen(443, function () {
        console.log('Started!');
      });

      app.get('/', function (req, res) {
        for (var i = 0; i < filelist.length; i++) {
          var file = files[i];
          console.log('%s (%s)', file.name, file.id);
          res.send(filelist[i] + "<br />");
        }
      })
    }
  })
}
