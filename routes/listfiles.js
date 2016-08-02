var express = require('express');
var router = express.Router();    
var google = require('googleapis');
var service = google.drive('v3');
var OAuth2 = google.auth.OAuth2;
var oauthProvider = require('../modules/oauthProvider.js');

router.use(oauthProvider);
router.get('/', function (req, res) {
    service.files.list({
        auth: req.oauth2Client,
        pageSize: 10,
        fields: "nextPageToken, files(id, name)",
        q: "properties has { key='hermesis_config' and value='true'} "
    }, function(err, resp) {
        if (err) {
            console.log('(/listfiles route) The API returned an error: ', err);
            return;
        }

        if (resp.files.length == 0) {
            console.log('No files found.');
        }
        else {
            console.log('listfiles successfully executed an API call; congratulations you are competent');
            res.json({ resp: resp.files });
            res.end();
        }
    });
});

module.exports = router;
