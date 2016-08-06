var express = require('express');
var fs = require('fs');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var request = require('request');


var VERIFICATION_URL = "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=";

var scopes = [ 
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.profile'
];


//  make sure the user-provided access token is valid; 
//      otherwise expire the cookie and re-authenticate
var verifyToken = function (req, res, callback) {
    request(VERIFICATION_URL + req.session.credentials.access_token, function (err, resp, body) {
        var jsonbody = JSON.parse(body);
        if (jsonbody.expires_in > 30) {
            console.log('token still good: ', jsonbody.expires_in);
            callback();
        } else {
            console.log('token is too old: ', jsonbody.expires_in);
            req.session.cookie.expires = Date.now();
            authPrep(req, res);
        }

    });

};

//  get an access_token URL, store the client's original destination in the session
//      and then send them an auth link
//      after authentication, the callback route will take them to their original destination
var authPrep = function (req, res) {
    fs.readFile('./credentials/client_secret_tv.json', function (err, content) {
        if (err) {
            console.log('error reading auth info from client_secret_tv.json');
        } else {
            req.session.originalUrl = req.originalUrl;
            req.session.originalBody = req.body;
 
            content = JSON.parse(content.toString('utf8'));
            req.session.credentials = null;
            req.session.authentication = [
                content.web.client_id,
                content.web.client_secret,
                content.web.redirect_uris[0]
            ];
            oauth2Client = new OAuth2(...req.session.authentication);

            var url = oauth2Client.generateAuthUrl({
                access_type: 'offline',  
                scope: scopes 
            }); 

            res.json({ type: 'auth', resp: url });
        }
    });
};

var oauthProvider = function (req, res, next)  {
//    console.log('in oauthProvider; did savemetadata make it? ', 
//        req.session,
//        req.session.redirect_originalUrl, 
//        req.session.credentials);


    if (req.session.credentials) {
        verifyToken(req, res, function () {
            req.oauth2Client = new OAuth2(...req.session.authentication);
            req.oauth2Client.setCredentials(req.session.credentials);
            next();
        });
    } else {
        authPrep(req, res);
    }
};

module.exports = oauthProvider;
