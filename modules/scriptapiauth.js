var express = require('express');

var scriptapiauth = function (req, res, next)  {
    if (req.body.code) {
			req.session.credentials = req.app.locals.codeStore[code] ? 
				delete codeStore[code] : 
				console.log('scriptapiauth: could not delete code');
    }
    next();
};

module.exports = scriptapiauth;
