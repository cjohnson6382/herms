var express = require('express');
var router = express.Router();
var google = require('googleapis');
var fs = require('fs');
var service = google.drive('v3');
var script = google.script('v1');

var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });

var oauthProvider = require('../modules/oauthProvider.js');

//	https://docs.google.com/document/d/1x4KdCnFp3BXNlBGS5iW9PxlUu83IMAJM6hlFaKFB9OQ
const API_SCRIPT_EXECUTION_PROJECT_ID = 'McF6XuivFGhAnZMdFBaeECc74iDy0iCRV';

let templateName = '';
let auth = '';
let fields = '';
let response = '';


//	temporarily hard-coded to my drive's temp folder
const folderId = '0B-rYFXaeLeuQYUF0NDNnWk02N3M'; //	this needs to be a user-global folderId

const copy = function (id) {
	const tempfileTitle = 'temp ' + new Date() + " " + id;
	const options = {
		auth: auth,
		fileId: id,
		fields: 'id',
		resource: {
			name: tempfileTitle,
			decription: 'archived copy of contract created by Hermesis',
			parents: [ folderId ]
		}
	};

	//	response.end('testing');
	
	return new Promise(function (resolve, reject) {
		service.files.copy(options, function (err, file) { 
			if (err) { reject(err) } else { resolve(file) } 
		});
	});
};


const modify = function (file) {
	const options = {
		auth: auth,
		scriptId: API_SCRIPT_EXECUTION_PROJECT_ID,
		resource: {
			function: 'getDocument',
			parameters: [file.id, fields]
		}
	};

	return new Promise(function (resolve, reject) {
		script.scripts.run(options, function (err, id) {
			if (err) { reject(err) } else { resolve(id) }
		});
	})
};

const download = function (id) {
	const options = {
		auth: auth,
		fileId: id.response.result,
		mimeType: 'application/pdf'
		//	mimeType: 'text/plain'
	};

	service.files.export(options)
		.on('end', function () { console.log('file sent to client') })
		.on('error', function (err) { console.log('error exporting file from drive', err) })
		.pipe(response);
};

router.use(urlencodedParser);
router.use(oauthProvider);

router.post('/', function (req, res) {
	auth = req.oauth2Client;
	fields = JSON.parse(req.body.fields);
	templateName = req.body.name;
	response = res;

	copy(req.body.id)
		.then(modify, function (err) { console.log('error copying: ', err) })
		.then(download, function (err) { console.log('error modifying: ', err) });
});

module.exports = router;
