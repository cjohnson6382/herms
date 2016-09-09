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
		var splitFields = function (fields) {
      if (fields.length < 110) { return [fields] }
      
      var fieldStrings = [], i;
      
      while (i < fieldlength) {
        fieldStrings.push(fields.substring(i, i + 110));
        i += 110;
      }
      return fieldStrings;
    };

    var makeProperties = function (fieldArray) {
      if (fieldArray.length > 10) { throw new Error('Too many fields or fields too long') }
      var properties = {}, i;
      //	properties.properties = {};
      
      for (i = 0; i < 10; i++) {
        properties['field' + i] = null;
      }
      
      for (i = 0; i < fieldArray.length; i++) {
        properties['field' + i] = fieldArray[i];
      }
      
      return properties;
    };
    
    //	console.log('in savemetadata', req.body);

    //  var fields = JSON.parse(req.body.fields);
    var properties = makeProperties(splitFields(req.body.fields));
    properties.hermesis_template = true;
   
		console.log('savemetadata, properties object (should have null "fields" properties): ', properties);
 
    service.files.update({
      auth: req.oauth2Client,
      fileId: req.body.id,
      uploadType: 'multipart',
      resource: {
        properties: properties
      }
    }, function (err, resp) {
			if (err) {
				console.log('error making savemetadata call: ', err);
			} else {
      	console.log('saveMetadata call succeeded', resp);
			}
    });

    var pushToClient = function (err, file) {
      if (err) {
        console.log('error adding metadata to file: ', req.body.id, " err: ", err);
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
