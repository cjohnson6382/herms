var express = require('express');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

var scriptapiauth = function (req, res, next)  {
		//	console.log('scriptapiauth, req.headers.cookie: ', req.headers.cookie);
		//	console.log('scriptapiauth, req.session: ', req.session);

    if (req.body.code || !req.session.credentials) {
			//	console.log('scriptapiauth, req.app.locals: ', req.app.locals);
			//	console.log('scriptapiauth, the credentials: ', req.app.locals.codeStore[req.body.code]);
			var code = req.app.locals.codeStore[req.body.code] || '';

			console.log('scriptapiauth code: ', code);

			var oauth2Client = new OAuth2(...req.app.locals.authentication);
			oauth2Client.getToken(code, function (err, tokens) {
				if (!err) {
					console.log('scriptapiauth, getToken succeded');
					req.session.credentials = tokens;
					req.session.credentials ? 
						delete req.app.locals.codeStore[req.body.code] : 
						console.log('scriptapiauth: could not assign credentials to session');
    			next();
				} else {
					console.log('scriptapiauth getToken failed: ', err);
    			next();
				}
			});
    }
};

module.exports = scriptapiauth;
