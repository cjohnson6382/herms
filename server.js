"use strict";

var fs = require('fs');
var https = require('https');
var express = require('express');
var app = express();
var google = require('googleapis');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

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

//  GLOBAL MODULES  //

//  var multer = require('multer');
//  var upload = multer({ dest: 'uploads/' });
//  var bodyParser = require('body-parser');
//  var urlencodedParser = bodyParser.urlencoded({ extended: false });


//  function genuuid -- moved to modules/util.js

app.use(passport.initialize());
app.use(session({
    genid: function () {
        return genuuid();
    },
    secret: 'hermesisisgrate',
    name: 'hermesis.sid',
    store: new MongoStore({ url: 'mongodb://localhost/hermesis' }),
    maxAge: 1000 * 60 * 60 * 24 * 2,
    resave: false,
    secure: true,
    saveUninitialized: true
}));

passport.serializeUser(function (user, done) {
    done(null, { id: user.id, access_token: user.access_token });
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(null, user);
    });
});

//  routes
var auth = require('./routes/auth.js');
var callback = require('./routes/callback.js');
var getfilledtemplate = require('./routes/getfilledtemplate.js');
var savemetadata = require('./routes/savemetadata.js');
var listfiles = require('./routes/listfiles.js');

var routes = [
    app.use('/auth', auth),
    app.use('/callback', callback),
    app.use('/getfilledtemplate', getfilledtemplate),
    app.use('/savemetadata', savemetadata),
    app.use('/listfiles', listfiles),
];

fs.readFile('./credentials/client_secret_tvbox.json', function (err, content) {
    if (err) {
        console.log('error reading auth information from client_secret_tvbox.json');
    } else {
        
        var promise = Promise.all(routes);
        promise.then(function () {
            var options = {
                key: fs.readFileSync('./credentials/server.enc.key'),
                cert: fs.readFileSynct('./credentials/server.crt')
            };
            
            try {
                https.createServer(options, app.listen(443, function () {
                    console.log('starting the HTTPS server');
                }));
            } catch (e) {
                console.log('error starting server', e);
            }
        
        });

        //  this is the authentication magic; I don't think it passes a URL to the client, which I need right now
        content = JSON.parse(content);
        passport.use(new GoogleStrategy({
            clientID: content.web.client_id,
            clientSecret: content.web.client_secret,
            callbackURL: content.web.redirect_uris[0]
        }, function (access_token, refresh_token, profile, done) {
            done(null, {id: profile.id, access_token: access_token});
        }));
    }
});

//  clearly this goes somewhere else
var API_SCRIPT_EXECUTION_PROJECT_ID = 'McF6XuivFGhAnZMdFBaeECc74iDy0iCRV';

//  on savemetadata:
//  savemeatadata(function (contractlist) {
//    io.emit('contractadded', contractlist);
//  });
