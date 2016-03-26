"use strict";

//  needed to get the client_secret.json which has the user credentials
var fs = require('fs');
var async = require('async');
var https = require('https');
//  var httprequest = require('request');
var express = require('express');
var multer = require('multer');
var app = express();
var upload = multer({ dest: 'uploads/' });
//  var stream = require('stream');
var bodyParser = require('body-parser');

var urlencodedParser = bodyParser.urlencoded({ extended: false });
//  this is how you get access to all of the google APIs; use it to do all the API calls
var google = require('googleapis');
var mongo = require('mongodb');
var crypto = require('crypto');

var API_SCRIPT_EXECUTION_PROJECT_ID = 'McF6XuivFGhAnZMdFBaeECc74iDy0iCRV';

//  OAuth with the googleapis npm; don't need the separate google auth NPM
var OAuth2 = google.auth.OAuth2;
var oauth2Client;
var authorization_url;

var scopes = [
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/gmail.modify'
];

function generateSessionId (callback) {
    var hash = crypto.createHash('md5');
    //  hashing the date to create a 'unique' value - so bad; 
    //      this should:
    //          get a unique identifier from the DB and return that
    var data = new Date();  
    hash.on('readable', () => {
        var hashed = hash.read();
        if (hashed) {
            console.log('hashed your data', hashed.toString('hex'));
            callback(hashed.toString('hex'));
        }
    });
    hash.write(data.toString());
    hash.end();
}

function SessionObject () {
    this.properties = {
        sessionId: '',
        originalId: '',
        copyId: '',
        pdfPath: '',
        templatefolderPath: '',
        fields: ''
    };

    var that = this;
    generateSessionId(function (generatedId) {
//        console.log("return from generateId: ", generatedId);
        that.properties.sessionId = generatedId;
    });
   
}

SessionObject.update = function (session, updateobject, callback) {
//    for (var key in Object.keys(updateobject)) {
    for (var key in updateobject) {
        if (session.properties.hasOwnProperty(key)) {
//            console.log('SessionObject.update is successful', key);
            session.properties[key] = updateobject[key];
        } else {
            console.log("updateobject used:", updateobject);
        }
    }
    callback(session);
}

var gmailApiHelper = (function () {
    var GMAIL = google.gmail('v1');
    return {
        createAppLabel: function (callback) {
            GMAIL.users.labels.create({
                auth: oauth2Client,
                userId: 'me',
                fields: 'id, name',
                resource: {
                    labelListVisibility: 'labelHide',
                    messageListVisibility: 'hide',
                    name: 'hermesis'
                }
            }, function (err, response) {
                if (err) {
                    console.log('error creating the hermesis label in user inbox', err);
                } else {
                    console.log('successfully created hermesis label in user inbox', response);
                    callback();
                }
            });
        },
        labelEmail: function (messageId, labelId, callback) {
            console.log('labelEmail messageId: ', messageId, labelId);
            GMAIL.users.messages.modify({
                auth: oauth2Client,
                userId: 'me',
                id: messageId,
                resource: {
                    addLabelIds: [labelId]
                }
            }, function (err, response) {
                if (err) {
                    console.log('error labeling the supplied email with Hermesis', err); 
                } else {
                    console.log('email labeled with hermesis: ', response);
                }
            });
        },
        getGmailMessage: function (messageId, callback) {
            GMAIL.users.messages.get({
                auth: oauth2Client,
                userId: 'me',
                id: messageId
            }, function (err, response) {
                if (err) {
                    console.log('error calling gmail API: ', err);
                } else {
                    console.log('gmail api successfully called: ', response);
                    callback(response.id);
                }
            });
        },
        checkForHermesisLabel: function (callback) {
            GMAIL.users.labels.list({
                auth: oauth2Client,
                userId: 'me',
            }, function (err, response) {
                if (err) {
                    console.log('error checking for hermesis label: ', err);
                } else {
//                    console.log('response.labels in checkForHermesisLabel: ', response);
                    var names = {};
                    response.labels.map(function (obj) {
                        names[obj.name] = obj.id;
                    });
                    console.log('names in the checkforhermesislabel function: ', names);
                    var labelnames = Object.keys(names);
                    var hermesis_present = labelnames.indexOf('hermesis');
                    if (hermesis_present === -1) {
                        gmailApiHelper.createAppLabel(function () {
                            console.log('created label');
                            callback(names['hermesis']);
                        });
                    } else {
                        console.log('label already exists');
                        callback(names['hermesis']);
                    }
                }
            });
//  check whether the hermesis label exists, return if it does, create if it doesn't:
//      when you list labels, it returns an array of objects:
//          labelslist.map(function (current) {
//              return current.name;
//          });;


        },
    }
})();

