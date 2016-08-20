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

var verifyToken = function (req, res) {
    var deferred = new Promise(function (resolve, reject) {
        request(VERIFICATION_URL + req.session.credentials.access_token, function (err, resp, body) {
            var jsonbody = JSON.parse(body);
            //  console.log('google response to token verification: ', jsonbody);
            jsonbody.expires_in > 30 ? resolve(jsonbody.expires_in) : reject(jsonbody.expires_in);
        });
    });

    return deferred;
};

var getCredentials = function () {
    var deferred = new Promise(function (resolve, reject) {
        fs.readFile('./credentials/client_secret_tv.json', function (err, content) {
            if (err) {
                console.log('error reading auth info from client_secret_tv.json');
            } else {
                var credentials = JSON.parse(content.toString('utf8'));
                resolve([
                    credentials.web.client_id, 
                    credentials.web.client_secret, 
                    credentials.web.redirect_uris[0]
                ]);
            }
        });
    });

    return deferred;
};

var sendAuthUrl = function (req, res) {
    getCredentials()
        .then(function (auth_credentials) {
            req.session.authentication = auth_credentials;
            oauth2Client = new OAuth2(...req.session.authentication);
 
            var url = oauth2Client.generateAuthUrl({
                access_type: 'offline',  
                scope: scopes 
            });
            return url;
        })
        .then(function (url) {
            res.json({ type: 'auth', resp: url });
        });
};

var setToken = function (req, res, next) {
    //  req.session.originalUrl = req.originalUrl;
    req.oauth2Client = new OAuth2(...req.session.authentication);

    verifyToken(req, res)
        .then(function (resolve) {
            req.oauth2Client.setCredentials(req.session.credentials);
            //  console.log('promise resolved, going to next:  ', req.originalUrl);
            next();
        }, function (reject) {
            //  console.log('promise rejected: ', reject);
            sendAuthUrl(req, res);
        });
};

var oauthProvider = function (req, res, next) {
    console.log('req.headers (oauthProvider): ', req.headers, '\n\n\n\n');
    console.log('originalUrl (oauthProvider): ', req.originalUrl);

    req.session.originalUrl = req.originalUrl;
    req.session.credentials ? setToken(req, res, next) :  sendAuthUrl(req, res);
};

module.exports = oauthProvider;
