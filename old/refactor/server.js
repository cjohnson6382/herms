"use strict";

//  functions for doing the gmail API
var gmailApiHelper = require('./modules/gmailApiHelper.js').gmailApiHelper;

//  GLOBAL MODULES  //

//  needed to get the client_secret.json which has the user credentials
var fs = require('fs');
var async = require('async');
var https = require('https');
var express = require('express');
var multer = require('multer');
var app = express();
var upload = multer({ dest: 'uploads/' });
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });

var google = require('googleapis');

//  refactor code
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

function genuuid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + 
        s4() + '-' + s4() + '-' + s4() + s4() + s4();           
}

app.use(session({
    genid: function () {
        return genuuid();
    },
    secret: 'hermesisisgrate',
    name: 'hermesis.sid',
    store: new MongoStore({ url: 'mongodb://localhost/hermesis' }),
    maxAge: 1000 * 60 * 60 * 24 * 2,
    secure: true,
    saveUninitialized: true
}));

var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').Oauth2Strategy;

passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: ""
    }, function (access_token, refresh_token, profile, done) {
        
    }
));

//  routes
var root = require('./routes/');
var auth = require('./routes/');
var callback = require('./routes/');
var getfilledtemplate = require('./routes/');
var savemetadata = require('./routes/');
var getfiles = require('./routes/');
var listfiles = require('./routes/');

var routes = [
    app.use('/', root),
    app.use('/auth', auth),
    app.use('/callback', callback),
    app.use('/getfilledtemplate', getfilledtemplate),
    app.use('/savemetadata', savemetadata),
    app.use('getfiles', getfiles),
    app.use('/listfiles', listfiles),
];

var promise = Promise.all(routes);

promise.then(function () {
    var options = {
        key: fs.readFileSync(''),
        cert: fs.readFileSynct('')
    };
    
    try {
        https.createServer(options, app.listen(443, function () {
            console.log('starting the HTTPS server');
        }));
    } catch (e) {
        console.log('error starting server', e);
    }

});

var API_SCRIPT_EXECUTION_PROJECT_ID = 'McF6XuivFGhAnZMdFBaeECc74iDy0iCRV';

var OAuth2 = google.auth.OAuth2;
var oauth2Client;
var authorization_url;

var scopes = [
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.profile'
];

function getTempFolder (callback) {
    var service = google.drive('v3');
    var query = 'properties has { key="hermesis_folder" and value="true" } and mimeType="application/vnd.google-apps.folder" and name="temp"';
    service.files.list({
        auth: oauth2Client,
        q: query,
        fields: 'files/id'
    }, function (err, folderlist) {
        if (err) {
            console.log('could not get the temp folder (creating new one)', err);
            createTempFolder(function (folderid) {
                callback(folderid);
            });
        } else {
            callback(folderlist.files[0].id);
        }   
    }); 
}

function createTempFolder (callback) {
    var service = google.drive('v3');
    var metadata = { 
        'name': 'temp',
        'mimeType': 'application/vnd.google-apps.folder',
        'properties': {
            hermesis_folder: true
        }   
    };  
    service.files.create({
        auth: oauth2Client,
        resource: metadata,
        fields: 'id'
    }, function (err, folder) {
        if (err) {
            console.log('error creating temp folder: ', err);
        } else {
            callback(folder.id);
        }   
    }); 
}

function exportFileIdToPdf (id, callback) {
    var service = google.drive('v3');
    var tempfilename = 'temp/' + id + "-" + Date() + ".pdf";
    var dest = fs.createWriteStream(tempfilename);
//    console.log("dest path and filename: " + tempfilename);

    service.files.export({
        auth: oauth2Client,
        fileId: id, 
        mimeType: 'application/pdf'
    })  
    .on('end', function () {
//       console.log('done writing PDF to temp file');
        callback(tempfilename);
    })  
    .on('error', function (err) {
        console.log('error writing PDF to temp file: ', err);
    })  
    .pipe(dest);
}

