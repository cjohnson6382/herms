app.get('/listfiles', function (req, res) {
    var service = google.drive('v3');
    service.files.list({
        auth: oauth2Client,
        pageSize: 10,
        //  these are the correct fields to search for; the call gets actual FILES
            //  that have the contract information in them
        fields: "nextPageToken, files(id, name)",
        q: "properties has { key='hermesis_config' and value='true'} "
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
            //  the things I need for listfiles
            //  are in the body of the JSON file: parentname, specifically
            res.send(response.files);
        }
    });
});
