var express = require('express');
var router = express.Router();
var service = require('googleapis').drive('v3');

router.post('/', upload.single(), function (req, res) {
    var service = google.drive('v3');
    var script = google.script('v1');
    var fields = req.body.fields;
    var sessionId = req.body.sessionId;


///////////////
    console.log('sessionId from background -> getfilledtemplate: ', sessionId);
    //  execute doc commands to substitute text on the file

    var dbobject = new DbObject();
    dbobject.properties = {fields: fields, id: sessionId, originalId: req.body.id};
    dbobject.id = sessionId;

    var setfields = new GetAndSet('session', { id: sessionId }, dbobject);
    setfields.query(function (result) {
        console.log('set the fields and originalId properties in session', result);
    });
///////////////




    var result = res;
    var tempfile_title = "temp copy " + new Date() + "  " + req.body.id;

    function fillinCopy (fileId, fields, callback) {
        //  console.log('in fillinCopy, fileId is: ', fileId);
        //  console.log('in fillinCopy, fields is: ', fields);
        service.files.get({
            auth: oauth2Client,
            fileId: fileId,
            fields: "id"
        }, function (err, file) {
            if (err) {
                console.log("error getting the file from drive: ", err);
            } else {
                //  console.log('returned from API get in fillinCopy: ', file);
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
                        console.log("\n\n\nresp to fillinCopy call: ", resp);
                        //  console.log('resp details: ', resp.error.details);
                        //  console.log('resp stacktrace: ', resp.error.details[0].scriptStackTraceElements);
                        callback(resp.response.result);
                    }
                });
            }
        });
    }

    //  copy the template file into a temp directory
    getTempFolder(function (folderId) {

        var dbobject = new DbObject();
        dbobject.properties = { id: sessionId, templatefolderPath: folderId };
        dbobject.id = sessionId;

        var settemplatefolderpath = new GetAndSet('session', { id: sessionId }, dbobject);
        settemplatefolderpath.query(function (result) {
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

                var dbobject = new DbObject();
                dbobject.properties = { id: sessionId, copyId: file.id };
                dbobject.id = sessionId;

                var setcopyid = new GetAndSet('session', { id: sessionId }, dbobject);
                setcopyid.query(function (result) {
                    console.log("set copyId to: ", result);
                });
                fillinCopy(file.id, fields, function (copyId) {
                    //  return the PDF to the extension to be attached to the email
                    exportFileIdToPdf(copyId, function (fileLocation) {
                        var dbobject = new DbObject();
                        dbobject.properties = { id: sessionId, pdfPath: fileLocation };
                        dbobject.id = sessionId;

                        var setpdfpath = new GetAndSet('session', { id: sessionId }, dbobject);
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

module.exports = router;
