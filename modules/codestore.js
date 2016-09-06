var express = require('express');

var genuuid = function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + '-' + s4() + s4() + s4();
};

var codestore = function (req, res, next)  {
		if (!req.headers.cookie || !req.session.authentication) { // alternately: if (!req.session.authentication)
			console.log('codestore: no cookie/auth credentials exist (storing code for app script to get later)');
			var randomcode = genuuid();
			req.app.locals.codestore[randomcode] = req.query.code;
			res.end(randomcode);
		} else {
    	next();
		}
};

module.exports = codestore;
