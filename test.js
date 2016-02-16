//  needed to get the client_secret.json which has the user credentials
var fs = require('fs');
var async = require('async');
var https = require('https');
var express = require('express');
var multer = require('multer');
var app = express();
var upload = multer({ dest: 'uploads/' });
var readable = require('stream').Readable;

//  this is how you get access to all of the google APIs; use it to do all the API calls
var google = require('googleapis');

//  OAuth with the googleapis npm; don't need the separate google auth NPM
var OAuth2 = google.auth.OAuth2;
var oauth2Client;

var authorization_url;

//  scopes will be used in actual API calls
var scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.appfolder',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/drive.appdata'
];


async.waterfall([
    function (callback) {
        fs.readFile('client_secret_tv.json', function (err, content) {
            if (err === null) {
                callback(null, JSON.parse(content));
            } else { 
                return 
            }
        })        
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
            })
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
            })
        })
        app.get('/auth', function (req, res) {
            res.writeHead(200, {'Access-Control-Allow-Origin' : '*'});
            res.end(authorization_url);
        });
        app.get('/callback', function (req, res) {
            oauth2Client.getToken(req.query.code, function (err, token) {
                if (err) {
                    console.log('ERR while getting access token', err);
                }
                oauth2Client.credentials = token
            })
            res.end("authentication complete");
        });
        app.get('/createfolder', function (req, res) {
            var service = google.drive('v3');
            var metadata = {
                'name': 'testfolder',
                'mimeType': 'application/vnd.google-apps.folder',
                'properties': {
                    hermesis: true
                }
            };
            result = service.files.create({
                auth: oauth2Client,
                resource: metadata,
                fields: 'id'
            })
            res.send("The folder was created with ID", result);
        });
        app.post('/downloadfile', upload.single('id'), function (req, res) {
            var fileid = req.body.id;
            var service = google.drive('v3');
            result = service.files.get({
                auth: oauth2Client,
                fileId: fileid,
                fields: "webContentLink"
            }, function (err, response) {
                res.end(response.webContentLink);
            })
        })
        app.post('/savemetadata', function (req, res) {
            var service = google.drive('v3');
            var JSONlocation;
            var lastmodified;
            var rs = new Readable;

            //  the first part of this deals with the JSON file
            fields = JSON.parse(req.metadataitems); //  docid is the id of the PARENT document
            docid = req.docid;

            //  I don't think this is in JSON format yet; should probably make it so
            rs.push(JSON.stringify({parentid: docid, fields: fields}));

            timestamp = Date.now();
            filename = docid + " -- hermesis template -- " + timestamp + ".json";

            var fileMetadata = {
                name: filename,
                parents: [ 'appDataFolder' ]
            }

            var media = {
                mimeType: 'application/json',
                body: rs
            }

            //  this creates the JSON file
            service.files.create({
                auth: oauth2Client,
                resource: fileMetadata,
                media: media,
                fields: 'id, modifiedByMeDate'
            }, function (err, file) {
                if (err) {
                    console.log('error creating JSON for file| file: ', docid, " err: ", err);
                } else {
                    JSONlocation = file.id;
                    lastmodified = file.modifiedByMeDate;  
                }
            })

            //  from here down we're just adding the JSON file's id to the template
            //  when the template is selected, check whether the json and template 'last modified'
            //      dates are the same; if not, then need to parse the template for fields again
            var metadata = {
                properties: {
                    fields: JSONlocation,
                    jsonlastedit: lastmodified,
                    hermesis: true
                } 
            }

            result = service.files.update({
                auth: oauth2Client,
                resource: metadata,
                fileId: docid,
                resource: metadata
            })

            res.end(result);

        })
        app.post('/uploadfile', upload.single("uploadedfile"), function (req, res) {
            var service = google.drive('v3');
            var metadata = {
                name: req.file.originalname,
                description: 'upload a file that the user selects on an upload dialog',
                properties: {
                    hermesis: true
                } 
            };
            
            result = service.files.create({
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
        //  need to change this to list files that the application has created when desired
        //      some kind of flag, so this function can still be used to access the whole google drive for the user to 'upload' a contract from there
        app.get('/listfiles', function (req, res) {
            var service = google.drive('v3');
            service.files.list({
                auth: oauth2Client,
                pageSize: 10,
                fields: "nextPageToken, files(id, name)",
                q: "properties has { key='hermesis' and value='true' }"
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