async.waterfall([
    function (callback) {
        fs.readFile('client_secret_tv.json', function (err, content) {
            if (err === null) {
                callback(null, JSON.parse(content));
            } else { 
                return;
            }
        });    
    },
    function (credentials, callback) {
        var clientSecret = credentials.web.client_secret;
        var clientId = credentials.web.client_id;
        var redirectUrl = credentials.web.redirect_uris[0];

        oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
        callback(null, oauth2Client);
    },
    function (oauth2Client, callback) {
        authorization_url = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: scopes
            });
        callback(null, authorization_url);
    },
    function (authorization_url, callback) {
        app.get('/', function (req, res) {
            fs.readFile('html/index.html', function (err, content) {
                if (err === null) {
                    res.writeHead(200, {'Content-Type' : 'text/html'});
                    res.end(content);
                } else {
                    console.log("ERR @ reading index.html", err);
                }
            });
        });
        app.post('/auth', upload.single(), function (req, res) {
            res.writeHead(200, {'Access-Control-Allow-Origin' : '*'});
            var session = new SessionObject();
            var googleid = req.body.googleid;
            session.properties.googleid = googleid;
            //  search the auth collection for googleid; if it exists, get the corresponding token and set it as the oauth2Client
            //  should also find some way to test whether the key is still good; if it's no good, remove it from the DB -- Later
            var getauthtoken = new RetrieveQuery('auth', { id: googleid }, {});
            getauthtoken.query(function (retrieved) {
                //  console.log('retrieved from auth db query in /auth: ', retrieved);
                try {
//                    console.log('retrieved.id: ', retrieved.id, typeof retrieved.id, ' googleid', googleid, typeof googleid);
                    if (retrieved.id !== googleid) {
                        //  console.log('retrieved does not match client googleid: ', retrieved);
                        throw new Error('DB query did not find a matching google id');
                    } else {
                        //  console.log('\n\n\nretrieved in the /auth endpoint: ', retrieved);
                        console.log('found token for user, using it');
                        oauth2Client.credentials = retrieved.properties.token;
                        var auth_url = null;
                        google.options({ auth: auth});
                    }
                } catch (e) {
                    console.log('no stored token; get a new one: ', e);
                    var auth_url = authorization_url;
                } finally {
                    var set = new UpdateQuery('session', { id: session.properties.sessionId }, session);
                    //  console.log('session in /auth, finally clause: ', session);
                    set.query(session, function () {
                        res.end(JSON.stringify({auth_url: auth_url, session: session.id}));
                    });
                }
            });
        });
        app.get('/callback', function (req, res) {
            //  a new session with a sessionId
            oauth2Client.getToken(req.query.code, function (err, token) {
                if (err) {
                    console.log('ERR while getting access token', err);
                }
                console.log('token returned by getToken in /callback: ', token);
                oauth2Client.credentials = token;
                var emptyauth = new AuthObject();

                //  this doesn't have a 'sub' property
                var oauth2 = google.oauth2('v2');
                oauth2.userinfo.v2.me.get({
                    auth: oauth2Client,
                    fields: 'id'
                //    access_token: oauth2Client
                }, function (err, response) {
                    if (err) {
                        console.log('\n\n\nerr getting user id', err);
                    } else {
                        emptyauth.id = response.id;
                        //  console.log('emptyauth.id in /callback: ', emptyauth.id);
                        emptyauth.properties.id = response.id;
                        emptyauth.properties.token = token;
                        var setauthtoken = new UpdateQuery('auth', { id: response.id }, emptyauth);

                        //  console.log('emptyauth in /callback b/f DB insertion: ', emptyauth);

                        setauthtoken.query(emptyauth, function (updated) {
                            //  console.log('inserted new auth object into DB: ', updated);
                            res.end('authentication happened');
                        });
                    }
                });
            });
        });
        app.post('/getfilledtemplate', upload.single(), function (req, res) {
            var service = google.drive('v3');
            var script = google.script('v1');
            var fields = req.body.fields;
            var sessionId = req.body.sessionId;
            
            console.log('sessionId from background -> getfilledtemplate: ', sessionId); 
            //  execute doc commands to substitute text on the file

            var dbobject = new DbObject();
            dbobject.properties = {fields: fields, id: sessionId, originalId: req.body.id};
            dbobject.id = sessionId;

            var setfields = new GetAndSet('session', { id: sessionId }, dbobject);
            setfields.query(function (result) {
                console.log('set the fields and originalId properties in session', result);
            });

            var result = res;
            var tempfile_title = "temp copy " + new Date() + "  " + req.body.id;
            
            function fillinCopy (fileId, fields, callback) {
                //  console.log('in fillinCopy, fileId is: ', fileId);
                //  console.log('in fillinCopy, fields is: ', fields);
                 
                service.files.get({
                    auth: oauth2Client,
                    fileId: fileId,
                    fields: "id"
                }, function (err, file) {
                    if (err) {
                        console.log("error getting the file from drive: ", err); 
                    } else {
//                        console.log('returned from API get in fillinCopy: ', file);
                        script.scripts.run({
                            auth: oauth2Client,
                            scriptId: API_SCRIPT_EXECUTION_PROJECT_ID,
                            resource: {
                               function: 'getDocument',
                               parameters: [file.id, fields]
                            }
                        }, function (err, resp) {
                            if (err) {
                                console.log("error using the app script execution api: ", err);    
                            } else {
                                console.log("\n\n\nresp to fillinCopy call: ", resp); 
                                //  console.log('resp details: ', resp.error.details);
                                //  console.log('resp stacktrace: ', resp.error.details[0].scriptStackTraceElements);
                                callback(resp.response.result);
                            }
                        });
                    }
                });
            }
             
            //  copy the template file into a temp directory

            getTempFolder(function (folderId) {

                var dbobject = new DbObject();
                dbobject.properties = { id: sessionId, templatefolderPath: folderId };
                dbobject.id = sessionId;

                var settemplatefolderpath = new GetAndSet('session', { id: sessionId }, dbobject);
                settemplatefolderpath.query(function (result) {
                    console.log("set templatefolderPath to: ", result);
                });

                service.files.copy({
                    auth: oauth2Client,
                    fileId: req.body.id,
                    fields: "id",
                    resource: {
                        title: tempfile_title,
                        description: "copy of a template file for app use; do not modify",
                        parents: [folderId]
                    }}, function (err, file) {
                        if (err) {
                            console.log("error copying the template file: " + err);
                        }

                        var dbobject = new DbObject();
                        dbobject.properties = { id: sessionId, copyId: file.id };
                        dbobject.id = sessionId;

                        var setcopyid = new GetAndSet('session', { id: sessionId }, dbobject);
                        setcopyid.query(function (result) {
                            console.log("set copyId to: ", result);
                        });

                        fillinCopy(file.id, fields, function (copyId) {
                            //  return the PDF to the extension to be attached to the email
                            exportFileIdToPdf(copyId, function (fileLocation) {
                                var dbobject = new DbObject();
                                dbobject.properties = { id: sessionId, pdfPath: fileLocation };
                                dbobject.id = sessionId;

                                var setpdfpath = new GetAndSet('session', { id: sessionId }, dbobject);
                                setpdfpath.query(function (result) {
                                    console.log("set pdfPath to", result);
                                });

                                result.download(fileLocation, 'stupidfile.pdf', function (err) {
                                    if (err) {
                                        console.log('error sending download: ' + err);
                                    } else {
                                        console.log('file successfully sent', res.headersSent);
                                    }
                                }); 
                            });
                        });
                    }
                );
            });
        });

        //
        //  what the hell does this do? I think it creates the hermesis contracts on a google drive, but what calls it?
        //


        app.post('/savemetadata', urlencodedParser, function (req, res) {
            var service = google.drive('v3');
            var JSONlocation;
            var lastmodified;


            var data = prepareData(JSON.parse(req.body.metadataitems), req.body.docid);
            
            service.files.create({
                auth: oauth2Client,
                resource: data.metadata,
                media: data.media,
                uploadType: 'multipart',
                fields: 'id, modifiedByMeTime, parents, name, fileExtension'
            }, updateJson);

            var prepareData = function (fields, documentId) {
              var body = JSON.stringify({parentid: docid, fields: fields});
              var timestamp = new Date();
              var filename = docid + " -- hermesis template -- " + timestamp.toString() + ".json";
              
              var metadata = {
                name: filename,
                properties: {
                  hermesis_config: true,
                }
              };
            
              var media = {
                  mimeType: 'application/json',
                  body: body
              };
              
              return { metadata: metadata, media: media };
            };
            
            var updateJson = function (err, file) {
              if (err) {
                console.log('error creating JSON for file| file: ', docid, " err: ", err);
              } else {
                var metadata = {
                   properties: {
                       fields: file.id,
                       jsonlastedit: file.modifiedByMeTime,
                       hermesis_template: true
                   }
                };
                
                service.files.update({
                   auth: oauth2Client,
                   resource: metadata,
                   fileId: docid
                }, updateDb);
              }
            };
            
            var updateDb = function (err, file) {
              if (err) {
                 console.log("error updating metadata", err);
              } else {
                //  DbObject is a class created in the DB module; use node's include() to keep track?
                var dbobject = new DbObject();
                dbobject.properties = { id: sessionId, fields: JSONlocation };
                dbobject.id = sessionId;
            
                setjsonpath = new GetAndSet('session', { id: sessionId }, { fields: JSONlocation });
                setjsonpath.query(function (result) {
                   console.log('successfully created the JSON file for template ${req.body.id}: ', result);
                });
            
                res.end(file.id);
              }
            };

        });
        //  get the JSON configuration file associated with a template's fields
        app.post('/getfields', upload.single(), function (req, res) {
            var service = google.drive('v3');
            service.files.get({
                auth: oauth2Client,
                fileId: req.body.id,
                fields: "properties(fields)"
            }, function (err, file) {
                if (err) {
                    console.log("error getting the JSON file from drive: ", err); 
                } else {
                    service.files.get({
                        auth: oauth2Client,
                        alt: 'media',
                        fileId: file.properties.fields,
                        fields: 'id'
                    }, function (err, file) {
                        if (err) {
                            console.log("error in getfields call to API: ", err);
                        } else {
                            res.end(JSON.stringify(file.fields));
                        }
                    }); 
                }
            })
        });
        app.get('/listfiles', function (req, res) {
            var service = google.drive('v3');
            service.files.list({
                auth: oauth2Client,
                pageSize: 10,
                fields: "nextPageToken, files(id, name)",
                q: "properties has { key='hermesis_template' and value='true'} "
            }, function(err, response) {
                if (err) {
                    console.log('The API returned an error: ' + err);
                    return;
                }
                var files = response.files;
                if (files.length == 0) {
                    console.log('No files found.');
                } 
                else {
                    res.send(response.files);
                }
            });
        });/*
        app.post('/emailsent', upload.single(), function (req, res) {
            var service = google.drive('v3');

            var messageId = req.body.messageId;
            var sessionId = req.body.sessionId;
            
            gmailApiHelper.checkForHermesisLabel(oauth2Client, function (labelid) {
                gmailApiHelper.labelEmail(oauth2Client, messageId, labelid, function () {
                    console.log('email has been labled with hermesis');
                    res.end(responseId);
                });
            });
        });*/
       callback();
    },
], function (err, result) {
    if (!err) {
        var options = {
            key : fs.readFileSync('server.enc.key'),
            cert: fs.readFileSync('server.crt')
        };
        https.createServer(options, app).listen(443, function () {
            console.log('Server is started as HTTPS');
        })
    }
});
