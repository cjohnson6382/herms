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

var verifyToken = function (req, res, callback) {
    request(VERIFICATION_URL + req.session.credentials.access_token, function (err, resp, body) {
        var jsonbody = JSON.parse(body);
        if (jsonbody.expires_in > 30) {
            console.log('token still good: ', jsonbody.expires_in);
            callback();
        } else {
            console.log('token is too old: ', jsonbody.expires_in);
            req.session.cookie.expires = Date.now();
            sendAuthUrl(req, res);
        }
    });
};

var getCredentials = function (callback) {
    fs.readFile('./credentials/client_secret_tv.json', function (err, content) {
        if (err) {
            console.log('error reading auth info from client_secret_tv.json');
        } else {
            var credentials = JSON.parse(content.toString('utf8'));
            callback([
                credentials.web.client_id, 
                credentials.web.client_secret, 
                credentials.web.redirect_uris[0]
            ]);
        }
    });
};

var sendAuthUrl = function (req, res) {
    getCredentials(function (auth_credentials) {
        req.session.authentication = auth_credentials;
        req.session.originalUrl = req.originalUrl;

        oauth2Client = new OAuth2(...auth_credentials);
        var url = oauth2Client.generateAuthUrl({
            access_type: 'offline',  
            scope: scopes 
        });

        res.json({ type: 'auth', resp: url });
    });
};

var oauthProvider = function (req, res, next)  {
    if (req.session.code && req.session.authentication) {
        req.oauth2Client = new OAuth2(...req.session.authentication);
        req.oauth2Client.getToken(req.session.code, function (err, tokens) {
            if (err) { 
                console.log('error getting auth tokens'); 
                delete req.session.code;
                sendAuthUrl(req, res);
            } else {
                req.session.credentials = tokens;
                verifyToken(req, res, function () {
                    req.oauth2Client.setCredentials(req.session.credentials);
                    next();
                });

            }
        });
    } else {
        sendAuthUrl(req, res);
    }
};

module.exports = oauthProvider;
