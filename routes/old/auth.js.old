var express = require('express');
var router = express.Router();
var fs = require('fs');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

var scopes = [
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.profile'
];

router.get('/', function (req, res) {
    //  check whether the access token is valid
    if (req.oauth2Client && req.oauth2Client.access_token) {
        res.end('already authenticated');
    }

    var url = req.oauth2Client.generateAuthUrl({
        access_type: 'offline',  
        scope: scopes 
    });

    res.writeHead(200, {'Access-Control-Allow-Origin': '*'}); 
    res.end(url);
});

module.exports = router;
