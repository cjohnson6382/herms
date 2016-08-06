"use strict";

var fs = require('fs');
var https = require('https');
var express = require('express');
var app = express();
var google = require('googleapis');

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);


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

var routes = [
    app.use('/callback', callback),
    app.use('/listfiles', listfiles),
    app.use('/getfilledtemplate', getfilledtemplate),
    app.use('/savemetadata', savemetadata),
];


var promise = Promise.all(routes);
promise.then(function () {
    var options = {
        key: fs.readFileSync('./credentials/server.enc.key'),
        cert: fs.readFileSync('./credentials/server.crt')
    };
   
    try {
        https.createServer(options, app).listen(443, function () {
            console.log('starting the HTTPS server');
        });
    } catch (e) {
        console.log('error starting server', e);
    }

});

//  on savemetadata:
//  savemeatadata(function (contractlist) {
//    io.emit('contractadded', contractlist);
//  });
