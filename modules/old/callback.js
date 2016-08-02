var express = require('express');
var router = express.Router();
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

router.get('/', function (req, res) {
    var oauth2Client = OAuth2(req.session.authentication);
    oauth2Client.getToken(req.query.code, function(err, tokens) {
        if(!err) {
            req.session.credentials = tokens;
            console.log('in /callback; redirecting to original url: ', req.session.redirect_originalUrl);
            res.redirect(req.session.redirect_originalUrl);
        } else {
            console.log('error retrieving token: ', err);
        }
    });
});

module.exports = router;
