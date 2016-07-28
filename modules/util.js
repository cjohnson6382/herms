var genuuid = function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + '-' + s4() + s4() + s4();
};

var getContracts = function (oauth2client, callback) {
    var service = google.drive('v3');
    service.files.list({
        auth: oauth2client,
        pageSize: 10,
        fields: "nextPageToken, files(id, name)",
        q: "properties has { key='hermesis_config' and value='true'} "
    }, function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var files = response.files;
        if (files.length === 0) {
            console.log('No files found.');
        }
        else {
            callback(response.files);
        }
    });
};

//  fill these with the functions below
var driveUtil = {
    getTempFolder: function (callback) {
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
    },
    createTempFolder: function (callback) {
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
    },
    exportFileToPdf: function (id, callback) {
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
};

module.exports = {
    genuuid: genuuid,
    driveUtil: driveUtil
};
