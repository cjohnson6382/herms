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
		if (!req.session.originalUrl) { 
			console.log('codestore executing', req.session.originalUrl);
			var randomcode = genuuid();
			req.app.locals.codeStore[randomcode] = req.query.code;
			res.render('callback', { code: randomcode });
		} else {
			console.log('bypassing codestore');
    	next();
		}
};

module.exports = codestore;
