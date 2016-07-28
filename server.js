"use strict";

//  functions for doing the gmail API
//  var gmailApiHelper = require('./modules/gmailApiHelper.js').gmailApiHelper;

var genuuid = require('./modules/util.js').genuuid;
var driveUtil = require('./modules/util.js').driveUtil;

//  GLOBAL MODULES  //

var fs = require('fs');
//  var async = require('async');
var https = require('https');
var express = require('express');
//  var multer = require('multer');
var app = express();
//  var upload = multer({ dest: 'uploads/' });
//  var bodyParser = require('body-parser');
//  var urlencodedParser = bodyParser.urlencoded({ extended: false });

//  var google = require('googleapis');

//  socket should only be setup when typeahead is called, if possible, so that session
//      already exists and can be used as key for the socketpool
//  should namespace the socket so that it doesn't conflict with any other sockets
//      that exist or come to exist on gmail

//  setupSockets = function (listener) {
//      listener.sockets.on('connection', function (socket) { 
//          socketpool.socket = socket.id;
//          socket.emit('connected', { message: 'socket connected!' }); 
//          socket.on('disconnect', function () {
//              delete socketpool[/* session.socket  */];
//          });
//      });
//  }
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

//  var sio = require(socket.io);


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
var root = require('./routes/root.js');
var auth = require('./routes/auth.js');
var callback = require('./routes/callback.js');
var getfilledtemplate = require('./routes/getfilledtemplate.js');
var savemetadata = require('./routes/savemetadata.js');
var getfields = require('./routes/getfields.js');
var listfiles = require('./routes/listfiles.js');

var routes = [
    app.use('/', root),
    app.use('/auth', auth),
    app.use('/callback', callback),
    app.use('/getfilledtemplate', getfilledtemplate),
    app.use('/savemetadata', savemetadata),
    app.use('/getfields', getfields),
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


//  var OAuth2 = google.auth.OAuth2;
//  var oauth2Client;
//  var authorization_url;

//  removed scopes var, which is now in auth

//  removed 3 functions here moved to modules/util.js

//  socket.io!
//  var io = require('socket.io');

//  socketIO configuration file?
//      var cfg = '';

//  track?
//      

//  on savemetadata:
//  savemeatadata(function (contractlist) {
//    io.emit('contractadded', contractlist);
//  });
