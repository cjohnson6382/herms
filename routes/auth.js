var express = require('express');
var router = express.Router();
var passport = require('passport');
var fs = require('fs');

var scopes = [
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.profile'
];

router.get('/', passport.authenticate('google', { scope: scopes }));
module.exports = router;