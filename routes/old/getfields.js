var express = require('express');
var router = express.Router();
var passport = require('passport');
var fs = require('fs');

var google = require('googleapis');
var service = google.drive('v3');
var OAuth2 = google.auth.OAuth2;

var oauth2client = new OAuth2();


//  the server should return the JSON files for all the possible contracts
//      and the JSON files should have all the information needed so that you can
//      call the script that modifies the template 


//  get the JSON configuration file associated with a template's fields
app.post('/getfields', upload.single(), function (req, res) {
    oauth2client.setCredentials({access_token: req.session.passport.user.access_token});    

    var service = google.drive('v3');
    service.files.get({
        auth: oauth2client,
        fileId: req.body.id,
        fields: "properties(fields)"
    }, function (err, file) {
        if (err) {
            console.log("error getting the JSON file from drive: ", err);
        } else {
            service.files.get({
                auth: oauth2client,
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
