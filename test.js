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

//  fix me fix me fix me !!!!
var TEMP_FOLDER = "placeholder for the temp folder's id";

var scopes = [
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/documents'
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
        console.log("return from generateId: ", generatedId);
        that.properties.sessionId = generatedId;
    });
   
    var update = function (updateobject) {
        for (var key in Object.keys(updateobject)) {
            if (this.properties.hasOwnProperty(key)) {
                this.properties[key] = updateobject[key];
            } else {
                console.log("properties in this session does not contain the key ${key}");
            }
        }
    }
}


//  MAKE SURE TO CREATE THE DB**************************************
var dbCaller = (function () {
    var COLLECTION;
    var DB;
    
    return {
        initializeDb: function (callback) {
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
                        DB.createCollection('session_data', function (err, collection) {
                            if (err) { 
                                console.log("error initializing DB: ", err); 
                            } else {
                                COLLECTION = collection;
                                callback();
                            }
                        });
                    }
                });
            } catch (e) {
                console.log('cannot initialize the DB: ', e);
            }       
        },
//
        checkWhetherInitialized: function (callback) {
            try {
                if (!COLLECTION) { 
                    throw 'COLLECTION not set... setting it now' 
                } else { callback() }
            } catch (e) {
                console.log(e);
                this.initializeDb(callback);
            }
        },
//
        sessionUpdate: function (session, callback) {
            //  update an existing db entry
            this.checkWhetherInitialized(function () {
                var filter = {sessionId: session.sessionId};
                var data = { $set: {sessionId: session.sessionId, session: session} };
                COLLECTION.updateOne(filter, data, {upsert: true}, function (err, results) {
                    if (err) {
                        console.log("error updating DB: ", err)
                    } else {
                        console.log("updated ${sessionId} with new data: ${session}; result is (1 is good): ${results.result.ok}");
                        callback();
                    }
                });
            });
        }, 
//
        sessionRetrieve: function (sessionId, callback) {
            this.checkWhetherInitialized(function () {
                COLLECTION.findOne(sessionId, function (err, item) {
                    if (err) {
                        console.log("error retrieving ${sessionId} from DB: ", err);
                    } else {
                        callback(item.session);
                    }
                });
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
            try {
                this.sessionRetrieve(sessionId, function (retrievedsession) {
                    retrievedsession.update(updateobject, function (finalsession) {
                        this.sessionUpdate(finalsession, function () {
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
            console.log('could not get the temp folder', err);
            callback("error");
        } else {
            console.log("folderlist: ", folderlist.files);
            //  put temp id in database session object
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
    console.log("dest path and filename: " + tempfilename);

    service.files.export({
        auth: oauth2Client,
        fileId: id, 
        mimeType: 'application/pdf'
    })  
    .on('end', function () {
        console.log('done writing PDF to temp file');
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
            res.end(authorization_url);
        });
        app.get('/callback', function (req, res) {
            //  a new session with a sessionId
            var session = new SessionObject();
            oauth2Client.getToken(req.query.code, function (err, token) {
                if (err) {
                    console.log('ERR while getting access token', err);
                }
                oauth2Client.credentials = token;

                getTempFolder(function (folderId) {
                    dbCaller.sessionRetrieve(session.sessionId, function (sessionobject) {
                        if (folderId === 'error') {
                            createTempFolder(function (newfolderId) {
                                dbCaller.getAndSet(session.sessionId, {templatefolderPath: newfolderId}, function () {
                                    return;  
                                });
                            });
                        } else {
                            dbCaller.getAndSet(session.sessionId, {templatefolderPath: folderId}, function () {
                                return;  
                            });
                        }
                    });
                });
            });
            res.end(session.sessionId);
        });
        app.post('/getfilledtemplate', upload.single(), function (req, res) {
            var sessionId = req.body.sessionId;
            
            //  execute doc commands to substitute text on the file

            dbCaller.getAndSet(sessionId, { originalId: req.body.id }, function () {
                console.log("set ${sessionId} with originalId to ${req.body.id}");
            });

            var service = google.drive('v3');
            var script = google.script('v1');
            var fields = req.body.fields;
            var result = res;
            var tempfile_title = "temp copy " + new Date() + "  " + req.body.id;
            
            function fillinCopy (fileId, callback) {
                service.files.get({
                    auth: oauth2Client,
                    fileId: fileId,
                    fields: "id"
                }, function (err, file) {
                    if (err) {
                        console.log("error getting the file from drive: ", err); 
                    } else {
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
                                console.log("resp to script call: ", resp); 
                                callback(resp.response.result);
                            }
                        });
                    }
                });
            }
             
            //  copy the template file into a temp directory
            service.files.copy({
                auth: oauth2Client,
                fileId: req.body.id,
                fields: "id",
                resource: {
                    title: tempfile_title,
                    description: "copy of a template file for app use; do not modify",
                    parents: [TEMP_FOLDER]
                }}, function (err, file) {
                    if (err) {
                        console.log("error copying the template file: " + err);
                    }
                    dbCaller.getAndSet(session.sessionId, { copyId: file.id }, function () {
                        console.log("set ${session.sessionId} copyId to ${file.id}");
                    });

                    fillinCopy(file.id, function (copyId) {
                        //  return the PDF to the extension to be attached to the email
                        exportFileIdToPdf(copyId, function (fileLocation) {
                            dbCaller.getAndSet(session.sessionId, { pdfPath: fileLocation }, function () {
                                console.log("set ${session.sessionId} with pdfPath to ${fileLocation}");
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
                            console.log(err);
                        } else {
                            res.end(JSON.stringify(file.fields));
                        }
                    }); 
                }
            })
        });
        //  need to change this to list files that the application has created when desired
        //      some kind of flag, so this function can still be used to access the whole google drive for the user to 'upload' a contract from there
        app.get('/listfiles', function (req, res) {
            var service = google.drive('v3');
            //  this is to so that you can list just hermesis files or all files in case
            //      I include a way to convert a document to a template inside the extension
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

/*
        //  deletion candidate
        app.get('/createfolder', function (req, res) {
            var service = google.drive('v3');
            var metadata = {
                'name': 'testfolder',
                'mimeType': 'application/vnd.google-apps.folder',
                'properties': {
                    hermesis_folder: true
                }
            };
            var result = service.files.create({
                auth: oauth2Client,
                resource: metadata,
                fields: 'id'
            });
            res.send("The folder was created with ID", result);
        });
        //  deletion candidate
        app.post('/downloadfile', upload.single('id'), function (req, res) {
            var fileid = req.body.id;
            var service = google.drive('v3');
            service.files.get({
                auth: oauth2Client,
                fileId: fileid,
                fields: "webContentLink"
            }, function (err, response) {
                if (err) {
                    console.log("error downloading from Drive: ", err);        
                } else {
                    res.end(response.webContentLink);
                }
            });
        });
*/

        //  deletion candidate
/*
        app.post('/uploadfile', upload.single("uploadedfile"), function (req, res) {
            var service = google.drive('v3');
            var metadata = {
                name: req.file.originalname,
                description: 'upload a file that the user selects on an upload dialog',
                properties: {
                    hermesis_template: true
                } 
            };
            
            service.files.create({
                auth: oauth2Client,
                uploadType: 'multipart',
                resource: metadata,
                media: {
                    mimeType: req.file.mimetype, 
                    body: fs.createReadStream(req.file.path)
                }
            });
            console.log(req.file);
            res.end("file saved to Google Drive");
        });
*/  

