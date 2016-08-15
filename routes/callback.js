var express = require('express');
var router = express.Router();
var fs = require('fs');

router.get('/', function (req, res) {
    req.session.code = req.query.code;
    if (req.session.originalUrl) {
        res.redirect(req.session.originalUrl);
    } else {
        res.render('iframe', { code: req.query.code });
    }
});

module.exports = router;
