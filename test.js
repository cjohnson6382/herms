//  needed to get the client_secret.json which has the user credentials
var fs = require('fs');
var async = require('async');
var https = require('https');
var express = require('express');
var multer = require('multer');
var app = express();
var upload = multer({ dest: 'uploads/' });

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
    'https://www.googleapis.com/auth/drive.file'
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
                    console.log(content);
                    res.end(content);
                } else {
                    console.log("ERR @ reading index.html", err);
                }
            })
        })
        app.get('/auth', function (req, res) {
            res.redirect(authorization_url);
        });
        app.get('/callback', function (req, res) {
            oauth2Client.getToken(req.query.code, function (err, token) {
                if (err) {
                    console.log('ERR while getting access token', err);
                }
                oauth2Client.credentials = token
            })
            console.log(req.query.code);
             fs.readFile('html/index.html', function (err, content) {
                if (err === null) {
                    res.writeHead(200, {'Content-Type' : 'text/html'});
                    res.end(content);
                } else {
                    console.log("ERR @ reading index.html", err);
                }
            })
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
            console.log("THIS IS THE FILEID THAT IS BEING USED WITH THE API CALL", fileid);
            var service = google.drive('v3');
            console.log(fileid);
            result = service.files.get({
                auth: oauth2Client,
                fileId: fileid,
                fields: "webContentlink",
            }).on('end', function () {
                
            });
            console.log("SENDING TO CLIENT", result);
            res.end(result);
        })
        app.post('/uploadfile', upload.single("uploadedfile"), function (req, res) {
            var service = google.drive('v3');
            var metadata = {
                name: req.file.originalname,
                description: 'this is just a sample upload',
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
                } else {
                    var html = '<br />';
                    for (var i = 0; i < files.length; i++) {
                        var file = files[i];
                        if (file !== null) {
                           html += "<div id=" + file.id  + " onclick='downloadFile(event)'>" + file.name + "</div><br />"
                        }
                    }
                    res.send(html);
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
