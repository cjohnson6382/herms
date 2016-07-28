var express = require('express');
var router = express.Router();
var passport = require('passport');

//  there is no succes.html for this app yet, create it
router.get('/', passport.authenticate('google', { failureRedirect: '/auth' }), function (req, res) {
    res.redirect('/success');
});

module.exports = router;
