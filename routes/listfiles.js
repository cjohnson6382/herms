var express = require('express');
var router = express.Router();    
var google = require('googleapis');
var service = google.drive('v3');
var OAuth2 = google.auth.OAuth2;

router.get('/', function (req, res) {
    req.auth.then(function (resolve) {
        service.files.list({
            auth: req.oauth2Client,
            pageSize: 10,
            fields: "nextPageToken, files(id, name)",
            q: "properties has { key='hermesis_config' and value='true'} "
        }, function(err, resp) {
            if (err) {
                console.log('(/listfiles route) The API returned an error: ' + err);
                return;
            }
            if (resp.files.length == 0) {
                console.log('No files found.');
            }
            else {
                res.send(resp.files);
            }
        });
    });
});

module.exports = router;
