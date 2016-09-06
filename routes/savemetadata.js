var express = require('express');
var router = express.Router();
var google = require('googleapis');
var service = google.drive('v3');

var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var oauthProvider = require('../modules/oauthProvider.js');
var scriptauth = require('../modules/scriptapiauth.js');

//      var io = require('/modules/io.js');
//      var socketpool = io.socketpool;

router.use(urlencodedParser);
router.use(scriptauth);
router.use(oauthProvider);

router.post('/', function (req, res) {

    console.log('in savemetadata: ', req.session);

    var resource = {
        name: req.body.id + 
            " -- hermesis template -- " + 
            req.body.name + 
            " " + 
            new Date().toString() + 
            ".json",
        properties: { hermesis_config: true }
    };

    var media = {
        mimeType: 'application/json',
        body: JSON.stringify({ 
            id: req.body.id, 
            fields: JSON.parse(req.body.fields), 
            name: req.body.name 
        })
    }

    service.files.create({
        auth: req.oauth2Client,
        resource: resource,
        media: media,
        uploadType: 'multipart',
        fields: 'id, modifiedByMeTime, parents, name, fileExtension'
    }, pushToClient);

    var pushToClient = function (err, file) {
      if (err) {
        console.log('error creating JSON for file| file: ', req.body.id, " err: ", err);
        res.json({
            type: 'error', 
            resp: err
        });
      } else {
        console.log('this is where the socket.io code executes: ', file.name, ' ', file.id);
        res.json({ 
            type: 'success', 
            resp: 'template saved to gdrive' 
        });
      }
    };

/*
    var pushToClient = function (err, file) {
      if (err) {
         console.log("error updating metadata", err);
      } else {
        //  request all contracts
        //  callback: socketpool[file.id].emit('contractlist', { contracts: contracts });

        //  why am I res.end? this is called by the google drive/docs script; so a response is pointless?
        res.end(file.id);
    }
*/

});

module.exports = router;
