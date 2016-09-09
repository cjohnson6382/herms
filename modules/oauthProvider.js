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
        request(
					VERIFICATION_URL + req.session.credentials.access_token, 
					function (err, resp, body) {
            var jsonbody = JSON.parse(body);
            jsonbody.expires_in > 30 ? 
							resolve(jsonbody.expires_in) : 
							reject(jsonbody.expires_in);
        	}
				);
    });

    return deferred;
};

var sendAuthUrl = function (req, res) {
		var oauth2Client = new OAuth2(...req.app.locals.authentication);
		var url = oauth2Client.generateAuthUrl({ 
			access_types: 'offline', 
			scope: scopes 
		});

		res.json({ type: 'auth', resp: url });
};

var setToken = function (req, res, next) {
		req.oauth2Client = new OAuth2(...req.app.locals.authentication);
    verifyToken(req, res)
        .then(function (resolve) {
            req.oauth2Client.setCredentials(req.session.credentials);
            next();
        }, function (reject) {
            sendAuthUrl(req, res);
        });
};

var oauthProvider = function (req, res, next) {
		console.log('oauthProvider, req.session.credentials: ', req.session.credentials);

    req.session.originalUrl = req.originalUrl;
    req.session.credentials ? setToken(req, res, next) :  sendAuthUrl(req, res);
};

module.exports = oauthProvider;
