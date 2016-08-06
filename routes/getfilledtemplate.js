var express = require('express');
var router = express.Router();
var google = require('googleapis');
var fs = require('fs');

var API_SCRIPT_EXECUTION_PROJECT_ID = 'McF6XuivFGhAnZMdFBaeECc74iDy0iCRV';

router.get('/', function (req, res) {
    var service = google.drive('v3');
    var script = google.script('v1');

    /*
    flow:
    
    create a copy (return copy's id) -- copy returns a file resource, which has the id on it
    do modification script on copy (return?)
        the script returns the document id for the modified document
    get download link for modified copy?
        what was I doing before to get a PDF? something about exporting...
        format is {resp: dataURL, type: pdf)}
    
    */
    
    var tempfile_title = "temp copy " + new Date() + "  " + req.body.id;
    
    var modify_template = function (err, file_resource) {
        var options = {
            auth: req.oauth2Client,
            scriptId: API_SCRIPT_EXECUTION_PROJECT_ID,
            resource: {
               function: 'getDocument',
               parameters: [file_resource.id, req.body.fields]
            }
        };
        var callback = function (err, resp) {
            if (err) {
                console.log("error using the app script execution api: ", err);
            } else {
                var tempfilename = 'temp/' + dest.id + "-" + Date() + ".pdf";
                var dest = fs.createWriteStream(tempfilename);
            
                var options = {
                  auth: req.oauth2Client,
                  fileId: id,
                  mimeType: 'application/pdf'
                };
            
                service.files.export(options)
                .on('end', function () {
                  res.download(tempfilename, 'contract.pdf', function (err) {
                    if (err) {
                      console.log('(in service.files.export of getfilledtemplate) ' + 
                        'error converting/sending PDF: ', err);
                    } else {
                      console.log('(in service.files.export of getfilledtemplate) ' + 
                        'file successfully converted/sent: ', res.headersSent);
                    }
                  });
                })
                .on('error', function (err) {
                  console.log('error writing PDF to temp file: ', err);
                })
                .pipe(dest);
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
});

module.exports = router;
