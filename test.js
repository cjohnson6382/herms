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

//  OAuth with the googleapis npm; don't need the separate google auth NPM
var OAuth2 = google.auth.OAuth2;
var oauth2Client;

var authorization_url;
// var config_folder;

var API_SCRIPT_EXECUTION_PROJECT_ID = 'McF6XuivFGhAnZMdFBaeECc74iDy0iCRV';

//  delete me
//var TEMP_FOLDER = "placeholder for the temp folder's id";

var scopes = [
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/gmail.modify'
];

/////////////////////////////////////
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

//  you have to create a DB named session_db before you can use this code;
//      creating a DB in the mongo shell is easy: 'use session_db' will create the DB
//      and select it if it doesn't exist already
var dbCaller = (function () {
    var COLLECTION;
    var DB;
    var COLLECTION_NAME = 'session_data'; 
    return {
        initializeDb: function (callback) {
            that = this;
            try {
                console.log("initializing the DB");
                var client = mongo.MongoClient;
                var url = 'mongodb://localhost:27017/session_db';
                client.connect(url, function (err, db) {
                    if (err) { 
                        console.log("error connecting to the DB: ", err); 
                        throw err;
                    } else {
                        DB = db;
                        that.getCollection(DB, COLLECTION_NAME, function (collection) {
                           console.log("getCollection returns a collection object");
                        });
                    }
                });
            } catch (e) {
                console.log('cannot initialize the DB: ', e);
            }       
        },
//
        createCollection: function (db, collection_name, callback) {
            db.createCollection(collection_name, function (err, collection) {
                if (err) {
                    console.log("error creating collection: ", err);
                } else {
                    console.log("collection: ", collection.constructor);    
                    callback();
                }
            }); 
        },
//
        getCollection: function (db, collection_name, callback) {
            try {
                COLLECTION = db.collection(collection_name);
//                console.log("COLLECTION after assignment: ", COLLECTION);
                callback(COLLECTION);
            } catch (e) {
                console.log("collection session_data does not exist: ", e);
                this.createCollection(collection_name, function () {
                    COLLECTION = db.collection(collection_name);
                    callback(COLLECTION);
                });
            }
        },
//
        checkWhetherInitialized: function (callback) {
            try {
                if (!COLLECTION) { 
                    throw 'COLLECTION not set... setting it now' 
                } else { callback() }
            } catch (e) {
                console.log("no collection object set; initializing DB", e);
                this.initializeDb(callback);
            }
        },
//
        sessionUpdate: function (session, callback) {
            //  update an existing db entry
            this.checkWhetherInitialized(function () {
                var filter = {sessionId: session.properties.sessionId};
                var data = { $set: {sessionId: session.properties.sessionId, session: session} };
//                console.log("parts of the query:", filter, data);
                COLLECTION.updateOne(filter, data, {upsert: true}, function (err, results) {
                    if (err) {
                        console.log("error updating DB: ", err)
                    } else {
                        //  console.log("updated sessionId, results are: ", results.result);
                        callback(results.result);
                    }
                });
            });
        }, 
//
        sessionRetrieve: function (sessionId, callback) {
            this.checkWhetherInitialized(function () {
//                console.log("this is the session ID used for sessionRetrieve: ", sessionId);
                try {
                    COLLECTION.findOne({'sessionId': sessionId}, function (err, item) {
                        if (err) {
                            console.log("error retrieving from DB: ", err);
                        } else {    
//                            console.log("DB response to the DB query: ", item);
                            callback(item.session);
                        }
                    });
                } catch (e) {
                    console.log("collection.findOne failed: ", e);
                }
            });
        },
//
        expireSession: function (sessionId, callback) {
            this.checkWhetherInitialized(function () {
                //  there is no column named sessionId; need to do that
                COLLECTION.deleteOne({sessionId: session.sessionId}, callback);
            })
        },
//
        getAndSet: function (sessionId, updateobject, callback) {
            var that = this;
//            console.log('ID used for getAndSet: ', sessionId);
            try {
                that.sessionRetrieve(sessionId, function (retrievedsession) { 
//                    console.log("session retrieved in getAndSet: ", retrievedsession);
                    SessionObject.update(retrievedsession, updateobject, function (finalsession) {
//                        console.log('getAndSet: finalsession inserted: ', finalsession);
                        that.sessionUpdate(finalsession, function (updatestatus) {
//                           console.log('status of sessionUpdate when getAndSet calls:', updatestatus);
                            callback();
                        });               
                    });
                });
            } catch(e) {
                console.log('the error in sessionRetrieve was not nonexistant', e);
            }
        },
//
        closeDb: function (callback) {
            DB.close(false, function (err, result) {
                if (err) {
                    console.log('error closing: ', err);
                } else {
                    console.log('database is closed', result);
                    callback();
                }
            });
        }
    };
})();


//////////////////////////////////////
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
            dbCaller.sessionUpdate(session, function (sessionobject) {
//                console.log('session successfully created in DB: ', sessionobject);
//                console.log("session returned to the client:", session.properties.sessionId);
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

            dbCaller.getAndSet(sessionId, { originalId: req.body.id }, function () {
                console.log("set sessionId to something...", req.body.id);
            });

            var service = google.drive('v3');
            var script = google.script('v1');
            var fields = req.body.fields;

            dbCaller.getAndSet(sessionId, { fields: fields }, function () {
                console.log('set the fields property in session');
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
                dbCaller.getAndSet(sessionId, {templatefolderPath: folderId}, function () {
                    console.log("set templatefolderPath to: ", folderId);
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
                        dbCaller.getAndSet(sessionId, { copyId: file.id }, function () {
                            console.log("set copyId to: ", file.id);
                        });
                        
//                        console.log('file.id being passed to fillinCopy: ', file.id);
 
                        fillinCopy(file.id, fields, function (copyId) {
                            //  return the PDF to the extension to be attached to the email
                            exportFileIdToPdf(copyId, function (fileLocation) {
                                dbCaller.getAndSet(sessionId, { pdfPath: fileLocation }, function () {
//                                    console.log("set pdfPath to", fileLocation);
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
                           dbCaller.getAndSet(sessionId, { fields: JSONlocation }, function () {
                               console.log('successfully created the JSON file for template ${req.body.id}: ', JSONlocation);
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

