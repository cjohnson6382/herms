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
	const tempfilename = 'temp/' + id.response.result + ' - ' + Date.now() + '.pdf';
	const dest = fs.createWriteStream(tempfilename);

	const options = {
		auth: auth,
		fileId: id.response.result,
		mimeType: 'application/pdf'
	};

	return new Promise(function (resolve, reject) {
		service.files.export(options)
			.on('end', function () {
				resolve({ filepath: tempfilename, filename: templateName + '.pdf' });
			})
			.on('error', function (err) {
				console.log('error exporting pdf: ', err);
			})
			.pipe(dest);
	});
};

router.use(urlencodedParser);
router.use(oauthProvider);
router.post('/', function (req, res) {
	auth = req.oauth2Client;
	fields = JSON.parse(req.body.fields);
	templateName = req.body.name;

	copy(req.body.id)
		.then(modify, function (err) { console.log('error copying: ', err) })
		.then(download, function (err) { console.log('error modifying: ', err) })
		.then(function (resp) {

			console.log('getfilledtemplate main: ', resp);
			res.send('all clear, response sent');
			/*
			res.download(resp.filepath, resp.filename, function (err) {
				if (err) {
					console.log('error downloading the pdf: ', err);
				} else {
					console.log('pdf download successful: ', res.headersSent);
				}
			});
			*/;
		}); 

});

module.exports = router;