class DbQuery {
    constructor (collection, filter, data) {
        this.collection = this._setcollection(collection);
        this.filter = filter;
        this.data = data;
        DbQuery.initializeDb(function (db) {
            this.db = db;
        });
        const SESSION_COLLECTION = 'session_data';
        const AUTH_COLLECTION = 'stored_auth_tokens';
   }

    static initializeDb (callback) {
        // if the DB is initializd already, do nothing, return DB object
        if (this.db) {
            callback(this.db);
        } else {
           that = this;
           try {
               console.log("initializing the DB");
               var client = mongo.MongoClient;
               var url = 'mongodb://localhost:27017/session_db';
               client.connect(url, function (err, db) {
                   if (err) { 
                       console.log("error connecting to the DB: ", err); 
                       throw new Error(err);
                   } else {
                        db.on('close', function () {
                            db = null;
                        }); 
                        this.db = db; 
                        callback(db);
                   }   
               }); 
           } catch (e) {
               console.log('cannot initialize the DB: ', e); 
           }   
        }   
    }   

    _setcollection (collection) {
        if (collection === 'session') {
           this.collection = DbQuery.SESSION_COLLECTION;
        } else if (collection === 'auth') {
            this.collection = DbQuery.AUTH_COLLECTION;
        } else {
            throw new Error('collection paraeter is not valid; use session or auth');
        }
    }

    query () {
        console.log('this is an abstract method');
    }

    go (callback) {
        DbQuery.initializeDb(function () {
            this.query(callback);
        });
    }

    close (callback) {
        DB.close(false, function (err, result) {
            if (err) {
                console.log('error closing: ', err);
            } else {
                console.log('database is closed', result);
                callback();
            }
        });
    }

    expireSession (filter, callback) {
        this.db.collection(this.collection).deleteOne(filter, callback);
    }
}

class RetrieveQuery extends DbQuery {
    query (callback) {
        try {
            this.db.collection(this.collection).findOne(this.filter, function (err, item) {
                if (err) {
                    throw new Error(err);
                } else {
                    callback(item.session);
                }
            });
        } catch (err) {
            console.log('err in instance of RetrieveQuery.query: ', this.filter, this.collection);
            throw new Error(err);
        }
    }
}

class UpdateQuery extends DbQuery {
    query (callback) {
        try {
            this.db.collection(this.collection).updateOne(this.filter, this.data, {upsert: true}, function (err, results) {
                if (err) {
                    throw new Error(err);
                } else {
                    callback(results.result);
                }
            });
        } catch (err) {
            console.log('UpdateQuery throws err: ', err);
            throw new Error(err);
        }
    }
}

class GetAndSet extends DbQuery {
    constructor (collection, filter, data) {
        super(collection, filter, data);
        this.get = new RetrieveQuery(collection, filter, data);
        this.set = new UpdateQuery(collection, filter. data);
    }

