var express = require('express');
var router = express.Router();
var service = require('googleapis').drive('v3');

router.get('/', function (req, res) {
    var service = google.drive('v3');
    var script = google.script('v1');

var tempfile_title = "temp copy " + new Date() + "  " + req.body.id;

var modify_template = function (err, copy_id) {
    var options = {
        auth: req.oauth2Client,
        scriptId: API_SCRIPT_EXECUTION_PROJECT_ID,
        resource: {
           function: 'getDocument',
           parameters: [copy_id, req.body.fields]
        }
    };
    var callback = function (err, resp) {
        if (err) {
            console.log("error using the app script execution api: ", err);
        } else {
            //  what is response to script api call?
            callback(resp.response.result);
        }
    };

    script.scripts.run(options, callback); 
};

var options = {
    auth: req.oauth2Client,
    fileId: req.body.id,
    fields: "id",
    resource: {
        title: tempfile_title,
        description: "archived copy of a contract hermesis created",
        parents: [ folderId ]   
    },    
};

service.files.copy(options, modify_template);

exportFileIdToPdf(copyId, function (fileLocation) {
    result.download(fileLocation, 'stupidfile.pdf', function (err) {
        if (err) {
            console.log('error sending download: ' + err);
        } else {
            console.log('file successfully sent', res.headersSent);
        }
    });
});

});

module.exports = router;
