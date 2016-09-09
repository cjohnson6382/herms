var express = require('express');
var router = express.Router();

var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var codestore = require('../modules/codestore.js');

router.use(codestore);
router.get('/', function (req, res) {
    req.oauth2Client = new OAuth2(...req.app.locals.authentication);
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