    query (callback) {
        this.get.query(function (getresult) {
            this.set.query(function (setresult) {
                callback(setresult);
            });
        });
    }
}

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
        app.get('/auth', function (req, res) {
            res.writeHead(200, {'Access-Control-Allow-Origin' : '*'});
            var session = new SessionObject();

            set = new UpdateQuery('session', { sessionId: session.properties.sessionId }, { session: session});
            set.query(function () {
                res.end(JSON.stringify({auth_url: authorization_url, session: session.properties.sessionId}));
            });
        });
        app.get('/callback', function (req, res) {
            //  a new session with a sessionId
            oauth2Client.getToken(req.query.code, function (err, token) {
                if (err) {
                    console.log('ERR while getting access token', err);
                }
                oauth2Client.credentials = token;
            });
            res.end('authentication happened');
        });
        app.post('/getfilledtemplate', upload.single(), function (req, res) {
//            console.log("getfilledtemplate session: ", req.body.sessionId);
            var sessionId = req.body.sessionId;
//            console.log('sessionId from background -> getfilledtemplate: ', sessionId); 
            //  execute doc commands to substitute text on the file

            setoriginalid = new GetAndSet('session', {sessionId: sessionId}, { originalId: req.body.id });
            setoriginalid.query(function (result) {
                console.log("set sessionId to something...", result);
            });

            var service = google.drive('v3');
            var script = google.script('v1');
            var fields = req.body.fields;

            setfields new GetAndSet('session', {sessionId: sessionId}, {fields: fields});
            setfields.query(function (result) {
                console.log('set the fields property in session', result);
            });

            var result = res;
            var tempfile_title = "temp copy " + new Date() + "  " + req.body.id;
            
            function fillinCopy (fileId, fields, callback) {
//                console.log('in fillinCopy, fileId is: ', fileId);
//                console.log('in fillinCopy, fields is: ', fields);
                
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
//                                console.log("resp to fillinCopy call: ", resp); 
//                                console.log('resp details: ', resp.error.details);
//                                console.log('resp stacktrace: ', resp.error.details[0].scriptStackTraceElements);
                                callback(resp.response.result);
                            }
                        });
                    }
                });
            }
             
            //  copy the template file into a temp directory

            getTempFolder(function (folderId) {
                settemplatefolderpath = new GetAndSet('session', {sessionId: sessionId}, {templatefolderPath: folderId});
                settemplatefodlerpath.query(function (result) {
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

                        setcopyid = new GetAndSet('session', { sessionId: sessionId }, {copyId: file.id });
                        setcopyid.query(function (result) {
                            console.log("set copyId to: ", result);
                        });

                        fillinCopy(file.id, fields, function (copyId) {
                            //  return the PDF to the extension to be attached to the email
                            exportFileIdToPdf(copyId, function (fileLocation) {
                                setpdfpath = new GetAndSet('session', { sessionId: sessionId }, { pdfPath: fileLocation });
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

        /* app.get('/sent', function (req, res) {}) */
        //  when the email is sent/discarded, return teh appropriate message to the server            
        //  if sent -> archive; if discarded -> delete

        /* app.post('/discarded', function (req, res) {}) */

        app.post('/savemetadata', urlencodedParser, function (req, res) {
            var service = google.drive('v3');
            var JSONlocation;
            var lastmodified;

            var fields = JSON.parse(req.body.metadataitems);
            var docid = req.body.docid;
            //  var sessionId = req.body.sessionId;

            var rs = JSON.stringify({parentid: docid, fields: fields});
            var timestamp = new Date();

            var filename = docid + " -- hermesis template -- " + timestamp.toString() + ".json";

            var fileMetadata = {
                name: filename,
//                parents: ['appDataFolder'],
                properties: {
                    hermesis_config: true,
                }
            };

            var media = {
                mimeType: 'application/json',
                body: rs
            };

            //  this creates the JSON file where all the template's fields are stored
            service.files.create({
                auth: oauth2Client,
                resource: fileMetadata,
                media: media,
                uploadType: 'multipart',
                fields: 'id, modifiedByMeTime, parents, name, fileExtension'
            }, function (err, file) {
                if (err) {
                    console.log('error creating JSON for file| file: ', docid, " err: ", err);
                } else {
                    JSONlocation = file.id;
                    lastmodified = file.modifiedByMeTime;

                    var metadata = {
                       properties: {
                           fields: JSONlocation,
                           jsonlastedit: lastmodified,
                           hermesis_template: true
                       } 
                   }

                   service.files.update({
                       auth: oauth2Client,
                       resource: metadata,
                       fileId: docid
                   }, function (err, file) {
                       if (err) {
                           console.log("error updating metadata", err);
                       } else {
                            console.log("successfully updated metadata: ", file.id);
                            
                            setjsonpath = new GetAndSet('session', { sessionId: sessionId }, { fields: JSONlocation });
                            setjsonpath.query(function (result) {
                               console.log('successfully created the JSON file for template ${req.body.id}: ', result);
                            });

                            res.end(file.id);
                       }
                   })
                }
            })
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
            /*
            if (req.body.hermesislist === true) {
                var query: "properties has { key='hermesis_template' and value='true'} ";
            } else {
                var query: "";
            }
            */
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
        });
        app.post('/emailsent', upload.single(), function (req, res) {
            var service = google.drive('v3');

            var messageId = req.body.messageId;
            var sessionId = req.body.sessionId;
            
//            gmailApiHelper.getGmailMessage(messageId, function (responseId) {
//            })
            gmailApiHelper.checkForHermesisLabel(function (labelid) {
                gmailApiHelper.labelEmail(messageId, labelid, function () {
                    console.log('email has been labled with hermesis');
                    res.end(responseId);
                });
            });
        });

//            console.log('emailsent called: ', messageId);
/*
            gmail.users.messages.get({
                auth: oauth2Client,
                userId: 'me',
                id: messageId
            }, function (err, response) {
                if (err) {
                    console.log('error calling gmail API to get email', err);    
                } else {
                    console.log('emailsent calls gmail api, returns: ', response);
                    res.end(response.id);
                }
*/
                //  response is a users.messages.resource
/*
                service.files.create({
                    auth: oauth2Client,
                    resource: metadata,
                    media: media,
                    uploadType: 'multipart',
                    fields: 'id'
                }, function (err, response) {
                    res.end('id of archive file:', response.id);
                });
*/


//  gmail.users.messages.attachments.get : get attachments for messageId
//  gmail.users.messages.get : get message for messageId
//  gmail.users.messages.modify : change labels for messageId

            //  I need to write a file to the drive archive
            //  I need to hit teh gmail API to get all the info about teh file
            //     in order to write it correctly
        callback();
    },
], function (err, result) {
    if (!err) {
        var options = {
            key : fs.readFileSync('server.enc.key'),
            cert: fs.readFileSync('server.crt')
        }
        https.createServer(options, app).listen(443, function () {
            console.log('Server is started as HTTPS');
        })
    }
});

