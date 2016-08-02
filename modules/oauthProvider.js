var express = require('express');
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

var oauthProvider = function (req, res, next)  {
    if (req.session.credentials) {
        req.oauth2Client = new OAuth2(...req.session.authentication);
        req.oauth2Client.setCredentials(req.session.credentials);
        next();
    } else {
        fs.readFile('./credentials/client_secret_tv.json', function (err, content) {
            if (err) {
                console.log('error reading auth info from client_secret_tv.json');
            } else {
                content = JSON.parse(content.toString('utf8'));
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
 
                req.session.redirect_originalUrl = req.originalUrl;
                res.json({ type: 'auth', resp: url });
            }
        });
    }
};

module.exports = oauthProvider;
