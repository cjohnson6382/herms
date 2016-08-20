var express = require('express');
var router = express.Router();
var fs = require('fs');

var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

//  var scriptapiauth = require('../modules/scriptapiauth.js');

//  router.use(scriptapiauth);

router.get('/', function (req, res) {

    //  console.log('in /callback: ', req.session.originalUrl);
    //  console.log('in /callback (session): ', req.session.originalUrl);

    console.log('req.headers (/callback): ', req.headers);

    req.oauth2Client = new OAuth2(...req.session.authentication);
    req.oauth2Client.getToken(req.query.code, function (err, token) {
        if (err) {
            console.log('error getting tokens! ', err);
        } else {
            req.session.credentials = token;
            req.oauth2Client.setCredentials(token);
 
            res.redirect(req.session.originalUrl);
        }
    });
});

module.exports = router;
