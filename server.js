"use strict";

var fs = require('fs');
var https = require('https');
var express = require('express');
var app = express();
var google = require('googleapis');


var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var io = require('socket.io');

//  for using pug templates
app.set('view engine', 'pug');
app.set('views', './views');

app.locals.codeStore = {};

var setAuth = function () {
	fs.readFile('./credentials/client_secret_tv.json', function (err, content) {
	if (err) {
			console.log('error reading client_secret_tv.json: ', err);
		} else {
			var credentials = JSON.parse(content.toString('utf8'));
			app.locals.authentication = [
				credentials.web.client_id,
				credentials.web.client_secret,
				credentials.web.redirect_uris[0]
			];
		}
	});
};

//  var genuuid = require('./modules/util.js').genuuid;
var genuuid = function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + '-' + s4() + s4() + s4();
};

//  driveUtil is to do some complicated dance to get the final PDF
var driveUtil = require('./modules/util.js').driveUtil;

//  var multer = require('multer');
//  var bodyParser = require('body-parser');
//  var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(session({
    genid: function () {
        return genuuid();
    },
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 2,
        secure: true
    },
    secret: 'hermesisisgrate',
    name: 'hermesis.sid',
    store: new MongoStore({ url: 'mongodb://localhost/hermesis' }),
    resave: true,
    secure: true,
    saveUninitialized: true
}));

var callback = require('./routes/callback.js');
var listfiles = require('./routes/listfiles.js');
var getfilledtemplate = require('./routes/getfilledtemplate.js');
var savemetadata = require('./routes/savemetadata.js');

var iframe = require('./routes/iframe.js');

var routes = [
    app.use('/callback', callback),
    app.use('/listfiles', listfiles),
    app.use('/getfilledtemplate', getfilledtemplate),
    app.use('/savemetadata', savemetadata),
		app.use('/iframe', iframe),
		setAuth()
];

var server;
var listener;

var promise = Promise.all(routes);
promise.then(function () {
    var options = {
        key: fs.readFileSync('./credentials/server.enc.key'),
        cert: fs.readFileSync('./credentials/server.crt')
    };
   
    try {
        server = https.createServer(options, app).listen(443, function () {
            console.log('starting the HTTPS server');
        });
    } catch (e) {
        console.log('error starting server', e);
    }

});


listener = io.listen(server);
listener.sockets.on('connection', function (socket) {
    socket.on('clientid', function (data) {
        console.log(data);
    });
    //  on connection, storethe client id?
    //      how is the server going to know where to transmit a response?
    //      create a socket pool and associate something that's consistent
    //          on the client req object with the socket.... a name? random id?
})

//  on savemetadata:
//  savemeatadata(function (contractlist) {
//    io.emit('contractadded', contractlist);
//  });

module.exports = app
