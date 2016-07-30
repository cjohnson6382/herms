var express = require('express');
var router = express.Router();
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

router.get('/', function (req, res) {
    var req = new Promise(function (resolve, reject) {
        req.oauth2Client.getToken(req.query.code, function(err, tokens) {
            if(!err) {
                resolve(req.oauth2Client.setCredentials(tokens));
                console.log('credentials: ', req.oauth2Client.credentials);
                console.log('token: ', req.oauth2Client.token);
                res.end('authentication successful');
            } else {
                console.log('error retrieving token: ', err);
            }
        });
    });
});

module.exports = router;
