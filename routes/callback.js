var express = require('express');
var router = express.Router();
var passport = require('passport');

router.get('/', passport.authenticate('google', { failureRedirect: '/auth' }), function (req, res) {
    res.end('success');
});

module.exports = router;