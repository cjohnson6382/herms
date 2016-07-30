var express = require('express');
var fs = require('fs');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

var oauthProvider = function (req, res, next)  {
    fs.readFile('./credentials/client_secret_tv.json', function (err, content) {
        if (err) {
            console.log('error reading auth info from client_secret_tv.json');
            next();
        } else {
            content = JSON.parse(content.toString('utf8'));
            req.oauth2Client = new OAuth2(
                content.web.client_id,
                content.web.client_secret,
                content.web.redirect_uris[0]
            );
            next();
        }
    });
};

module.exports = oauthProvider;
