var express = require('express');
var fs = require('fs');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var request = require('request');

var scriptapiauth = function (req, res, next)  {
    if (req.headers.cookie) {
        console.log('in scriptapiauth (cookie present): ', req.headers.cookie);
        console.log('in scriptapiauth (cookie present): ', req.session.originalUrl);
        //  req.headers.cookie = req.body.cookie;
    }
    next();
};

module.exports = scriptapiauth;
