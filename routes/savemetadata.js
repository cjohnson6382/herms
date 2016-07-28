//      var io = require('/modules/io.js');
//      var socketpool = io.socketpool;

//  if you change from post to get, need to change the script on google docs too!!
//      should probably just use GET so I don't need the urlencodedParser
app.post('/savemetadata', urlencodedParser, function (req, res) {
    var service = google.drive('v3');
    var JSONlocation;
    var lastmodified;


    var data = prepareData(
        JSON.parse(req.body.metadataitems), 
        req.body.docid, 
        req.body.parentname
    );

    service.files.create({
        auth: oauth2Client,
        resource: data.metadata,
        media: data.media,
        uploadType: 'multipart',
        fields: 'id, modifiedByMeTime, parents, name, fileExtension'
    }, updateJson);

    var prepareData = function (fields, docid, parentname) {
      var body = JSON.stringify({parentid: docid, fields: fields, name: parentname});
      var timestamp = new Date();
      var filename = docid + " -- hermesis template -- " + parentname + ' ' + timestamp.toString() + ".json";

      var metadata = {
        name: filename,
        properties: {
          hermesis_config: true,
        }
      };

      var media = {
          mimeType: 'application/json',
          body: body
      };

      return { metadata: metadata, media: media };
    };

    var updateJson = function (err, file) {
      if (err) {
        console.log('error creating JSON for file| file: ', docid, " err: ", err);
      } else {
        var metadata = {
           properties: {
               fields: file.id,
               jsonlastedit: file.modifiedByMeTime,
               hermesis_template: true
           }
        };

        service.files.update({
           auth: oauth2Client,
           resource: metadata,
           fileId: docid
        }, pushToClient);
      }
    };

    var pushToClient = function (err, file) {
      if (err) {
         console.log("error updating metadata", err);
      } else {
        //  request all contracts
        //  callback: socketpool[file.id].emit('contractlist', { contracts: contracts });

        //  why am I res.end? this is called by the google drive/docs script; so a response is pointless?
        res.end(file.id);
    }
});
