var express = require('express');
var fs = require('fs');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var request = require('request');

var scriptapiauth = function (req, res, next)  {
    if (req.body.code) {
        req.session.code = req.body.code;
    }
    next();
};

module.exports = scriptapiauth;
